// YAM PLATA story generator: live forecast → 1080×1920 MP4 (+ poster PNG + caption.txt).
//   node render.mjs                         tomorrow morning, Israel (18 beaches), 15 s
//   node render.mjs --region sinai          Eilat → Taba → Nuweiba → Dahab → Sharm (12 stops)
//   node render.mjs --region world          famous beaches, each in its OWN local morning
//   node render.mjs --target now            what's flat right now
//   node render.mjs --duration 12 --fps 30 --out out
//   node render.mjs --preview               poster PNG only (fast check of data + layout)
// Same forecast recipe as the app (Palata.recipeUrls/blendHourly/scoreSeries) — the video never shows a
// number the app would not. Rendering = Playwright Chromium screenshots of template.html at fixed t,
// encoded by ffmpeg (must be on PATH). No TTS/music by default.
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BEACHES, REGIONS, pad, dayName, addDays, israelNow, localNowFromOffset } from "../../scripts/lib/beaches.mjs";

const require = createRequire(import.meta.url);
const Palata = require("../../docs/palata.js");
const here = path.dirname(fileURLToPath(import.meta.url));

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true) : d; };
const REGION = arg("region", "israel"), TARGET = arg("target", "tomorrow"), DURATION = +arg("duration", 15), FPS = +arg("fps", 30);
const OUT = path.resolve(here, arg("out", "out")), PREVIEW = !!arg("preview", false), TOP_N = +arg("beaches", 3);
const SITE = "https://yamplata.com";
const R = REGIONS[REGION]; if (!R) { console.error(`unknown region ${REGION}; one of ${Object.keys(REGIONS).join(", ")}`); process.exit(2); }
const tierOf = s => Palata.TIERS.find(t => s >= t.min) || Palata.TIERS[Palata.TIERS.length - 1];
const fmt = s => (s / 10).toFixed(1);

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Open-Meteo's free tier answers 503/429 to bursts: retry with backoff (the whole board is ~50 requests).
async function getJson(url, tries = 4) {
  for (let i = 0; ; i++) {
    const r = await fetch(url).catch(() => null);
    if (r && r.ok) return r.json();
    if (i >= tries - 1) throw new Error(`open-meteo ${r ? r.status : "network"}`);
    await sleep(1200 * (i + 1) + Math.random() * 400);
  }
}
async function forecast(b) {
  const u = Palata.recipeUrls(b.lat, b.lon, { forecastDays: 3, pastDays: 1, timezone: R.timezone });
  const m = await getJson(u.marine), w = await getJson(u.weather);
  await sleep(150);
  const blend = Palata.blendHourly(m, w);
  Palata.scoreSeries(blend.hours);
  // "now" at this beach: Israel clock for local regions, the beach's own clock for the world edition
  const now = R.timezone === "auto" ? localNowFromOffset(blend.utcOffsetSeconds) : israelNow();
  return { hours: blend.hours, now, timezone: blend.timezone };
}

// Per beach: the best hour of the target window (tomorrow 06–11 local, or the current hour).
function evaluate(all) {
  return all.map(({ b, hours, now, timezone }) => {
    const day = TARGET === "tomorrow" ? addDays(now.dateStr, 1) : now.dateStr;
    const windowHours = TARGET === "tomorrow" ? [6, 7, 8, 9, 10, 11] : (now.hour >= 6 && now.hour <= 19 ? [now.hour] : []);
    const cand = hours.filter(h => h.dateStr === day && windowHours.includes(h.hour) && h.score != null);
    const best = cand.reduce((a, h) => (!a || h.score > a.score ? h : a), null);
    return { b, hours, now, timezone, day, best };
  });
}

