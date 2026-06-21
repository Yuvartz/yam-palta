// Fetches the public jellyfish sighting list from meduzot.co.il, parses it,
// and writes docs/data/jellyfish.json (same-origin for the static app, no CORS).
// Run hourly by .github/workflows/jellyfish.yml. Data © meduzot.co.il (citizen science).

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";

const LIST_URL = "https://www.meduzot.co.il/list";
const OUT = "docs/data/jellyfish.json";
const MAX = 80;

// Beach-name -> coordinates lookup (substring match) so the app can do proximity alerts.
const BEACHES = [
  ["נהריה", 33.008, 35.090], ["עכו", 32.922, 35.068], ["קרית ים", 32.848, 35.070],
  ["בת גלים", 32.827, 34.987], ["חיפה", 32.830, 34.980], ["כרמל", 32.835, 34.956],
  ["עתלית", 32.703, 34.943], ["קיסריה", 32.500, 34.890], ["חדרה", 32.470, 34.880],
  ["אולגה", 32.450, 34.880], ["גדות", 32.450, 34.880], ["מכמורת", 32.408, 34.866],
  ["נתניה", 32.330, 34.853], ["בית ינאי", 32.387, 34.866], ["הרצליה", 32.166, 34.796],
  ["הרצלייה", 32.166, 34.796], ["תל אביב", 32.085, 34.766], ["תל-אביב", 32.085, 34.766],
  ["גורדון", 32.088, 34.767], ["פרישמן", 32.080, 34.766], ["בוגרשוב", 32.078, 34.764],
  ["הילטון", 32.090, 34.770], ["יפו", 32.053, 34.750], ["בת ים", 32.015, 34.743],
  ["ראשון", 31.973, 34.735], ["פלמחים", 31.930, 34.697], ["יבנה", 31.880, 34.690],
  ["אשדוד", 31.790, 34.630], ["ניצנים", 31.720, 34.590], ["אשקלון", 31.670, 34.556],
  ["זיקים", 31.610, 34.520], ["נוויבה", 29.027, 34.665], ["אילת", 29.550, 34.950],
];

function geocode(name) {
  if (!name) return [null, null];
  for (const [n, lat, lon] of BEACHES) if (name.includes(n)) return [lat, lon];
  return [null, null];
}

const decode = s => (s || "")
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const clean = s => decode(s).replace(/\s+/g, " ").trim();
const grab = (block, re) => { const m = block.match(re); return m ? clean(m[1]) : null; };

function toISO(dateText, time) {
  const d = (dateText || "").match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!d) return null;
  const t = (time || "").match(/(\d{1,2}):(\d{2})/);
  const pad = n => String(n).padStart(2, "0");
  return `${d[3]}-${pad(+d[2])}-${pad(+d[1])}T${t ? pad(+t[1]) + ":" + t[2] : "00:00"}`;
}

function parse(html) {
  const parts = html.split('class="list_obs').slice(1);
  const reports = [];
  for (const block of parts) {
    const id = grab(block, /data-link="\/observation\/(\d+)"/) || grab(block, /\/observation\/(\d+)/);
    const reporter = grab(block, /class="under red_text">([^<]+)<\/a>/);
    const dateText = grab(block, /(\d{1,2}\.\d{1,2}\.\d{4})/);
    const time = grab(block, /(\d{1,2}:\d{2})/);
    const location = grab(block, /class="under">\s*([^<]+?)\s*<\/a>/);
    const activity = grab(block, /class="d-inline-block[^"]*">\s*([^<]+?)\s*<\/span>/);
    const distance = grab(block, /מרחק מהחוף:\s*<\/span>\s*<span>\s*([^<]+?)\s*<\/span>/);
    const quantity = grab(block, /כמות:\s*<h2[^>]*>\s*([^<]+?)\s*<\/h2>/);
    const species = grab(block, /<div class="red_text">\s*([^<]+?)\s*<\/div>/);
    const diameter = grab(block, /קוטר בס["״']מ:\s*([^<\n]+)/);
    if (!location && !dateText) continue;
    const [lat, lon] = geocode(location);
    reports.push({
      id, reporter, location, lat, lon,
      date: toISO(dateText, time), dateText, time,
      activity, distance, quantity, species, diameter: diameter ? clean(diameter) : null,
      url: id ? `https://www.meduzot.co.il/observation/${id}` : "https://www.meduzot.co.il/list",
    });
    if (reports.length >= MAX) break;
  }
  return reports;
}

async function main() {
  const res = await fetch(LIST_URL, { headers: { "User-Agent": "yam-palata/1.0 (+github pages personal app)" } });
  if (!res.ok) throw new Error("fetch failed: " + res.status);
  const html = await res.text();
  const reports = parse(html);
  if (reports.length === 0) {
    // Don't overwrite good data with an empty parse (layout change / transient issue).
    if (existsSync(OUT)) { console.error("parsed 0 reports; keeping existing file"); return; }
  }
  mkdirSync("docs/data", { recursive: true });
  const out = { updated: new Date().toISOString(), source: "https://www.meduzot.co.il/list", count: reports.length, reports };
  // keep the timestamp stable if reports are unchanged, so we don't create noise commits
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, "utf8"));
      if (JSON.stringify(prev.reports) === JSON.stringify(reports)) { console.log("no change"); return; }
    } catch (e) {}
  }
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${reports.length} reports to ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
