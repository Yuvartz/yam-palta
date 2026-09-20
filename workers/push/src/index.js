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

// ---------- forecast (single best_match model — same inputs the sender always used) ----------
async function fetchForecast(lat, lon) {
  const common = `latitude=${lat}&longitude=${lon}&timezone=Asia%2FJerusalem&forecast_days=3&past_days=1`;
  const [m, w] = await Promise.all([
    fetch(`https://marine-api.open-meteo.com/v1/marine?${common}&hourly=wave_height,wind_wave_height,sea_surface_temperature`, { cf: { cacheTtl: 600 } }),
    fetch(`https://api.open-meteo.com/v1/forecast?${common}&hourly=wind_speed_10m`, { cf: { cacheTtl: 600 } }),
  ]);
  if (!m.ok || !w.ok) throw new Error(`open-meteo ${m.status}/${w.status}`);
  const [mj, wj] = await Promise.all([m.json(), w.json()]);
  if (!mj.hourly || !wj.hourly) throw new Error("open-meteo payload malformed");
  const wIdx = new Map(wj.hourly.time.map((t, i) => [t, i]));
  return mj.hourly.time.map((t, i) => { const j = wIdx.get(t); return {
    time: t, waveHeight: mj.hourly.wave_height?.[i] ?? null, windWave: mj.hourly.wind_wave_height?.[i] ?? null,
    seaTemp: mj.hourly.sea_surface_temperature?.[i] ?? null, windKmh: j != null ? wj.hourly.wind_speed_10m?.[j] ?? null : null }; });
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
  if (url.pathname === "/health") {
    const list = await env.SUBS.list({ prefix: "sub:", limit: 1000 });
    return json({ ok: true, subscribers: list.keys.length, configured: !!(env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) }, 200, headers);
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
}

export default {
  fetch: (req, env) => handleFetch(req, env),
  scheduled: (event, env, ctx) => ctx.waitUntil(runScheduled(env, ctx)),
};
