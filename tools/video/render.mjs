// YAM PLATA story generator: live forecast → 1080×1920 MP4 (+ poster PNG + caption.txt).
//   node render.mjs                         tomorrow-morning, Israel, 12 s
//   node render.mjs --target now            what's flat right now
//   node render.mjs --region redsea         Eilat
//   node render.mjs --duration 15 --fps 30 --out out
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
import { BEACHES, pad, dayName, addDays, israelNow } from "../../scripts/lib/beaches.mjs";

const require = createRequire(import.meta.url);
const Palata = require("../../docs/palata.js");
const here = path.dirname(fileURLToPath(import.meta.url));

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true) : d; };
const REGION = arg("region", "israel"), TARGET = arg("target", "tomorrow"), DURATION = +arg("duration", 12), FPS = +arg("fps", 30);
const OUT = path.resolve(here, arg("out", "out")), PREVIEW = !!arg("preview", false), MAX_BEACHES = +arg("beaches", 3);
const SITE = "https://yamplata.com";
const tierOf = s => Palata.TIERS.find(t => s >= t.min) || Palata.TIERS[Palata.TIERS.length - 1];

async function forecast(b) {
  const u = Palata.recipeUrls(b.lat, b.lon, { forecastDays: 3, pastDays: 1 });
  const j = async r => { if (!r.ok) throw new Error(`open-meteo ${r.status}`); return r.json(); };
  const [m, w] = await Promise.all([fetch(u.marine).then(j), fetch(u.weather).then(j)]);
  return Palata.scoreSeries(Palata.blendHourly(m, w).hours);
}

// Pick the story: per beach the best hour in the window; rank beaches by that score.
function pickStory(all, now) {
  const tomorrow = TARGET === "tomorrow";
  const day = tomorrow ? addDays(now.dateStr, 1) : now.dateStr;
  const windowHours = tomorrow ? [6, 7, 8, 9, 10, 11] : [now.hour];
  const rows = all.map(({ b, hours }) => {
    const cand = hours.filter(h => h.dateStr === day && windowHours.includes(h.hour) && h.score != null);
    const best = cand.reduce((a, h) => (!a || h.score > a.score ? h : a), null);
    return best ? { b, best, hours } : null;
  }).filter(Boolean).sort((x, y) => y.best.score - x.best.score);
  return { day, rows: rows.slice(0, MAX_BEACHES), all: rows };
}

function buildData(story, now) {
  const { day, rows } = story;
  if (!rows.length) throw new Error("no scorable hours for the target window");
  const top = rows[0];
  const dLabel = `יום ${dayName(day)} ${+day.slice(8, 10)}.${+day.slice(5, 7)}`;
  const isTomorrow = TARGET === "tomorrow";
  const anyPalata = rows.some(r => r.best.score >= Palata.CALM_MIN);
  const bars = top.hours.filter(h => h.dateStr === day && h.hour >= 6 && h.hour <= 19).map(h => ({ hour: h.hour, score: h.score }));
  const regionName = REGION === "redsea" ? "אילת" : "חופי ישראל";
  return {
    duration: DURATION,
    title1: isTomorrow ? "מחר בבוקר:" : "עכשיו בים:",
    title2: anyPalata ? "יש פלטה." : "יש פלטה?",
    dateLine: `${isTomorrow ? "מחר, " : ""}${dLabel} · ${regionName}`,
    pillText: anyPalata ? `מדד הפלטה עובר 8.0 ב-${rows.filter(r => r.best.score >= Palata.CALM_MIN).length} חופים` : "הגולשים מרוצים. אנחנו מחכים לבוקר שקט יותר",
    rowsTitle: isTomorrow ? `השעות הכי שטוחות <span>מחר בבוקר</span>` : `איפה הכי שטוח <span>עכשיו</span>`,
    beaches: rows.map(r => { const t = tierOf(r.best.score); return { name: r.b.name, hour: `${pad(r.best.hour)}:00`, score: r.best.score, tierKey: t.key, tierLabel: t.label, water: r.best.seaTemp, wave: r.best.waveHeight }; }),
    week: { title: `${isTomorrow ? "מחר" : "היום"} ב<span>${top.b.name}</span>, שעה-שעה`, sub: `מדד הפלטה 06:00–19:00 · ◆ ${pad(top.best.hour)}:00 הכי שטוח (${(top.best.score / 10).toFixed(1)})`, bars },
    sourceLine: `<b>תחזית</b> לשטיחות הים, לא אישור בטיחות · מקור: <bdi>Open-Meteo</bdi> · הופק <bdi>${now.text.slice(0, 5)} ${now.text.slice(11)}</bdi><br><bdi>yamplata.com</bdi>`,
  };
}

