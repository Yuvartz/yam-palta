// The canonical list of public beaches (static pages, video generator). The app keeps the same
// coordinates in its PRESETS — change both together.
export const BEACHES = [
  { slug: "tel-aviv", key: "telaviv", name: "תל אביב", en: "Tel Aviv", lat: 32.0809, lon: 34.7610, area: "מרכז", region: "israel" },
  { slug: "herzliya", key: "herzliya", name: "הרצליה", en: "Herzliya", lat: 32.1624, lon: 34.7990, area: "שרון", region: "israel" },
  { slug: "netanya", key: "netanya", name: "נתניה", en: "Netanya", lat: 32.3215, lon: 34.8532, area: "שרון", region: "israel" },
  { slug: "caesarea", key: "caesarea", name: "קיסריה", en: "Caesarea", lat: 32.4860, lon: 34.8820, area: "חוף הכרמל", region: "israel" },
  { slug: "haifa", key: "haifa", name: "חיפה", en: "Haifa", lat: 32.8275, lon: 34.9897, area: "צפון", region: "israel" },
  { slug: "akko", key: "akko", name: "עכו", en: "Akko (Acre)", lat: 32.9270, lon: 35.0690, area: "צפון", region: "israel" },
  { slug: "bat-yam", key: "batyam", name: "בת ים", en: "Bat Yam", lat: 32.0170, lon: 34.7370, area: "מרכז", region: "israel" },
  { slug: "ashdod", key: "ashdod", name: "אשדוד", en: "Ashdod", lat: 31.8044, lon: 34.6473, area: "דרום", region: "israel" },
  { slug: "ashkelon", key: "ashkelon", name: "אשקלון", en: "Ashkelon", lat: 31.6699, lon: 34.5738, area: "דרום", region: "israel" },
  { slug: "eilat", key: "eilat", name: "אילת", en: "Eilat", lat: 29.48, lon: 34.93, area: "ים סוף", region: "redsea" },   // open water off the coral reserve; the city point has no marine data
];
// English tier names (labels only; thresholds/colours come from palata.js).
export const TIER_EN = { deluxe: "Palata Deluxe", palata: "Flat Sea", almost: "Almost Flat", gentle: "Light Waves", waves: "Some Waves", big: "Big Waves", stormy: "Stormy" };
export const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const pad = n => String(n).padStart(2, "0");
export const dayName = ds => HE_DAYS[new Date(ds + "T12:00:00Z").getUTCDay()];
export const dayNameEn = ds => EN_DAYS[new Date(ds + "T12:00:00Z").getUTCDay()];
export const addDays = (ds, n) => { const d = new Date(ds + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Israel wall clock (the forecast is requested in Asia/Jerusalem, so date/hour strings compare directly).
export function israelNow() {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const [dateStr, hm] = s.split(" "); const [h, m] = hm.split(":").map(Number);
  return { dateStr, hour: h === 24 ? 0 : h, minute: m, text: `${dateStr.slice(8, 10)}.${dateStr.slice(5, 7)}.${dateStr.slice(0, 4)} ${pad(h === 24 ? 0 : h)}:${pad(m)}` };
}
