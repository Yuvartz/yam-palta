// Phone-sized screenshots of the live app for the /app/ landing page and schema.org "screenshot".
//   node tools/video/shot-app.mjs [url]   → docs/img/app-screenshot.jpg (+ -2 scrolled)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
const OUT = fileURLToPath(new URL("../../docs/img/", import.meta.url));
const url = process.argv[2] || "https://yamplata.com/?b=telaviv";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "he-IL", timezoneId: "Asia/Jerusalem", colorScheme: "dark" });
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => window.App && App.skipIntro && App.skipIntro());
await page.waitForTimeout(1500);
await page.evaluate(() => { const i = document.getElementById("intro"); if (i && !i.hidden) i.click(); });
await page.waitForTimeout(6000);
await page.screenshot({ path: OUT + "app-screenshot.jpg" });
await page.mouse.wheel(0, 760); await page.waitForTimeout(1200);
await page.screenshot({ path: OUT + "app-screenshot-2.jpg" });
await browser.close();
console.log("ok");