function caption(data, story) {
  const top = story.rows[0], t = tierOf(top.best.score), sc = (top.best.score / 10).toFixed(1);
  const list = story.rows.map(r => `${r.b.name} ${(r.best.score / 10).toFixed(1)} ב-${pad(r.best.hour)}:00`).join(" · ");
  const lead = TARGET === "tomorrow"
    ? `מחר, ${data.dateLine.replace(/^מחר, /, "")}: ב${top.b.name} ${sc}/10 ב-${pad(top.best.hour)}:00, ${t.label}. ${top.best.score >= Palata.CALM_MIN ? "המשקפת מוכנה?" : "המגבת יכולה לחכות עוד קצת."}`
    : `עכשיו: ב${top.b.name} ${sc}/10, ${t.label}. ${top.best.score >= Palata.CALM_MIN ? "מי בא לים?" : "הגולשים מרוצים. אנחנו מחכים."}`;
  return [lead, list, "", "הם מחפשים גלים. אנחנו מחפשים פלטה. פחות גלים. יותר ים.", `תחזית לשטיחות הים · מתעדכנת · אינה אישור בטיחות. הכול באפליקציה: ${SITE}/?b=${top.b.key}&utm_source=social&utm_campaign=daily_story`, "",
    "#ימפלטה #YamPlata #יםשטוח #פלטה #שחייהבים #סאפ #שנירקול #תחזיתים #חוףהים #מחרבבוקר"].join("\n");
}

function ffmpeg(args) {
  return new Promise((res, rej) => { const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] }); let err = ""; p.stderr.on("data", d => { err += d; }); p.on("close", c => c === 0 ? res() : rej(new Error("ffmpeg failed: " + err.slice(-800)))); });
}

async function main() {
  const now = israelNow();
  const beaches = BEACHES.filter(b => b.region === REGION);
  if (!beaches.length) throw new Error(`unknown region ${REGION}`);
  console.log(`forecast for ${beaches.length} beaches (${REGION})…`);
  const all = [];
  for (const b of beaches) { try { all.push({ b, hours: await forecast(b) }); } catch (e) { console.warn("skip", b.slug, e.message); } }
  const story = pickStory(all, now);
  const data = buildData(story, now);
  const stamp = `${story.day}-${REGION}-${TARGET}`;
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, `${stamp}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), data, ranking: story.all.map(r => ({ beach: r.b.slug, hour: r.best.hour, score: r.best.score })) }, null, 2));
  await writeFile(path.join(OUT, `${stamp}.caption.txt`), caption(data, story), "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(here, "template.html")).href, { waitUntil: "load" });
  await page.evaluate(d => window.render(d), data);
  await page.waitForTimeout(400);   // fonts + images settle
  const poster = path.join(OUT, `${stamp}.poster.png`);
  await page.evaluate(t => window.seek(t), Math.min(4.6 * DURATION / 12, DURATION));
  await page.screenshot({ path: poster, type: "png" });
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
  console.log(`done: ${mp4} (${kept} frames) + poster + caption`);
}
main().catch(e => { console.error(e); process.exit(1); });
