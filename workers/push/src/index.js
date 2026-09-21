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
import { decide, israelParts, scoreHours } from "./policy.js";

const Palata = PalataMod && PalataMod.scoreOf ? PalataMod : globalThis.Palata;   // shared scoring + copy
if (!Palata || !Palata.scoreOf) throw new Error("palata.js did not load");
const FORECAST_TTL_MS = 10 * 60 * 1000;

// ---------- helpers ----------
async function sha256(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const keyFor = async endpoint => "sub:" + (await sha256(endpoint));
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });

function cors(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return { ok, headers: ok ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", "vary": "Origin" } : {} };
}
const validSub = s => s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string";
const validBeach = b => b && typeof b.key === "string" && b.key.length <= 40 && typeof b.name === "string" && b.name.length <= 60
  && Number.isFinite(b.lat) && Number.isFinite(b.lon) && Math.abs(b.lat) <= 90 && Math.abs(b.lon) <= 180;

async function sendPush(env, sub, payload) {
  const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  const init = await buildPushPayload({ data: JSON.stringify(payload), options: { ttl: 3600, urgency: "high", topic: (payload.tag || "yp").slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "") } }, sub, vapid);
  const res = await fetch(sub.endpoint, init);
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
  const r = await fetch(st.src, { cf: { cacheTtl: 900, cacheEverything: true }, headers: { "user-agent": "YamPlata/1.0 (+https://yamplata.com)" } });
  if (!r.ok) return null;
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

// ---------- API ----------
async function handleFetch(req, env) {
  const url = new URL(req.url), { ok: originOk, headers } = cors(req, env);
  if (req.method === "OPTIONS") return new Response(null, { status: originOk ? 204 : 403, headers });
  // GET /expand?u=<short maps link> → { url } after following redirects. Browsers cannot expand
  // maps.app.goo.gl links themselves (no CORS), and that is what the Google Maps app shares.
  if (url.pathname === "/expand" && req.method === "GET") {
    if (!originOk) return json({ error: "origin not allowed" }, 403);
    let target; try { target = new URL(url.searchParams.get("u") || ""); } catch (e) { return json({ error: "bad url" }, 400, headers); }
    const okHost = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.com|www\.google\.com|google\.com|maps\.apple\.com|waze\.com|www\.waze\.com|ul\.waze\.com)$/.test(target.hostname);
    if (target.protocol !== "https:" || !okHost) return json({ error: "host not allowed" }, 400, headers);
    let cur = target.toString();
    for (let hop = 0; hop < 6; hop++) {
      const r = await fetch(cur, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; YamPalata/1.0)" } });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, cur).toString(); continue; }
      break;
    }
    return json({ url: cur }, 200, headers);
  }
  if (url.pathname === "/buoy" && req.method === "GET") {
    const lat = Number(url.searchParams.get("lat")), lon = Number(url.searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json({ error: "bad coords" }, 400, headers);
    const b = await nearestBuoy(lat, lon);
    return b ? json(b, 200, { ...headers, "cache-control": "public, max-age=300" }) : json({ error: "no fresh buoy in reach" }, 404, headers);
  }
  if (url.pathname === "/health") {
    const list = await env.SUBS.list({ prefix: "sub:", limit: 1000 });
    // Aggregates only (no endpoints, no keys): subscribers per beach name + last cron run, for the owner's panel.
    const byBeach = {};
    for (const { name: k } of list.keys.slice(0, 300)) { const rec = await env.SUBS.get(k, "json"); const n = rec && rec.beach && rec.beach.name; if (n) byBeach[n] = (byBeach[n] || 0) + 1; }
    const lastCron = await env.SUBS.get("meta:cron", "json");
    return json({ ok: true, subscribers: list.keys.length, byBeach, lastCron, configured: !!(env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) }, 200, { ...headers, "cache-control": "no-store" });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405, headers);
  if (!originOk) return json({ error: "origin not allowed" }, 403);
  let body; try { body = await req.json(); } catch (e) { return json({ error: "bad json" }, 400, headers); }

  if (url.pathname === "/subscribe") {
    const { subscription: sub, beach } = body;
    if (!validSub(sub)) return json({ error: "bad subscription" }, 400, headers);
    if (!validBeach(beach)) return json({ error: "bad beach" }, 400, headers);
    const k = await keyFor(sub.endpoint), now = new Date().toISOString();
    const prev = await env.SUBS.get(k, "json");
    const rec = { sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, beach: { key: beach.key, name: beach.name, lat: +beach.lat, lon: +beach.lon },
      state: prev && prev.beach && prev.beach.key === beach.key ? prev.state : { lastCalm: false, lastScore: null, sent: [] },   // new beach → fresh transition state
      createdAt: prev ? prev.createdAt : now, updatedAt: now };
    await env.SUBS.put(k, JSON.stringify(rec));
    return json({ ok: true, id: k.slice(4, 16), beach: rec.beach.key }, 200, headers);
  }
  if (url.pathname === "/unsubscribe") {
    if (typeof body.endpoint !== "string") return json({ error: "bad endpoint" }, 400, headers);
    await env.SUBS.delete(await keyFor(body.endpoint));
    return json({ ok: true }, 200, headers);
  }
  if (url.pathname === "/rotate") {
    const { oldEndpoint, subscription: sub } = body;
    if (!validSub(sub) || typeof oldEndpoint !== "string") return json({ error: "bad rotate" }, 400, headers);
    const oldK = await keyFor(oldEndpoint), prev = await env.SUBS.get(oldK, "json");
    if (!prev) return json({ ok: false, error: "unknown old endpoint" }, 404, headers);
    prev.sub = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }; prev.updatedAt = new Date().toISOString();
    await env.SUBS.put(await keyFor(sub.endpoint), JSON.stringify(prev)); await env.SUBS.delete(oldK);
    return json({ ok: true }, 200, headers);
  }
  if (url.pathname === "/test") {
    if (typeof body.endpoint !== "string") return json({ error: "bad endpoint" }, 400, headers);
    if (!env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ ok: false, error: "server not configured (VAPID secrets missing)" }, 503, headers);
    const rec = await env.SUBS.get(await keyFor(body.endpoint), "json");
    if (!rec) return json({ ok: false, error: "not subscribed" }, 404, headers);
    const c = Palata.notifyCopy(false, rec.beach.name, null, null, 85);
    const status = await sendPush(env, rec.sub, { title: "🔔 בדיקה · " + c.title, body: "זו התראת בדיקה מהשרת — אם קיבלת אותה, ההתראות האמיתיות יגיעו גם כשהאפליקציה סגורה.", tag: "yp-test", url: `${env.APP_URL}?b=${encodeURIComponent(rec.beach.key)}` });
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
      rec.state = state; rec.updatedAt = new Date().toISOString();
      await env.SUBS.put(k, JSON.stringify(rec));
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