function buildData(evald, nowIL) {
  const scored = evald.filter(e => e.best);
  if (!scored.length) throw new Error("no scorable hours for the target window");
  const ranked = [...scored].sort((x, y) => y.best.score - x.best.score);
  const top = ranked[0], top3 = ranked.slice(0, TOP_N);
  const isTomorrow = TARGET === "tomorrow", isWorld = R.timezone === "auto";
  const day = top.day, dLabel = `יום ${dayName(day)} ${+day.slice(8, 10)}.${+day.slice(5, 7)}`;
  const calmCount = scored.filter(e => e.best.score >= Palata.CALM_MIN).length;
  const boardOrder = R.order === "score" ? ranked : evald.filter(e => e.best);   // geographic order = catalogue order (north → south)
  const bars = top.hours.filter(h => h.dateStr === top.day && h.hour >= 6 && h.hour <= 19).map(h => ({ hour: h.hour, score: h.score }));
  const title2 = calmCount ? "יש פלטה." : "יש פלטה?";
  const isPlanet = REGION === "planet", topDeluxe = top.best.score >= Palata.DELUXE_MIN;
  const shortName = n => n.split(",")[0].replace(/\s*\(.*?\)\s*/g, " ").trim();
  const BOARD_MAX = 27, boardItems = boardOrder.slice(0, BOARD_MAX);
  return {
    duration: DURATION,
    title1: isPlanet ? (topDeluxe ? (isTomorrow ? "מחר יש 10 בעולם." : "יש 10 בעולם עכשיו.") : (isTomorrow ? "הכי פלטה בעולם מחר:" : "הכי פלטה בעולם עכשיו:")) : isWorld ? (isTomorrow ? (REGION === "world" ? "מחר בבוקר, בעולם:" : `מחר בבוקר, ${R.name}:`) : "עכשיו, בעולם:") : (isTomorrow ? "מחר בבוקר:" : "עכשיו בים:"),
    title2: isPlanet ? `${fmt(top.best.score)} ב${shortName(top.b.name)}` : title2,
    dateLine: isWorld ? `${isTomorrow ? "מחר בבוקר, לפי השעון המקומי" : "כרגע, לפי השעון המקומי"} · ${scored.length} חופים${REGION === "world" ? "" : ` · ${R.name}`}` : `${isTomorrow ? "מחר, " : ""}${dLabel} · ${R.name}`,
    pillText: isPlanet ? (topDeluxe ? `10 עגול. הים שם שכח לזוז · ${scored.length} חופים נסרקו` : `הכי קרוב ל-10 מתוך ${scored.length} חופים שנסרקו`) : calmCount ? `מדד הפלטה עובר 8.0 ב-${calmCount} מתוך ${scored.length} חופים` : (isWorld ? "גם בעולם הגולשים מרוצים היום. אנחנו מחכים" : "הגולשים מרוצים. אנחנו מחכים לבוקר שקט יותר"),
    rowsTitle: isPlanet ? `שלושת הכי שטוחים <span>בכדור הארץ</span>` : isWorld ? `הכי שטוח <span>${isTomorrow ? "מחר בבוקר" : "עכשיו"}</span> ${REGION === "world" ? "בעולם" : "ב" + R.name}` : (REGION === "sinai" ? `הכי שטוח <span>${isTomorrow ? "מחר בבוקר" : "עכשיו"}</span> בדרך לשארם` : `השעות הכי שטוחות <span>${isTomorrow ? "מחר בבוקר" : "עכשיו"}</span>`),
    beaches: top3.map(e => { const t = tierOf(e.best.score); return { name: e.b.name, hour: `${pad(e.best.hour)}:00`, score: e.best.score, tierKey: t.key, tierLabel: t.label, water: e.best.seaTemp, wave: e.best.waveHeight }; }),
    board: {
      title: isPlanet ? `<span>${BOARD_MAX} המובילים</span> מתוך ${scored.length}` : isWorld ? `כל החופים, <span>מהשטוח לסוער</span>` : (REGION === "sinai" ? `<span>מאילת עד שארם</span>, תחנה-תחנה` : `כל החופים, <span>מצפון לדרום</span>`),
      sub: isWorld ? `הציון של כל חוף בשעה הכי שטוחה של הבוקר שלו` : `הציון בשעה הכי שטוחה של הבוקר (06:00–11:00)${boardOrder.length > 12 ? " · חופים סמוכים חולקים תא תחזית" : ""}`,
      items: boardItems.map(e => { const t = tierOf(e.best.score); const w = e.best.seaTemp != null ? ` · מים ${Math.round(e.best.seaTemp)}°` : ""; return { name: e.b.name, sub: `${pad(e.best.hour)}:00 · ${t.short}${w}`, subShort: `${pad(e.best.hour)}:00${w}`, score: e.best.score, top: e === top }; }),
    },
    week: { title: `${isTomorrow ? "מחר" : "היום"} ב<span>${top.b.name}</span>, שעה-שעה`, sub: `מדד הפלטה 06:00–19:00${isWorld ? " שעון מקומי" : ""} · ◆ ${pad(top.best.hour)}:00 הכי שטוח (${fmt(top.best.score)})`, bars },
    sourceLine: `<b>תחזית</b> לשטיחות הים, לא אישור בטיחות · מקור: <bdi>Open-Meteo</bdi> · הופק <bdi>${nowIL.text.slice(0, 5)} ${nowIL.text.slice(11)}</bdi><br><bdi>yamplata.com</bdi>`,
    meta: { region: REGION, target: TARGET, day, ranking: ranked.map(e => ({ beach: e.b.slug, day: e.day, hour: e.best.hour, score: e.best.score, timezone: e.timezone })) },
  };
}

