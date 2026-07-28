// Sends "palata alert" Web Push notifications to subscribers — the locked-phone twin of the
// app's in-page alert. Zero backend: subscriptions live in a Google Sheet (filled by a Google
// Form the app submits to), published as CSV; this script runs hourly from
// .github/workflows/push-notify.yml and pushes via VAPID.
//
// Env (repo secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUBSCRIBERS_CSV_URL
// Exits quietly when any is missing, so the workflow is safe to ship before setup.
//
// Scoring math + notification copy are imported from docs/palata.js — the single shared
// definition the page uses too. Tune there, both channels follow.

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Palata = require("../docs/palata.js");
const { toKnots, notifyCopy, eveningCopy, CALM_MIN, DELUXE_MIN, HISTORY_HOURS } = Palata;

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const CSV_URL = process.env.SUBSCRIBERS_CSV_URL;
const APP_URL = "https://yuvartz.github.io/yam-palta/";

const DAY_START = 6, DAY_END = 19;   // notify only for daytime windows — nobody swims at 03:00

function palataIndex(hours, i) {
  const h = hours[i];
  const wind = toKnots(h.windKmh);
  const histSlice = hours.slice(Math.max(0, i - (HISTORY_HOURS - 1)), i + 1).map(x => x.windKmh).filter(v => v != null);
  const hist = histSlice.length ? toKnots(histSlice.reduce((a, b) => a + b, 0) / histSlice.length) : wind;
  const chop = h.windWave != null ? h.windWave : h.waveHeight;
  return Palata.scoreOf(h.waveHeight, chop, wind, hist);
}

