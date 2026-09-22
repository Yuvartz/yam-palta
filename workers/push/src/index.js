// Yam Plata push backend (Cloudflare Worker).
//   fetch:     POST /subscribe   { subscription, beach:{key,name,lat,lon} }  → 200 {ok, id}
//              POST /unsubscribe { endpoint }                                → 200 {ok}
//              POST /test        { endpoint }                                → sends a real push now
//              POST /rotate      { oldEndpoint, subscription }               → SW pushsubscriptionchange
//              GET  /health                                                  → {ok, subscribers}
//   scheduled: every 15 min — group subscribers by beach, fetch one forecast per beach,
//              run policy.decide(), send Web Push, drop 404/410 endpoints, persist state.
// Storage: KV key `sub:<sha256(endpoint)>` → { sub, beach, state, createdAt, updatedAt }.
// Secrets: VAPID_PRIVATE_KEY, VAPID_SUBJECT. Vars: VAPID_PUBLIC_KEY, APP_URL, ALLOWED_ORIGINS.

import { buildPushPayload } from "@block65/webcrypto-web-push";
import PalataMod from "../../../docs/palata.js";   // UMD; the bundler exposes module.exports as the default
import { decide, israelParts, scoreHours, stateSignature } from "./policy.js";

const Palata = PalataMod && PalataMod.scoreOf ? PalataMod : globalThis.Palata;   // shared scoring + copy
if (!Palata || !Palata.scoreOf) throw new Error("palata.js did not load");
const FORECAST_TTL_MS = 10 * 60 * 1000;

// ---------- helpers ----------
async function sha256(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const keyFor = async endpoint => "sub:" + (await sha256(endpoint));
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });

// Map shorteners and map hosts we are willing to follow, at every hop of the redirect chain.
function mapsHostOk(u) {
  return u.protocol === "https:" && !u.username && !u.password && !u.port
    && /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.com|www\.google\.com|google\.com|maps\.apple\.com|waze\.com|www\.waze\.com|ul\.waze\.com)$/.test(u.hostname);
}
function cors(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return { ok, headers: ok ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", "vary": "Origin" } : {} };
}
// A push endpoint must belong to a real browser push service: otherwise anyone could register an endpoint
// they control and make this Worker POST to it (outbound-request abuse). Keep this list tight.
function pushEndpoint(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  let u; try { u = new URL(value); } catch (e) { return null; }
  const h = u.hostname;
  const allowed = h === "fcm.googleapis.com" || h === "updates.push.services.mozilla.com"
    || h.endsWith(".push.apple.com") || h.endsWith(".notify.windows.com") || h.endsWith(".push.services.mozilla.com");
  if (u.protocol !== "https:" || !allowed || u.username || u.password || u.port || u.hash) return null;
  return u;
}
// base64url → bytes, with the exact length the Web Push spec requires (auth 16, p256dh 65 uncompressed point).
function decodeKey(value, bytes) {
  if (typeof value !== "string" || value.length > 200 || !/^[A-Za-z0-9_-]+=*$/.test(value)) return null;
  try {
    const t = value.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    const out = Uint8Array.from(atob(t + "=".repeat((4 - t.length % 4) % 4)), c => c.charCodeAt(0));
    return out.length === bytes ? out : null;
  } catch (e) { return null; }
}
async function validSub(s) {
  if (!s || !pushEndpoint(s.endpoint) || !s.keys) return false;
  const auth = decodeKey(s.keys.auth, 16), pub = decodeKey(s.keys.p256dh, 65);
  if (!auth || !pub || pub[0] !== 4) return false;
  // The right length and a 0x04 prefix do not make a point that is actually on the curve — let WebCrypto decide.
  try { await crypto.subtle.importKey("raw", pub, { name: "ECDH", namedCurve: "P-256" }, false, []); return true; }
  catch (e) { return false; }
}
// Proof of ownership for management actions: the caller must know the subscription's own `auth` secret, which
// only the browser that created it has. The compare has no early exit; JS/JIT cannot promise true constant time,
// and this guards a 16-byte secret against endpoint leakage rather than against timing attacks.
function sameAuth(a, b) {
  const x = decodeKey(a, 16), y = decodeKey(b, 16);
  if (!x || !y) return false;
  let diff = 0; for (let i = 0; i < 16; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
const validBeach = b => b && typeof b.key === "string" && b.key.length <= 40 && typeof b.name === "string" && b.name.length <= 60
  && Number.isFinite(b.lat) && Number.isFinite(b.lon) && Math.abs(b.lat) <= 90 && Math.abs(b.lon) <= 180;

async function sendPush(env, sub, payload) {
  if (!(await validSub(sub))) throw new Error("invalid subscription");   // also guards records already in KV
  const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  const init = await buildPushPayload({ data: JSON.stringify(payload), options: { ttl: 3600, urgency: "high", topic: (payload.tag || "yp").slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "") } }, sub, vapid);
  // A push service must answer directly. Workers only supports redirect follow|manual, so take manual and
  // treat any 3xx as a failure rather than letting our request be sent somewhere else.
  const res = await fetch(sub.endpoint, { ...init, redirect: "manual", signal: AbortSignal.timeout(8000) });
  if (res.status >= 300 && res.status < 400) throw new Error(`push endpoint redirected (${res.status})`);
  return res.status;   // 201 accepted; 404/410 gone
}

// ---------- forecast: the SHARED recipe (Palata.recipeUrls/blendHourly) → same model medians as the app ----------
async function fetchForecast(lat, lon) {
  const u = Palata.recipeUrls(lat, lon, { forecastDays: 3, pastDays: 1 });
  const [m, w] = await Promise.all([fetch(u.marine, { cf: { cacheTtl: 600 } }), fetch(u.weather, { cf: { cacheTtl: 600 } })]);
  if (!m.ok || !w.ok) throw new Error(`open-meteo ${m.status}/${w.status}`);
  const [mj, wj] = await Promise.all([m.json(), w.json()]);
  return Palata.blendHourly(mj, wj).hours;
}

// ---------- ISRAMAR buoys: GET /buoy?lat&lon → nearest fresh station (15-min edge cache; the GitHub mirror lags hours) ----------
const BUOYS = [
  { id: "hadera", name: "מצוף חדרה", lat: 32.470, lon: 34.880, reachKm: 60, openCoast: true, src: "https://isramar.ocean.org.il/isramar2009/station/data/Hadera_Hs_Per.json", page: "https://isramar.ocean.org.il/isramar2009/station/HaderaRDI.aspx" },
  { id: "shikmona", name: "מצוף שקמונה (חיפה)", lat: 32.830, lon: 34.950, reachKm: 25, openCoast: false, src: "https://isramar.ocean.org.il/isramar2009/station/data/ShikBuoy_HS_Per.json", page: "https://isramar.ocean.org.il/isramar2009/station/shikmonaBuoyM.aspx" },
];
const haversine = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180, x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const pickParam = (params, name) => { const p = (params || []).find(x => x.name === name); const v = p && Array.isArray(p.values) ? Number(p.values[0]) : NaN; return Number.isFinite(v) && v >= 0 && v < 30 ? v : null; };
const isoOf = dt => { const m = /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/.exec(dt || ""); return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00Z` : null; };
async function readBuoy(st) {
  const r = await fetch(st.src, { cf: { cacheTtl: 900, cacheEverything: true }, headers: { "user-agent": "YamPlata/1.0 (+https://yamplata.com)" }, redirect: "manual", signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;   // a 3xx is not ok either, so a redirected station feed is simply skipped
  const raw = await r.json().catch(() => null); if (!raw) return null;
  const measured = { waveHeight: pickParam(raw.parameters, "Significant wave height"), wavePeriod: pickParam(raw.parameters, "Peak wave period"), waveMax: pickParam(raw.parameters, "Maximal wave height"), measuredAt: isoOf(raw.datetime) };
  if (measured.waveHeight == null || !measured.measuredAt) return null;
  return { updated: new Date().toISOString(), source: `ISRAMAR — ${st.name}`, sourceUrl: st.page, station: { name: st.name, lat: st.lat, lon: st.lon, reachKm: st.reachKm, openCoast: st.openCoast }, measured };
}
async function nearestBuoy(lat, lon, maxAgeH = 9) {
  const cands = BUOYS.map(st => ({ st, d: haversine(lat, lon, st.lat, st.lon) })).filter(c => c.d <= c.st.reachKm).sort((a, b) => a.d - b.d);
  for (const c of cands) {
    const b = await readBuoy(c.st).catch(() => null);
    if (b && (Date.now() - Date.parse(b.measured.measuredAt)) / 36e5 <= maxAgeH) return { ...b, distanceKm: Math.round(c.d) };
  }
  return null;
}

// Read at most `max` BYTES and parse JSON. Stops pulling as soon as the limit is passed, so an attacker
// cannot make us buffer a large body before we reject it.
async function readJsonLimited(req, max = 4096) {
  if (!req.body) return { error: 400 };
  const reader = req.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); return { error: 413 }; }
      chunks.push(value);
    }
  } catch (e) { return { error: 400 }; }
  finally { try { reader.releaseLock(); } catch (e) {} }
  const buf = new Uint8Array(size); let at = 0;
  for (const c of chunks) { buf.set(c, at); at += c.byteLength; }
  try {
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buf));
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: 400 };
    return { body };
  } catch (e) { return { error: 400 }; }
}

// ---------- API ----------
async function handleFetch(req, env) {
  const url = new URL(req.url), { ok: originOk, headers } = cors(req, env);
  if (req.method === "OPTIONS") return new Response(null, { status: originOk ? 204 : 403, headers });
  // Rate-limit everything that costs a KV operation or an outbound request — GET routes included, since
  // /expand, /buoy and /health were reachable before any limit. A limiter that errors fails CLOSED.
  const clientIp = req.headers.get("CF-Connecting-IP") || "unknown";
  async function limited(binding, key) {
    if (!binding || typeof binding.limit !== "function") return false;   // binding not configured (local dev)
    try { return !(await binding.limit({ key })).success; }
    catch (e) { console.warn("rate limiter error → refusing", e && e.message); return true; }
  }
  if (req.method === "GET" && /^\/(expand|buoy|health)$/.test(url.pathname)) {
    if (await limited(env.WRITE_LIMIT, `${clientIp}:get`)) return json({ error: "rate limited" }, 429, { ...headers, "retry-after": "60" });
  }
  // GET /expand?u=<short maps link> → { url } after following redirects. Browsers cannot expand
  // maps.app.goo.gl links themselves (no CORS), and that is what the Google Maps app shares.
  if (url.pathname === "/expand" && req.method === "GET") {
    if (!originOk) return json({ error: "origin not allowed" }, 403);
    let target; try { target = new URL(url.searchParams.get("u") || ""); } catch (e) { return json({ error: "bad url" }, 400, headers); }
    if (!mapsHostOk(target)) return json({ error: "host not allowed" }, 400, headers);
    let cur = target.toString();
    for (let hop = 0; hop < 6; hop++) {
      const r = await fetch(cur, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; YamPalata/1.0)" }, signal: AbortSignal.timeout(8000) });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) {
        let next; try { next = new URL(loc, cur); } catch (e) { return json({ error: "bad redirect" }, 400, headers); }
        // Every hop is checked, not only the first: a shortener could otherwise walk us to any host.
        if (!mapsHostOk(next)) return json({ error: "redirect target not allowed" }, 400, headers);
        cur = next.toString(); continue;
      }
      break;
    }
    return json({ url: cur }, 200, headers);
  }
  if (url.pathname === "/buoy" && req.method === "GET") {
    const latRaw = url.searchParams.get("lat"), lonRaw = url.searchParams.get("lon");
    const lat = Number(latRaw), lon = Number(lonRaw);
    if (latRaw === null || lonRaw === null || latRaw === "" || lonRaw === "" || !Number.isFinite(lat) || !Number.isFinite(lon)
      || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json({ error: "bad coords" }, 400, headers);
    const b = await nearestBuoy(lat, lon);
    return b ? json(b, 200, { ...headers, "cache-control": "public, max-age=300" }) : json({ error: "no fresh buoy in reach" }, 404, headers);
  }
  if (url.pathname === "/health") {
    if (req.method !== "GET") return json({ error: "method" }, 405, headers);
    // Counts only. Beach names are NOT published here: a subscriber can type any name they like when they
    // add a custom beach, so the per-beach breakdown is personal data, not a safe public aggregate.
    const list = await env.SUBS.list({ prefix: "sub:", limit: 1000 });
    const c = await env.SUBS.get("meta:cron", "json");
    const lastCron = c ? { at: c.at, day: c.day, subscribers: c.subscribers, beaches: c.beaches, sent: c.sent, dropped: c.dropped, errors: c.errors, sentToday: c.sentToday } : null;
    return json({ ok: true, subscribers: list.keys.length, beaches: (c && c.beaches) || 0, lastCron, configured: !!(env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) }, 200, { ...headers, "cache-control": "no-store" });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405, headers);
  if (!originOk) return json({ error: "origin not allowed" }, 403);
  if (await limited(env.WRITE_LIMIT, clientIp)) return json({ error: "rate limited" }, 429, { ...headers, "retry-after": "60" });
  if (Number(req.headers.get("content-length") || 0) > 4096) return json({ error: "payload too large" }, 413, headers);
  const parsed = await readJsonLimited(req);
  if (parsed.error) return json({ error: parsed.error === 413 ? "payload too large" : "bad json" }, parsed.error, headers);
  const body = parsed.body;

  if (url.pathname === "/subscribe") {
    const { subscription: sub, beach } = body;
    if (!(await validSub(sub))) return json({ error: "bad subscription" }, 400, headers);
    if (!validBeach(beach)) return json({ error: "bad beach" }, 400, headers);
    const k = await keyFor(sub.endpoint), now = new Date().toISOString();
    const prev = await env.SUBS.get(k, "json");
    // Re-registering an endpoint is fine, but only from the browser that owns it (same auth + p256dh).
    if (prev && prev.sub && (!sameAuth(sub.keys.auth, prev.sub.keys && prev.sub.keys.auth) || sub.keys.p256dh !== (prev.sub.keys && prev.sub.keys.p256dh)))
      return json({ error: "forbidden" }, 403, headers);
    const rec = { sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, beach: { key: beach.key, name: beach.name, lat: +beach.lat, lon: +beach.lon },
      state: prev && prev.beach && prev.beach.key === beach.key ? prev.state : { lastCalm: false, lastScore: null, sent: [] },   // new beach → fresh transition state
      createdAt: prev ? prev.createdAt : now, updatedAt: now };
    await env.SUBS.put(k, JSON.stringify(rec));
    return json({ ok: true, id: k.slice(4, 16), beach: rec.beach.key }, 200, headers);
  }
  if (url.pathname === "/unsubscribe") {
    if (!pushEndpoint(body.endpoint)) return json({ error: "bad endpoint" }, 400, headers);
    const k = await keyFor(body.endpoint), rec = await env.SUBS.get(k, "json");
    if (!rec) return json({ ok: true }, 200, headers);   // already gone: idempotent, reveals nothing
    if (!sameAuth(body.auth, rec.sub && rec.sub.keys && rec.sub.keys.auth)) return json({ error: "forbidden" }, 403, headers);
    await env.SUBS.delete(k);
    return json({ ok: true }, 200, headers);
  }
  if (url.pathname === "/rotate") {
    const { oldEndpoint, subscription: sub } = body;
    if (!(await validSub(sub)) || !pushEndpoint(oldEndpoint)) return json({ error: "bad rotate" }, 400, headers);
    const oldK = await keyFor(oldEndpoint), prev = await env.SUBS.get(oldK, "json");
    if (!prev) return json({ ok: false, error: "unknown old endpoint" }, 404, headers);
    if (!sameAuth(body.oldAuth, prev.sub && prev.sub.keys && prev.sub.keys.auth)) return json({ error: "forbidden" }, 403, headers);
    const newK = await keyFor(sub.endpoint);
    const occupied = newK === oldK ? prev : await env.SUBS.get(newK, "json");
    if (occupied && occupied !== prev && (!sameAuth(sub.keys.auth, occupied.sub && occupied.sub.keys && occupied.sub.keys.auth) || sub.keys.p256dh !== (occupied.sub && occupied.sub.keys && occupied.sub.keys.p256dh)))
      return json({ error: "conflict" }, 409, headers);
    prev.sub = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }; prev.updatedAt = new Date().toISOString();
    await env.SUBS.put(newK, JSON.stringify(prev));
    if (newK !== oldK) await env.SUBS.delete(oldK);   // same endpoint → don't delete what we just wrote
    return json({ ok: true }, 200, headers);
  }
  if (url.pathname === "/test") {
    if (!pushEndpoint(body.endpoint)) return json({ error: "bad endpoint" }, 400, headers);
    if (!env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ ok: false, error: "server not configured (VAPID secrets missing)" }, 503, headers);
    const rec = await env.SUBS.get(await keyFor(body.endpoint), "json");
    if (!rec) return json({ ok: false, error: "not subscribed" }, 404, headers);
    // Knowing an endpoint is not enough to make us push to it: prove you are the browser that registered it.
    if (!sameAuth(body.auth, rec.sub && rec.sub.keys && rec.sub.keys.auth)) return json({ error: "forbidden" }, 403, headers);
    // Per-IP is not enough for /test (it sends a real push): limit the subscription itself too.
    const sk = await keyFor(body.endpoint);
    if (await limited(env.TEST_LIMIT, `${clientIp}:test`) || await limited(env.TEST_LIMIT, `sub:${sk}`))
      return json({ error: "rate limited" }, 429, { ...headers, "retry-after": "60" });
    let status;
    const c = Palata.notifyCopy(false, rec.beach.name, null, null, 85);
    try { status = await sendPush(env, rec.sub, { title: "🔔 בדיקה · " + c.title, body: "זו התראת בדיקה מהשרת — אם קיבלת אותה, ההתראות האמיתיות יגיעו גם כשהאפליקציה סגורה.", tag: "yp-test", url: `${env.APP_URL}?b=${encodeURIComponent(rec.beach.key)}` });
    } catch (e) { console.warn("test push failed", e && e.message); return json({ ok: false, error: String(e && e.message || e).slice(0, 200) }, 502, headers); }
    return json({ ok: status >= 200 && status < 300, status }, 200, headers);
  }
  return json({ error: "not found" }, 404, headers);
}

// ---------- cron ----------
async function runScheduled(env, ctx) {
  const now = israelParts();
  const list = await env.SUBS.list({ prefix: "sub:", limit: 1000 });
  const forecasts = new Map();   // "lat,lon" → scored hours (one Open-Meteo call per beach)
  let sent = 0, dropped = 0, errors = 0;
  for (const { name: k } of list.keys) {
    if (k === "meta:cron") continue;
    const rec = await env.SUBS.get(k, "json"); if (!rec || !rec.sub || !rec.beach) continue;
    const fkey = `${rec.beach.lat.toFixed(2)},${rec.beach.lon.toFixed(2)}`;
    try {
      if (!forecasts.has(fkey)) forecasts.set(fkey, scoreHours(await fetchForecast(rec.beach.lat, rec.beach.lon), Palata));
      const { events, state } = decide({ scored: forecasts.get(fkey), now, state: rec.state || {}, beach: rec.beach, Palata, appUrl: env.APP_URL });
      let gone = false;
      for (const e of events) {
        const status = await sendPush(env, rec.sub, { title: e.title, body: e.body, tag: e.tag, url: e.url });
        if (status === 404 || status === 410) { gone = true; break; }
        if (status >= 200 && status < 300) sent++; else { errors++; console.warn("push status", status, rec.beach.key, e.type); }
      }
      if (gone) { await env.SUBS.delete(k); dropped++; continue; }
      // Write only when the part of the state that decide() actually reads has changed. Comparing the whole
      // object would always differ (it carries a lastSeen timestamp), which is what blew the KV write quota:
      // 96 cron runs/day × every subscriber against a 1000 writes/day free tier.
      if (stateSignature(rec.state, Palata) !== stateSignature(state, Palata)) {
        rec.state = state; rec.updatedAt = new Date().toISOString();
        await env.SUBS.put(k, JSON.stringify(rec));
      }
    } catch (err) { errors++; console.warn("subscriber failed", rec.beach && rec.beach.key, err && err.message); }
  }
  console.log(`cron ${now.dateStr} ${now.hour}:${String(now.minute).padStart(2, "0")} subs=${list.keys.length} beaches=${forecasts.size} sent=${sent} dropped=${dropped} errors=${errors}`);
  // Run metadata for the owner's control panel (/health): when the cron last ran and what it did. Aggregates only.
  try {
    const prev = (await env.SUBS.get("meta:cron", "json")) || {};
    const day = now.dateStr, sentToday = (prev.day === day ? (prev.sentToday || 0) : 0) + sent;
    await env.SUBS.put("meta:cron", JSON.stringify({ at: new Date().toISOString(), day, subscribers: list.keys.length, beaches: forecasts.size, sent, dropped, errors, sentToday }));
  } catch (e) { console.warn("meta:cron write failed", e && e.message); }
}

export default {
  fetch: (req, env) => handleFetch(req, env),
  scheduled: (event, env, ctx) => ctx.waitUntil(runScheduled(env, ctx)),
};
