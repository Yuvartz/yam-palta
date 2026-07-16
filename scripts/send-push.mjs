// Sends "palata alert" Web Push notifications to subscribers — the locked-phone twin of the
// app's in-page alert. Zero backend: subscriptions live in a Google Sheet (filled by a Google
// Form the app submits to), published as CSV; this script runs hourly from
// .github/workflows/push-notify.yml and pushes via VAPID.
//
// Env (repo secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUBSCRIBERS_CSV_URL
// Exits quietly when any is missing, so the workflow is safe to ship before setup.
//
// ⚠️ SYNC NOTES:
//  • The scoring math below mirrors docs/index.html (PALATA_WEIGHTS, score curves, heightTierCap).
//    If you tune the index there, tune it here.
//  • The copy pool mirrors notifyCopy() in docs/index.html — one voice, two channels.

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const CSV_URL = process.env.SUBSCRIBERS_CSV_URL;
const APP_URL = "https://yuvartz.github.io/yam-palta/";

const DAY_START = 6, DAY_END = 19;   // notify only for daytime windows — nobody swims at 03:00
const CALM_MIN = 80;                 // "כמעט פלטה" tier or better, same bar as the app
const DELUXE_MIN = 98;

// ---- Palata Index (mirror of docs/index.html) ----
const W = { height: 0.35, chop: 0.25, wind: 0.25, history: 0.15 };
const clamp01 = x => Math.max(0, Math.min(1, x));
const toKnots = kmh => kmh / 1.852;
const heightScore = h => h == null ? .5 : clamp01(1 - Math.max(0, h - 0.10) / 1.1);
const chopScore = c => c == null ? .5 : clamp01(1 - Math.max(0, c - 0.10) / 0.45);
const windScore = kt => kt == null ? .5 : clamp01(1 - kt / 14);
const heightCap = h => h == null ? 100 : h > 0.35 ? 79 : h > 0.20 ? 89 : h > 0.10 ? 97 : 100;

function palataIndex(hours, i) {
  const h = hours[i];
  const wind = h.windKmh != null ? toKnots(h.windKmh) : null;
  const histSlice = hours.slice(Math.max(0, i - 9), i + 1).map(x => x.windKmh).filter(v => v != null);
  const hist = histSlice.length ? toKnots(histSlice.reduce((a, b) => a + b, 0) / histSlice.length) : wind;
  const chop = h.windWave != null ? h.windWave : h.waveHeight;
  const sum = heightScore(h.waveHeight) * W.height + chopScore(chop) * W.chop + windScore(wind) * W.wind + windScore(hist) * W.history;
  return Math.min(Math.round(clamp01(sum) * 100), heightCap(h.waveHeight));
}

// ---- Copy pool (mirror of notifyCopy in docs/index.html) ----
function notifyCopy(deluxe, beach, water, endHour) {
  const w = water != null ? ` · מים ${Math.round(water)}°` : "";
  const end = endHour != null ? ` · החלון עד ${String(endHour).padStart(2, "0")}:00` : "";
  const pool = deluxe ? [
    `הים חלק כמו מראה${w}. נדיר — רוץ 🪞`,
    `דלוקס אמיתי${w}${end}. שנייה לפני שכולם מגלים 🤫`,
    `זה היום שמחכים לו${w}. הכל שטוח, הכל שלך 💎`,
  ] : [
    `הים נרגע${w}${end}. עזוב הכל 🐢`,
    `פלטה עכשיו${w}. הים לא מחכה לנצח 🌊`,
    `הים התיישר${w}${end}. סגור את המחשב ובוא 🏊`,
  ];
  return { title: deluxe ? `💎 פלטה דלוקס ב${beach}!` : `🌊 ים פלטה ב${beach}!`, body: pool[Math.floor(Math.random() * pool.length)] };
}
const eveningCopy = (beach, s, e) => ({
  title: `🌅 מחר פלטה ב${beach}`,
  body: `צפוי ים רגוע ${String(s).padStart(2, "0")}:00–${String(e).padStart(2, "0")}:00. כוון שעון, הים מחכה.`,
});

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
  const byEndpoint = new Map();
  for (const r of rows) {
    if (r.length < 5) continue;
    try {
      const sub = JSON.parse(r[4]);
      if (sub && sub.endpoint) byEndpoint.set(sub.endpoint, { beach: r[1], lat: +r[2], lon: +r[3], sub });
    } catch (e) {}
  }
  const subs = [...byEndpoint.values()].filter(s => s.beach && isFinite(s.lat) && isFinite(s.lon));
  if (!subs.length) { console.log("no subscribers."); return; }

  const now = israelNowHour();
  // Group subscribers by coordinates — one forecast fetch per beach.
  const beaches = new Map();
  for (const s of subs) { const k = `${s.lat},${s.lon}`; (beaches.get(k) || beaches.set(k, { ...s, list: [] }).get(k)).list.push(s.sub); }

  let sent = 0;
  for (const b of beaches.values()) {
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
      payload = { ...notifyCopy(scores[nowIdx] >= DELUXE_MIN, b.beach, hours[nowIdx].seaTemp, win ? win.end + 1 : null), tag: `yp-${now.dateStr}`, url: APP_URL };
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