// ---- Helpers ----
function israelNowHour() {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).format(new Date());
  const [d, h] = s.split(" ");
  return { dateStr: d, hour: parseInt(h, 10) };
}
// Minimal CSV parse that survives quoted JSON cells (subscription column contains commas).
function parseCSV(text) {
  const rows = []; let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim().replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

async function fetchHours(lat, lon) {
  const common = `latitude=${lat}&longitude=${lon}&timezone=Asia%2FJerusalem&forecast_days=3&past_days=1`;
  const [marine, weather] = await Promise.all([
    fetch(`https://marine-api.open-meteo.com/v1/marine?${common}&hourly=wave_height,wind_wave_height,sea_surface_temperature`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/forecast?${common}&hourly=wind_speed_10m`).then(r => r.json()),
  ]);
  const wIdx = {}; (weather.hourly?.time || []).forEach((t, i) => { wIdx[t] = i; });
  return (marine.hourly?.time || []).map((t, i) => ({
    time: t, dateStr: t.slice(0, 10), hour: parseInt(t.slice(11, 13), 10),
    waveHeight: marine.hourly.wave_height?.[i] ?? null,
    windWave: marine.hourly.wind_wave_height?.[i] ?? null,
    seaTemp: marine.hourly.sea_surface_temperature?.[i] ?? null,
    windKmh: wIdx[t] != null ? weather.hourly.wind_speed_10m[wIdx[t]] : null,
  }));
}

// Contiguous calm daytime window containing/after hour `fromH` on `dateStr` (start, end hours).
function calmWindow(hours, scores, dateStr, fromH) {
  const idxs = hours.map((h, i) => ({ h, i })).filter(x => x.h.dateStr === dateStr && x.h.hour >= DAY_START && x.h.hour < DAY_END);
  let start = null, end = null;
  for (const { h, i } of idxs) {
    if (h.hour < fromH) continue;
    if (scores[i] >= CALM_MIN) { if (start == null) start = h.hour; end = h.hour; }
    else if (start != null) break;
  }
  return start == null ? null : { start, end };
}

async function main() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !CSV_URL) { console.log("push not configured — skipping."); return; }
  // Imported lazily so the config check above runs even when web-push isn't installed
  // (local dry runs; the workflow installs it just-in-time).
  const { default: webpush } = await import("web-push");
  webpush.setVapidDetails("mailto:yuvalartzi@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

  const csv = await fetch(CSV_URL).then(r => r.text());
  const rows = parseCSV(csv).slice(1);   // drop header
  // Columns (Google Forms order): timestamp, beach, lat, lon, subscription JSON.
  // Latest row per endpoint wins (re-subscribes / beach switches).
  // The form is publicly submittable, so every row is untrusted input: endpoints are
  // restricted to real browser push services, coordinates to the app's region, beach
  // names sanitized (they end up in notification titles), and totals capped so junk rows
  // can't burn Action minutes / API quota.
  const PUSH_HOSTS = ["fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com", "push.apple.com"];
  const validEndpoint = ep => {
    try { const u = new URL(ep); return u.protocol === "https:" && PUSH_HOSTS.some(h => u.hostname === h || u.hostname.endsWith("." + h)); }
    catch (e) { return false; }
  };
  const cleanBeach = s => String(s || "").split("").filter(c => c.charCodeAt(0) >= 32 && !`<>&"'`.includes(c)).join("").trim().slice(0, 40);
  const MAX_SUBS = 500, MAX_GROUPS = 30;
  const byEndpoint = new Map();
  for (const r of rows) {
    if (r.length < 5) continue;
    try {
      const sub = JSON.parse(r[4]);
      if (sub && typeof sub.endpoint === "string" && validEndpoint(sub.endpoint))
        byEndpoint.set(sub.endpoint, { beach: cleanBeach(r[1]), lat: +r[2], lon: +r[3], sub });
    } catch (e) {}
  }
  const subs = [...byEndpoint.values()]
    .filter(s => s.beach && isFinite(s.lat) && isFinite(s.lon) && s.lat > 20 && s.lat < 45 && s.lon > 20 && s.lon < 45)
    .slice(0, MAX_SUBS);
  if (!subs.length) { console.log("no subscribers."); return; }

  const now = israelNowHour();
  // Group subscribers by coordinates — one forecast fetch per beach.
  const beaches = new Map();
  for (const s of subs) { const k = `${s.lat},${s.lon}`; (beaches.get(k) || beaches.set(k, { ...s, list: [] }).get(k)).list.push(s.sub); }
  const groups = [...beaches.values()].slice(0, MAX_GROUPS);   // each group costs 2 API calls — cap the damage junk rows can do

  let sent = 0;
  for (const b of groups) {
    let hours;
    try { hours = await fetchHours(b.lat, b.lon); } catch (e) { console.error(`fetch failed for ${b.beach}`); continue; }
    const scores = hours.map((_, i) => palataIndex(hours, i));
    const nowIdx = hours.findIndex(h => h.dateStr === now.dateStr && h.hour === now.hour);
    if (nowIdx < 0) continue;

    let payload = null;
    const calmNow = scores[nowIdx] >= CALM_MIN;
    const calmPrev = nowIdx > 0 && scores[nowIdx - 1] >= CALM_MIN;
    const daytime = now.hour >= DAY_START && now.hour < DAY_END;

    if (daytime && calmNow && !calmPrev) {
      // Transition into calm — the moment worth interrupting someone's day for.
      const win = calmWindow(hours, scores, now.dateStr, now.hour);
      payload = { ...notifyCopy(scores[nowIdx] >= DELUXE_MIN, b.beach, hours[nowIdx].seaTemp, win ? win.end + 1 : null, scores[nowIdx]), tag: `yp-${now.dateStr}`, url: APP_URL };
    } else if (now.hour === 19) {
      // Evening preview: tomorrow's window, so you can plan the morning swim.
      const tomorrow = new Date(now.dateStr + "T12:00:00Z"); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const ts = tomorrow.toISOString().slice(0, 10);
      const win = calmWindow(hours, scores, ts, DAY_START);
      if (win) payload = { ...eveningCopy(b.beach, win.start, win.end + 1), tag: `yp-eve-${now.dateStr}`, url: APP_URL };
    }
    if (!payload) continue;

    for (const sub of b.list) {
      try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: "high" }); sent++; }
      catch (e) { console.error(`push failed (${e.statusCode || e.message}) — endpoint may be expired`); }
    }
    console.log(`${b.beach}: "${payload.title}" → ${b.list.length} subscriber(s)`);
  }
  console.log(`done. sent ${sent} notification(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
