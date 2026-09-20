// Builds indexable, static per-beach pages (docs/<slug>/index.html) + docs/sitemap.xml from the
// live forecast, so Google has real HTML to rank for "גובה גלים תל אביב" / "מצב הים בנתניה" etc.
// The app itself is client-rendered; these pages are its crawlable twin and link into it (?b=key).
// Runs every 3 hours from .github/workflows/beach-pages.yml and can be run locally:
//   node scripts/build-beach-pages.mjs
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const Palata = require("../docs/palata.js");

const SITE = "https://yamplata.com";
const BEACHES = [
  { slug: "tel-aviv", key: "telaviv", name: "תל אביב", lat: 32.0809, lon: 34.7610, area: "מרכז" },
  { slug: "herzliya", key: "herzliya", name: "הרצליה", lat: 32.1624, lon: 34.7990, area: "שרון" },
  { slug: "netanya", key: "netanya", name: "נתניה", lat: 32.3215, lon: 34.8532, area: "שרון" },
  { slug: "caesarea", key: "caesarea", name: "קיסריה", lat: 32.4860, lon: 34.8820, area: "חוף הכרמל" },
  { slug: "haifa", key: "haifa", name: "חיפה", lat: 32.8275, lon: 34.9897, area: "צפון" },
  { slug: "akko", key: "akko", name: "עכו", lat: 32.9270, lon: 35.0690, area: "צפון" },
  { slug: "bat-yam", key: "batyam", name: "בת ים", lat: 32.0170, lon: 34.7370, area: "מרכז" },
  { slug: "ashdod", key: "ashdod", name: "אשדוד", lat: 31.8044, lon: 34.6473, area: "דרום" },
  { slug: "ashkelon", key: "ashkelon", name: "אשקלון", lat: 31.6699, lon: 34.5738, area: "דרום" },
  { slug: "eilat", key: "eilat", name: "אילת", lat: 29.48, lon: 34.93, area: "ים סוף" },   // open water off the coral reserve; the city point has no marine data
];
const pad = n => String(n).padStart(2, "0");
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const israelNow = () => { const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); return { dateStr: s.slice(0, 10), hour: +s.slice(11, 13), minute: +s.slice(14, 16), text: `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)} ${s.slice(11, 16)}` }; };
const dayName = ds => HE_DAYS[new Date(ds + "T12:00:00Z").getUTCDay()];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function forecast(b) {
  const common = `latitude=${b.lat}&longitude=${b.lon}&timezone=Asia%2FJerusalem&forecast_days=4&past_days=1`;
  const [m, w] = await Promise.all([
    fetch(`https://marine-api.open-meteo.com/v1/marine?${common}&hourly=wave_height,wind_wave_height,wave_period,sea_surface_temperature`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/forecast?${common}&hourly=wind_speed_10m&daily=sunrise,sunset`).then(r => r.json()),
  ]);
  if (!m.hourly || !w.hourly) throw new Error("bad payload");
  const wi = new Map(w.hourly.time.map((t, i) => [t, i]));
  const hours = m.hourly.time.map((t, i) => { const j = wi.get(t); return { time: t, dateStr: t.slice(0, 10), hour: +t.slice(11, 13), waveHeight: m.hourly.wave_height?.[i] ?? null, windWave: m.hourly.wind_wave_height?.[i] ?? null, period: m.hourly.wave_period?.[i] ?? null, seaTemp: m.hourly.sea_surface_temperature?.[i] ?? null, windKmh: j != null ? w.hourly.wind_speed_10m?.[j] ?? null : null }; });
  const H = Palata.HISTORY_HOURS;
  hours.forEach((h, i) => {
    const wind = Palata.toKnots(h.windKmh);
    const sl = hours.slice(Math.max(0, i - (H - 1)), i + 1).map(x => x.windKmh).filter(v => v != null);
    const hist = sl.length ? Palata.toKnots(sl.reduce((a, b) => a + b, 0) / sl.length) : wind;
    h.score = Palata.scoreOf(h.waveHeight, h.windWave != null ? h.windWave : h.waveHeight, wind, hist);
  });
  const sun = {}; (w.daily?.time || []).forEach((d, i) => { sun[d] = { rise: w.daily.sunrise[i]?.slice(11, 16), set: w.daily.sunset[i]?.slice(11, 16) }; });
  return { hours, sun };
}
function daylight(h, sun) { const s = sun[h.dateStr]; const a = s && s.rise ? +s.rise.slice(0, 2) : 6, b = s && s.set ? +s.set.slice(0, 2) : 19; return h.hour >= a && h.hour < b; }
function summarize(hours, sun, now) {
  const days = [...new Set(hours.map(h => h.dateStr))].filter(d => d >= now.dateStr).slice(0, 3);
  return days.map(ds => {
    const dh = hours.filter(h => h.dateStr === ds && daylight(h, sun) && !(ds === now.dateStr && h.hour < now.hour) && h.score != null);
    const calm = dh.filter(h => h.score >= Palata.CALM_MIN);
    const peak = dh.reduce((a, h) => (!a || h.score > a.score ? h : a), null);
    let run = null, cur = null; for (const h of dh) { if (h.score >= Palata.CALM_MIN) { if (!cur) cur = { s: h.hour, e: h.hour }; else cur.e = h.hour; if (!run || cur.e - cur.s > run.e - run.s) run = cur; } else cur = null; }
    const maxH = dh.length ? Math.max(...dh.map(h => h.waveHeight ?? 0)) : null, minH = dh.length ? Math.min(...dh.map(h => h.waveHeight ?? 9)) : null;
    return { ds, pct: dh.length ? Math.round(calm.length / dh.length * 100) : 0, peak, run, maxH, minH, water: dh.find(h => h.seaTemp != null)?.seaTemp ?? null };
  });
}
const tierOf = s => Palata.TIERS.find(t => s >= t.min) || Palata.TIERS[Palata.TIERS.length - 1];

function page(b, cur, days, now, others) {
  const t = cur && cur.score != null ? tierOf(cur.score) : null;
  const title = `גובה גלים ומצב הים ב${b.name} היום — מדד הפלטה ${cur && cur.score != null ? (cur.score / 10).toFixed(1) : ""} | ים פלטה`;
  const desc = `האם הים ב${b.name} שטוח לשחייה, סאפ ושנירקול? ${t ? `עכשיו: ${t.label} (${(cur.score / 10).toFixed(1)}/10), גל ${cur.waveHeight?.toFixed(1)} מ׳${cur.seaTemp != null ? `, מים ${Math.round(cur.seaTemp)}°` : ""}.` : ""} תחזית ל-3 ימים עם השעות הרגועות, מתעדכנת כל 3 שעות.`;
  const rows = days.map(d => `<tr><td>${d.ds === now.dateStr ? "היום" : dayName(d.ds)} <small>${d.ds.slice(8, 10)}.${+d.ds.slice(5, 7)}</small></td><td>${d.pct}%</td><td>${d.peak ? `${(d.peak.score / 10).toFixed(1)} ב-${pad(d.peak.hour)}:00` : "—"}</td><td>${d.run ? `<span dir="ltr">${pad(d.run.s)}:00–${pad(d.run.e + 1)}:00</span>` : "אין"}</td><td style="white-space:nowrap">${d.minH != null ? `<span dir="ltr">${d.minH.toFixed(1)}–${d.maxH.toFixed(1)}</span> מ׳` : "—"}</td><td>${d.water != null ? `${Math.round(d.water)}°` : "—"}</td></tr>`).join("");
  const links = others.map(o => `<a href="/${o.slug}/">${o.name}</a>`).join(" · ");
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url: `${SITE}/${b.slug}/`, inLanguage: "he", isPartOf: { "@type": "WebApplication", name: "ים פלטה", url: SITE + "/" }, dateModified: new Date().toISOString(), about: { "@type": "Beach", name: `חוף ${b.name}`, geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lon } } };
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${SITE}/${b.slug}/" />
<meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" /><meta property="og:url" content="${SITE}/${b.slug}/" /><meta property="og:image" content="${SITE}/og-image.png" /><meta property="og:type" content="website" /><meta property="og:locale" content="he_IL" />
<meta name="theme-color" content="#0a0e16" />
<link rel="icon" href="/favicon.ico" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--bg:#0a0e16;--card:#141b2a;--text:#e6edf6;--muted:#8a98ad;--calm:#2dd4bf;--gold:#ffd479}
*{box-sizing:border-box}body{margin:0;font-family:Heebo,system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:20px 16px 40px}
.wrap{max-width:640px;margin:0 auto}h1{font-size:26px;margin:8px 0 6px}h2{font-size:18px;margin:26px 0 10px;color:#aab8ce}
.hero{background:var(--card);border:1px solid rgba(148,178,255,.1);border-radius:20px;padding:20px;margin:14px 0}
.score{font-size:54px;font-weight:800;font-family:ui-monospace,monospace;line-height:1}.tier{font-size:22px;font-weight:900;margin:6px 0}
.meta{color:var(--muted);font-size:14px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.06);text-align:right}th{color:var(--muted);font-weight:600}
.cta{display:inline-block;background:linear-gradient(180deg,rgba(45,212,191,.18),rgba(45,212,191,.05));border:1px solid rgba(45,212,191,.5);color:var(--calm);padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:800;margin-top:12px}
a{color:var(--calm)}.links{font-size:14px;color:var(--muted)}.foot{color:var(--muted);font-size:12px;margin-top:30px}
</style>
</head>
<body><div class="wrap">
<p class="meta"><a href="/">ים פלטה</a> › ${esc(b.name)}</p>
<h1>מצב הים ב${esc(b.name)} היום: גובה גלים, טמפ׳ מים והשעות הרגועות</h1>
<div class="hero">
  <div class="meta">מדד הפלטה עכשיו · ${esc(b.name)} · עודכן ${now.text}</div>
  ${t ? `<div class="score" style="color:${t.color}">${(cur.score / 10).toFixed(1)}<span style="font-size:20px;color:var(--muted)">/10</span></div><div class="tier" style="color:${t.color}">${t.emoji} ${t.label}</div>` : `<div class="tier">אין נתונים לשעה זו</div>`}
  ${cur ? `<div class="meta">גל ${cur.waveHeight != null ? cur.waveHeight.toFixed(2) : "—"} מ׳ · גלי רוח ${cur.windWave != null ? cur.windWave.toFixed(2) : "—"} מ׳ · מחזור ${cur.period != null ? Math.round(cur.period) : "—"} שנ׳ · רוח ${cur.windKmh != null ? Math.round(Palata.toKnots(cur.windKmh)) : "—"} קשר${cur.seaTemp != null ? ` · מים ${Math.round(cur.seaTemp)}°` : ""}</div>` : ""}
  <a class="cta" href="/?b=${b.key}">לתחזית השעתית המלאה באפליקציה ←</a>
</div>
<h2>שלושת הימים הקרובים ב${esc(b.name)}</h2>
<table><thead><tr><th>יום</th><th>% שעות פלטה</th><th>שיא</th><th>חלון רגוע</th><th>גובה גל</th><th>מים</th></tr></thead><tbody>${rows}</tbody></table>
<p class="meta">"% שעות פלטה" = חלק משעות האור שבהן מדד הפלטה 8.0 ומעלה (ים שטוח או כמעט שטוח). זו לא הסתברות. "חלון רגוע" = הרצף הארוך ביותר של שעות כאלה.</p>
<h2>מה זה מדד הפלטה?</h2>
<p>ציון מ-0 (סוער) עד 10 (חלק כמו מראה) שמשקלל ארבעה גורמים: גובה הגל הכולל, גלים קצרים שנוצרים מהרוח המקומית, עוצמת הרוח עכשיו, והרוח ב-10 השעות האחרונות (הים לא נרגע מיד). מעל גובה גל מסוים יש תקרה קשיחה: ים עם גלים אמיתיים לא ייקרא "פלטה" גם אם הרוח שקטה. הנתונים הם אנסמבל של מודלים ימיים ואטמוספריים (Météo-France, ECMWF, DWD) דרך Open-Meteo, ובחופי המרכז מוצגת לצדם מדידה אמיתית ממצוף חדרה של חקר ימים ואגמים.</p>
<h2>עוד חופים</h2>
<p class="links">${links}</p>
<p class="foot">המידע הוא תחזית ולא תחליף לשיקול דעת, לדגלי המציל ולתנאים בשטח. מקורות: <a href="https://open-meteo.com/">Open-Meteo</a> (CC-BY 4.0) · <a href="https://isramar.ocean.org.il/">ISRAMAR</a> · <a href="https://www.meduzot.co.il/">מדוזות בים</a>. © ים פלטה · <a href="/">yamplata.com</a></p>
</div></body></html>
`;
}

const now = israelNow();
const built = [];
for (const b of BEACHES) {
  try {
    const { hours, sun } = await forecast(b);
    const cur = hours.find(h => h.dateStr === now.dateStr && h.hour === now.hour) || hours.find(h => h.time.slice(0, 13) >= `${now.dateStr}T${pad(now.hour)}`) || null;
    const days = summarize(hours, sun, now);
    await mkdir(`docs/${b.slug}`, { recursive: true });
    await writeFile(`docs/${b.slug}/index.html`, page(b, cur, days, now, BEACHES.filter(o => o !== b)), "utf8");
    built.push(b); console.log("built", b.slug, cur && cur.score != null ? (cur.score / 10).toFixed(1) : "—");
  } catch (e) { console.warn("failed", b.slug, e.message); }
}
const today = new Date().toISOString().slice(0, 10);
const urls = [`<url><loc>${SITE}/</loc><changefreq>hourly</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>`, ...BEACHES.map(b => `<url><loc>${SITE}/${b.slug}/</loc><changefreq>hourly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>`)];
await writeFile("docs/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls.join("\n  ")}\n</urlset>\n`, "utf8");
console.log(`sitemap: ${urls.length} urls; built ${built.length}/${BEACHES.length} pages`);
