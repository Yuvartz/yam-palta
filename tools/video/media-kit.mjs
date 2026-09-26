// Media kit: iPhone-size screenshots (1290×2796) of every app screen + a screen-recorded demo of the live app.
//   node tools/video/media-kit.mjs [outDir] [--time=2026-09-27T10:00:00+03:00]
// The clock is set to a daytime hour so the screens show the day look even when run at night.
import { chromium } from "playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
const OUT = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith("--")) || "E:/AIBOMBA/6_YamPlata_v2/files/YAM-PLATA-media-kit");
const TIME = (process.argv.find(a => a.startsWith("--time=")) || "").slice(7) || null;
const SHOTS = path.join(OUT, "02-screenshots"), VID = path.join(OUT, "03-video");
await mkdir(SHOTS, { recursive: true }); await mkdir(VID, { recursive: true });
const VIEW = { width: 430, height: 932 };
const ctxOpts = { viewport: VIEW, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "he-IL", timezoneId: "Asia/Jerusalem", colorScheme: "dark" };
const browser = await chromium.launch();

async function open(ctx, beach, skip = true) {
  const page = await ctx.newPage();
  if (TIME) await page.clock.install({ time: new Date(TIME) });
  await page.goto(`https://yamplata.com/?b=${beach}`, { waitUntil: "networkidle" });
  if (skip) { await page.waitForTimeout(1200); await page.evaluate(() => { const i = document.getElementById("intro"); if (i && !i.hidden) i.click(); }); await page.waitForTimeout(3500); }
  return page;
}
// scroll so a card sits just under the top bar
const toCard = (page, title) => page.evaluate(t => {
  const el = [...document.querySelectorAll(".card, section")].find(e => e.offsetParent && (e.querySelector("h2,h3") || e).innerText.trim().startsWith(t));
  if (!el) return false; window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 16); return true;
}, title);

// ---------- screenshots ----------
if (!process.argv.includes("--video-only")) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await open(ctx, "telaviv");
  const shot = async name => { await page.waitForTimeout(900); await page.screenshot({ path: path.join(SHOTS, name) }); console.log("shot", name); };
  await shot("01-palata-index-tel-aviv.png");
  for (const [title, name] of [["נתונים נוכחיים", "02-current-conditions.png"], ["טמפ׳ המים", "03-water-temperature.png"], ["פירוט גלים", "04-wave-details.png"],
                               ["השבוע", "05-week-forecast.png"], ["חלון הפלטה", "06-palata-window.png"], ["העדפה אישית", "07-personal-preference.png"]]) {
    if (await toCard(page, title)) await shot(name); else console.log("missing card", title);
  }
  await page.close();
  for (const [b, name] of [["eilat", "08-eilat-red-sea.png"], ["haifa", "09-haifa.png"]]) { const p = await open(ctx, b); await p.waitForTimeout(800); await p.screenshot({ path: path.join(SHOTS, name) }); console.log("shot", name); await p.close(); }
  await ctx.close();
}

// ---------- demo video: intro film → index → hourly carousel → scroll through the cards → another beach ----------
{
  // Chrome's own screencast at device pixels (Playwright's recordVideo stays at CSS size): 432×936 CSS × 2.5 = 1080×2340.
  const ctx = await browser.newContext({ ...ctxOpts, viewport: { width: 432, height: 936 }, deviceScaleFactor: 2.5 });
  const FR = path.join(VID, "frames"); await rm(FR, { recursive: true, force: true }); await mkdir(FR, { recursive: true });
  const frames = [], writes = []; let cdp;
  ctx.on("page", async pg => {
    cdp = await ctx.newCDPSession(pg);
    cdp.on("Page.screencastFrame", f => { cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
      const file = path.join(FR, `f${String(frames.length).padStart(5, "0")}.jpg`); frames.push({ file, t: f.metadata.timestamp }); writes.push(writeFile(file, Buffer.from(f.data, "base64"))); });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 2340, everyNthFrame: 1 });
  });
  const page = await open(ctx, "telaviv", false);
  await page.waitForTimeout(4200);                                        // the brand intro film plays
  await page.evaluate(() => { const i = document.getElementById("intro"); if (i && !i.hidden) i.click(); });
  await page.waitForTimeout(3500);
  // hourly carousel: next day, then back
  for (const d of [1, 1, -1, -1]) { await page.evaluate(d => App.heroDayNav(d), d); await page.waitForTimeout(1300); }
  await page.evaluate(() => App.toggleJelly()); await page.waitForTimeout(2200); await page.evaluate(() => App.toggleJelly()); await page.waitForTimeout(800);
  const smooth = async (y, ms) => { await page.evaluate(([y, ms]) => new Promise(res => { const s = scrollY, t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; scrollTo(0, s + (y - s) * e); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }), [y, ms]); };
  const cardY = t => page.evaluate(t => { const el = [...document.querySelectorAll(".card, section")].find(e => e.offsetParent && (e.querySelector("h2,h3") || e).innerText.trim().startsWith(t)); return el ? el.getBoundingClientRect().top + scrollY - 16 : null; }, t);
  for (const t of ["נתונים נוכחיים", "טמפ׳ המים", "השבוע", "חלון הפלטה"]) { const y = await cardY(t); if (y != null) { await smooth(y, 1400); await page.waitForTimeout(1900); } }
  await smooth(0, 1600); await page.waitForTimeout(800);
  // another beach: the Red Sea
  await page.goto("https://yamplata.com/?b=eilat", { waitUntil: "networkidle" });
  await page.evaluate(() => { const i = document.getElementById("intro"); if (i && !i.hidden) i.click(); });
  await page.waitForTimeout(4200);
  await cdp.send("Page.stopScreencast").catch(() => {}); await Promise.all(writes); await ctx.close();
  // variable-rate frames (Chrome only sends a frame when something repaints) → constant 30 fps H.264
  const fwd = p => p.split(path.sep).join("/");
  const list = frames.map((f, i) => `file '${fwd(f.file)}'\nduration ${Math.max(0.001, (frames[i + 1] ? frames[i + 1].t : f.t + 1.5) - f.t).toFixed(4)}`).join("\n") + `\nfile '${fwd(frames.at(-1).file)}'\n`;
  await writeFile(path.join(FR, "list.txt"), list);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(FR, "list.txt"), "-vf", "scale=1080:2340:flags=lanczos,fps=30", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(VID, "yam-plata-app-demo.mp4")], { stdio: "inherit" });
  if (r.status) throw new Error("ffmpeg failed");
  await rm(FR, { recursive: true, force: true });
  console.log("video", frames.length, "frames");
}
await browser.close();
console.log("done", OUT);
