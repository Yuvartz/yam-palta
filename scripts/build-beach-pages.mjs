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
import { BEACHES as ALL_BEACHES, TIER_EN, pad, dayName, dayNameEn, israelNow } from "./lib/beaches.mjs";
const BEACHES = ALL_BEACHES.filter(b => b.pages !== false);   // static pages only for beaches the app has as presets
const alternates = (slug) => { const he = slug ? `${SITE}/${slug}/` : `${SITE}/`, en = slug ? `${SITE}/en/${slug}/` : `${SITE}/en/`; return `<link rel="alternate" hreflang="he" href="${he}" /><link rel="alternate" hreflang="en" href="${en}" /><link rel="alternate" hreflang="x-default" href="${he}" />`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Same recipe as the app and the push Worker (Palata.recipeUrls / blendHourly / scoreSeries): the static
// page must show the number the app shows for that hour. Wave period is display-only, fetched on top.
async function forecast(b) {
  const u = Palata.recipeUrls(b.lat, b.lon, { forecastDays: 4, pastDays: 1 });
  const j = r => { if (!r.ok) throw new Error(`open-meteo ${r.status}`); return r.json(); };
  const [m, w, s, per] = await Promise.all([
    fetch(u.marine).then(j), fetch(u.weather).then(j), fetch(u.sun).then(j),
    fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${b.lat}&longitude=${b.lon}&timezone=Asia%2FJerusalem&forecast_days=4&past_days=1&hourly=wave_period&models=${Palata.RECIPE.waveModels.join(",")}`).then(j).catch(() => null),
  ]);
  const { hours } = Palata.blendHourly(m, w);
  const pIdx = new Map((per?.hourly?.time || []).map((t, i) => [t, i]));
  hours.forEach(h => { const i = pIdx.get(h.time); h.period = i == null ? null : Palata.median(Palata.RECIPE.waveModels.map(k => per.hourly[`wave_period_${k}`]?.[i])); });
  Palata.scoreSeries(hours);
  const sun = {}; (s.daily?.time || []).forEach((d, i) => { sun[d] = { rise: s.daily.sunrise[i]?.slice(11, 16), set: s.daily.sunset[i]?.slice(11, 16) }; });
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
  const title = `מצב הים ב${b.name} היום — יש פלטה? מדד ${cur && cur.score != null ? (cur.score / 10).toFixed(1) : "—"} | ים פלטה`;
  const desc = `מחפשים ים שטוח ב${b.name}? ${t ? `עכשיו ${t.label} (${(cur.score / 10).toFixed(1)}/10), גל ${cur.waveHeight?.toFixed(1)} מ׳${cur.seaTemp != null ? `, מים ${Math.round(cur.seaTemp)}°` : ""}. ` : ""}גובה גלים, רוח ומדד הפלטה עם תחזית ל-3 ימים והשעות הרגועות. לשחייה, סאפ או סתם ציפה.`;
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
${alternates(b.slug)}
<meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" /><meta property="og:url" content="${SITE}/${b.slug}/" /><meta property="og:image" content="${SITE}/og-image.png" /><meta property="og:type" content="website" /><meta property="og:locale" content="he_IL" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:site_name" content="ים פלטה" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(title)}" /><meta name="twitter:description" content="${esc(desc)}" /><meta name="twitter:image" content="${SITE}/og-image.png" />
<meta name="theme-color" content="#0a0e16" />
<link rel="icon" href="/favicon.ico" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "ים פלטה", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: b.name, item: `${SITE}/${b.slug}/` }] })}</script>
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
<h1>הים ב${esc(b.name)} היום: מחכים לפלטה?</h1>
<p class="meta">גובה גלים, טמפ׳ מים והשעות הרגועות, למי שמעדיפים בלי גלים.</p>
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
<p>הגולשים מחפשים גלים. המדד שלנו מחפש כמה שפחות: מ-0 לסוער עד 10 לים מראה. הוא משקלל גובה גל, גלי רוח, רוח עכשיו והרוח בעשר השעות האחרונות. גלים גבוהים מגבילים את הציון גם כשהרוח נחה. התחזית היא אנסמבל מודלים (Open-Meteo); בחופי המרכז מוצגת לצדה מדידה ממצוף חדרה.</p>
<h2>עוד חופים</h2>
<p class="links">${links}</p>
<p class="foot">המידע הוא תחזית ולא תחליף לשיקול דעת, לדגלי המציל ולתנאים בשטח. מקורות: <a href="https://open-meteo.com/">Open-Meteo</a> (CC-BY 4.0) · <a href="https://isramar.ocean.org.il/">ISRAMAR</a> · <a href="https://www.meduzot.co.il/">מדוזות בים</a>. © ים פלטה · <a href="/">yamplata.com</a> · <a href="/en/${b.slug}/" hreflang="en" lang="en">English</a></p>
</div></body></html>
`;
}

// ---------- English twin: /en/<slug>/ ----------
const CSS_EN = `:root{--bg:#0a0e16;--card:#141b2a;--text:#e6edf6;--muted:#8a98ad;--calm:#2dd4bf;--gold:#ffd479}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:20px 16px 40px}
.wrap{max-width:640px;margin:0 auto}h1{font-size:26px;margin:8px 0 6px}h2{font-size:18px;margin:26px 0 10px;color:#aab8ce}
.hero{background:var(--card);border:1px solid rgba(148,178,255,.1);border-radius:20px;padding:20px;margin:14px 0}
.score{font-size:54px;font-weight:800;font-family:ui-monospace,monospace;line-height:1}.tier{font-size:22px;font-weight:900;margin:6px 0}
.meta{color:var(--muted);font-size:14px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left}th{color:var(--muted);font-weight:600}
.cta{display:inline-block;background:linear-gradient(180deg,rgba(45,212,191,.18),rgba(45,212,191,.05));border:1px solid rgba(45,212,191,.5);color:var(--calm);padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:800;margin-top:12px}
a{color:var(--calm)}.links{font-size:14px;color:var(--muted)}.foot{color:var(--muted);font-size:12px;margin-top:30px}
.tag{font-size:15px;font-weight:700;color:var(--text);margin:0 0 4px}.grid td b{font-family:ui-monospace,monospace;font-size:16px}
dl dt{font-weight:700;margin-top:12px}dl dd{margin:2px 0 0;color:#c9d3e0}`;
const headEn = ({ title, desc, path, ld }) => `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${SITE}${path}" />
${alternates(path.replace(/^\/en\//, "").replace(/\/$/, ""))}
<meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" /><meta property="og:url" content="${SITE}${path}" /><meta property="og:image" content="${SITE}/og-image.png" /><meta property="og:type" content="website" /><meta property="og:locale" content="en_US" /><meta property="og:locale:alternate" content="he_IL" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:site_name" content="YAM PLATA" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(title)}" /><meta name="twitter:description" content="${esc(desc)}" /><meta name="twitter:image" content="${SITE}/og-image.png" />
<meta name="theme-color" content="#0a0e16" />
<link rel="icon" href="/favicon.ico" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" />
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n")}
<style>${CSS_EN}</style>
</head>
<body><div class="wrap">`;
const FOOT_EN = (hePath) => `<p class="foot">Forecast data, not a safety guarantee: check lifeguard flags, currents and jellyfish reports on the beach. Sources: <a href="https://open-meteo.com/">Open-Meteo</a> (CC-BY 4.0) · <a href="https://isramar.ocean.org.il/">ISRAMAR</a> · <a href="https://www.meduzot.co.il/">Meduzot BaYam</a>. © YAM PLATA · <a href="/">yamplata.com</a> · <a href="${hePath}" hreflang="he" lang="he">עברית</a></p>
</div></body></html>
`;
const fmtEn = (cur) => cur ? `Waves ${cur.waveHeight != null ? cur.waveHeight.toFixed(2) : "—"} m · wind waves ${cur.windWave != null ? cur.windWave.toFixed(2) : "—"} m · period ${cur.period != null ? Math.round(cur.period) : "—"} s · wind ${cur.windKmh != null ? Math.round(Palata.toKnots(cur.windKmh)) : "—"} kt${cur.seaTemp != null ? ` · water ${Math.round(cur.seaTemp)}°C` : ""}` : "";

function pageEn(b, cur, days, now, others) {
  const t = cur && cur.score != null ? tierOf(cur.score) : null;
  const sc = t ? (cur.score / 10).toFixed(1) : "—";
  const title = `${b.en} sea today: flat or not? Palata index ${sc} | YAM PLATA`;
  const desc = `Flat sea in ${b.en}? ${t ? `Now: ${TIER_EN[t.key]} (${sc}/10), waves ${cur.waveHeight?.toFixed(1)} m${cur.seaTemp != null ? `, water ${Math.round(cur.seaTemp)}°C` : ""}. ` : ""}Palata flat-sea index, wave height and the calmest hours for the next 3 days.`;
  const rows = days.map(d => `<tr><td>${d.ds === now.dateStr ? "Today" : dayNameEn(d.ds)} <small>${+d.ds.slice(8, 10)}/${+d.ds.slice(5, 7)}</small></td><td>${d.pct}%</td><td>${d.peak ? `${(d.peak.score / 10).toFixed(1)} at ${pad(d.peak.hour)}:00` : "—"}</td><td>${d.run ? `${pad(d.run.s)}:00–${pad(d.run.e + 1)}:00` : "none"}</td><td style="white-space:nowrap">${d.minH != null ? `${d.minH.toFixed(1)}–${d.maxH.toFixed(1)} m` : "—"}</td><td>${d.water != null ? `${Math.round(d.water)}°` : "—"}</td></tr>`).join("");
  const links = others.map(o => `<a href="/en/${o.slug}/">${o.en}</a>`).join(" · ");
  const path = `/en/${b.slug}/`;
  const ld = [
    { "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url: SITE + path, inLanguage: "en", isPartOf: { "@type": "WebApplication", name: "YAM PLATA", url: SITE + "/" }, dateModified: new Date().toISOString(), about: { "@type": "Beach", name: `${b.en} beach`, geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lon } } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "YAM PLATA", item: SITE + "/en/" }, { "@type": "ListItem", position: 2, name: b.en, item: SITE + path }] },
  ];
  return headEn({ title, desc, path, ld }) + `
<p class="meta"><a href="/en/">YAM PLATA</a> › ${esc(b.en)}</p>
<h1>The sea in ${esc(b.en)} today: waiting for it to go flat?</h1>
<p class="meta">Wave height, water temperature and the calmest hours, for people who prefer their sea without waves.</p>
<div class="hero">
  <div class="meta">Palata index now · ${esc(b.en)} · updated ${now.text} (Israel time)</div>
  ${t ? `<div class="score" style="color:${t.color}">${sc}<span style="font-size:20px;color:var(--muted)">/10</span></div><div class="tier" style="color:${t.color}">${t.emoji} ${TIER_EN[t.key]}</div>` : `<div class="tier">No data for this hour</div>`}
  <div class="meta">${fmtEn(cur)}</div>
  <a class="cta" href="/?b=${b.key}">Full hourly forecast in the app (Hebrew) →</a>
</div>
<h2>The next three days in ${esc(b.en)}</h2>
<table><thead><tr><th>Day</th><th>% flat hours</th><th>Peak</th><th>Calm window</th><th>Wave height</th><th>Water</th></tr></thead><tbody>${rows}</tbody></table>
<p class="meta">"% flat hours" = share of daylight hours with a Palata index of 8.0 or higher (flat or almost flat). It is not a probability. "Calm window" = the longest run of such hours.</p>
<h2>What is the Palata index?</h2>
<p>Surfers look for waves. Our index looks for as few as possible: from 0 (stormy) to 10 (mirror-flat). It weighs wave height, wind waves, the wind right now and the wind over the past ten hours. High waves cap the score even when the wind has died. The forecast is a model ensemble via Open-Meteo; on the central coast the app also shows the live ISRAMAR Hadera buoy.</p>
<h2>More beaches</h2>
<p class="links">${links}</p>
` + FOOT_EN(`/${b.slug}/`);
}

function indexEn(results, now) {
  const title = "YAM PLATA — flat-sea forecast for Israel's beaches";
  const desc = "They look for waves. We look for flat. A 0–10 flat-sea index for every Israeli beach, hour by hour for a week, with alerts when it goes calm.";
  const rows = results.map(({ b, cur }) => { const t = cur && cur.score != null ? tierOf(cur.score) : null; return `<tr><td><a href="/en/${b.slug}/">${b.en}</a></td><td><b style="color:${t ? t.color : "inherit"}">${t ? (cur.score / 10).toFixed(1) : "—"}</b></td><td style="color:${t ? t.color : "inherit"}">${t ? TIER_EN[t.key] : "no data"}</td><td>${cur && cur.waveHeight != null ? cur.waveHeight.toFixed(1) + " m" : "—"}</td><td>${cur && cur.seaTemp != null ? Math.round(cur.seaTemp) + "°" : "—"}</td></tr>`; }).join("");
  const faq = [
    ["What does the Palata index measure?", "How flat the sea is, from 0 (stormy) to 10 (mirror). It combines total wave height, short wind waves, current wind and the wind of the past ten hours. It describes flatness, not safety."],
    ["When is the Mediterranean flattest in Israel?", "Usually early morning, before the sea breeze picks up. The week view in the app shows it hour by hour, and the \"Palata window\" marks the longest calm run each day."],
    ["Can I get an alert when the sea goes flat?", "Yes. Install the app (on iPhone: Share → Add to Home Screen) and enable notifications. You get a push when your beach crosses 8.0 with at least one more calm hour ahead, daytime only, at most twice a day, plus a preview of tomorrow morning at 19:00."],
    ["Is the app available in English?", "The beach pages here are in English. The app interface itself is currently in Hebrew; an English interface is planned."],
    ["Where does the data come from?", "A median of marine and atmospheric models (Météo-France MFWAM, ECMWF-WAM, ECMWF-IFS, DWD ICON) via Open-Meteo, the ISRAMAR Hadera buoy for the central coast, and public jellyfish reports."],
  ];
  const ld = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: "YAM PLATA", alternateName: "ים פלטה", url: SITE + "/", applicationCategory: "WeatherApplication", operatingSystem: "Any", inLanguage: ["he", "en"], description: desc, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  return headEn({ title, desc, path: "/en/", ld }) + `
<p class="meta">YAM PLATA · <a href="/" hreflang="he" lang="he">עברית</a></p>
<h1>Flat-sea forecast for Israel's beaches</h1>
<p class="tag">They look for waves. We look for flat. Fewer waves, more sea.</p>
<p class="meta">YAM PLATA ("flat sea" in Hebrew beach slang) is the opposite of a surf app: a 0–10 index that tells swimmers, snorkelers, SUP paddlers, parents and floaters when the sea is calm, per beach, hour by hour, for the week ahead.</p>
<div class="hero">
  <div class="meta">Palata index right now · updated ${now.text} (Israel time)</div>
  <table class="grid"><thead><tr><th>Beach</th><th>Index</th><th>Conditions</th><th>Waves</th><th>Water</th></tr></thead><tbody>${rows}</tbody></table>
  <a class="cta" href="/">Open the app (Hebrew) →</a>
</div>
<h2>How it works</h2>
<p>Every hour, for every beach, the index weighs total wave height, short wind waves, the current wind and the wind over the past ten hours (the sea takes time to settle). Real waves cap the score even when the wind is calm. 8.0 and above is what we call <b>Palata</b>: flat enough for a relaxed swim, a snorkel or a paddle. 9.8 and above is <b>Palata Deluxe</b>: mirror.</p>
<h2>Frequently asked questions</h2>
<dl>${faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
<h2>Beaches</h2>
<p class="links">${results.map(({ b }) => `<a href="/en/${b.slug}/">${b.en}</a>`).join(" · ")}</p>
` + FOOT_EN("/");
}

const now = israelNow();
const built = [];
for (const b of BEACHES) {
  try {
    const { hours, sun } = await forecast(b);
    const cur = hours.find(h => h.dateStr === now.dateStr && h.hour === now.hour) || hours.find(h => h.time.slice(0, 13) >= `${now.dateStr}T${pad(now.hour)}`) || null;
    const days = summarize(hours, sun, now);
    await mkdir(`docs/${b.slug}`, { recursive: true });
    await mkdir(`docs/en/${b.slug}`, { recursive: true });
    await writeFile(`docs/${b.slug}/index.html`, page(b, cur, days, now, BEACHES.filter(o => o !== b)), "utf8");
    await writeFile(`docs/en/${b.slug}/index.html`, pageEn(b, cur, days, now, BEACHES.filter(o => o !== b)), "utf8");
    built.push({ b, cur }); console.log("built", b.slug, cur && cur.score != null ? (cur.score / 10).toFixed(1) : "—");
  } catch (e) { console.warn("failed", b.slug, e.message); }
}
if (built.length) { await mkdir("docs/en", { recursive: true }); await writeFile("docs/en/index.html", indexEn(built, now), "utf8"); }
const today = new Date().toISOString().slice(0, 10);
const alt = (slug) => `<xhtml:link rel="alternate" hreflang="he" href="${SITE}/${slug ? slug + "/" : ""}"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/${slug ? slug + "/" : ""}"/>`;
const u = (loc, pri, slug) => `<url><loc>${loc}</loc>${alt(slug)}<changefreq>hourly</changefreq><priority>${pri}</priority><lastmod>${today}</lastmod></url>`;
const urls = [u(`${SITE}/`, "1.0", ""), u(`${SITE}/en/`, "0.9", ""), ...BEACHES.flatMap(b => [u(`${SITE}/${b.slug}/`, "0.8", b.slug), u(`${SITE}/en/${b.slug}/`, "0.7", b.slug)])];
await writeFile("docs/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  ${urls.join("\n  ")}\n</urlset>\n`, "utf8");
console.log(`sitemap: ${urls.length} urls; built ${built.length}/${BEACHES.length} beaches (he + en) + /en/`);