function caption(data) {
  const top = data.beaches[0], isTomorrow = TARGET === "tomorrow";
  const list = data.beaches.map(b => `${b.name} ${fmt(b.score)} ב-${b.hour}`).join(" · ");
  const calm = top.score >= Palata.CALM_MIN;
  const lead = REGION === "planet"
    ? `${top.score >= Palata.DELUXE_MIN ? "יש 10 בעולם" : "הכי פלטה בכדור הארץ"} ${isTomorrow ? "מחר בבוקר" : "עכשיו"}: ${top.name}, ${fmt(top.score)}/10 (${top.tierLabel}). ${top.score >= Palata.DELUXE_MIN ? "הים שם שכח לזוז." : "עוד לא 10 עגול, אבל קרוב."}`
    : R.timezone === "auto"
    ? `${isTomorrow ? "מחר בבוקר" : "עכשיו"} ${REGION === "world" ? "בעולם" : "ב" + R.name}: הכי שטוח ב${top.name}, ${fmt(top.score)}/10 (${top.tierLabel}). ${calm ? "יש למי לקנא." : "גם שם מחכים."}`
    : REGION === "sinai"
      ? `${isTomorrow ? "מחר בבוקר" : "עכשיו"} בדרך לשארם: הכי שטוח ב${top.name}, ${fmt(top.score)}/10 ב-${top.hour}, ${top.tierLabel}. ${calm ? "השנורקל כבר בתיק." : "הרוח עוד לא נרגעה."}`
      : `${isTomorrow ? `מחר, ${data.dateLine.replace(/^מחר, /, "")}` : "עכשיו"}: ב${top.name} ${fmt(top.score)}/10 ב-${top.hour}, ${top.tierLabel}. ${calm ? "המשקפת מוכנה?" : "המגבת יכולה לחכות עוד קצת."}`;
  const tags = R.timezone === "auto" ? "#ימפלטה #YamPlata #flatsea #beachforecast #swim #snorkel #sup #יםשטוח" : REGION === "sinai" ? "#ימפלטה #YamPlata #סיני #דהב #נואיבה #שארם #אילת #שנירקול #יםשטוח #פלטה" : "#ימפלטה #YamPlata #יםשטוח #פלטה #שחייהבים #סאפ #שנירקול #תחזיתים #חוףהים #מחרבבוקר";
  return [lead, list, "", "הם מחפשים גלים. אנחנו מחפשים פלטה. פחות גלים. יותר ים.", `תחזית לשטיחות הים · מתעדכנת · אינה אישור בטיחות. הכול באפליקציה: ${SITE}/?utm_source=social&utm_campaign=daily_story_${REGION}`, "", tags].join("\n");
}

function ffmpeg(args) {
  return new Promise((res, rej) => { const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] }); let err = ""; p.stderr.on("data", d => { err += d; }); p.on("close", c => c === 0 ? res() : rej(new Error("ffmpeg failed: " + err.slice(-800)))); });
}

async function main() {
  const nowIL = israelNow();
  const beaches = BEACHES.filter(R.pick);
  console.log(`forecast for ${beaches.length} beaches (${REGION})…`);
  const all = [];
  for (const b of beaches) { try { all.push({ b, ...(await forecast(b)) }); } catch (e) { console.warn("skip", b.slug, e.message); } }
  const data = buildData(evaluate(all), nowIL);
  const stamp = `${data.meta.day}-${REGION}-${TARGET}`;
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, `${stamp}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), ...data.meta, data }, null, 2));
  await writeFile(path.join(OUT, `${stamp}.caption.txt`), caption(data), "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(here, "template.html")).href, { waitUntil: "load" });
  await page.evaluate(d => window.render(d), data);
  await page.waitForTimeout(400);   // fonts + images settle
  const poster = path.join(OUT, `${stamp}.poster.png`), board = path.join(OUT, `${stamp}.board.png`);
  await page.evaluate(t => window.seek(t), 4.6 * DURATION / 15); await page.screenshot({ path: poster, type: "png" });
  await page.evaluate(t => window.seek(t), 9.6 * DURATION / 15); await page.screenshot({ path: board, type: "png" });
  console.log("poster", poster);
  if (PREVIEW) { await browser.close(); return; }

  const frames = path.join(here, "frames", stamp);
  await rm(frames, { recursive: true, force: true }); await mkdir(frames, { recursive: true });
  const n = Math.round(DURATION * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`), type: "png" });
    if (i % FPS === 0) process.stdout.write(`\r  frame ${i}/${n}`);
  }
  await browser.close();
  console.log(`\nencoding ${n} frames…`);
  const mp4 = path.join(OUT, `${stamp}.mp4`);
  await ffmpeg(["-y", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", "-r", String(FPS), mp4]);
  const kept = (await readdir(frames)).length; await rm(frames, { recursive: true, force: true });
  console.log(`done: ${mp4} (${kept} frames) + poster + board + caption`);
}
main().catch(e => { console.error(e); process.exit(1); });
