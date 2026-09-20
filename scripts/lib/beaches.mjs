// The canonical beach catalogue.
//   pages !== false → gets a static SEO page (docs/<slug>/) and exists as a preset in the app (same coords there).
//   pages: false    → video/story only for now (add to the app's PRESETS before enabling pages).
// Coordinates are the beach itself; the marine model snaps to its nearest sea cell (~9 km grid), so
// neighbours a few km apart often share a cell and show the same numbers. Order = north → south.
export const BEACHES = [
  // ---- Israel, Mediterranean ----
  { slug: "nahariya", key: "nahariya", name: "נהריה", en: "Nahariya", lat: 33.006, lon: 35.089, area: "צפון", region: "israel", pages: false },
  { slug: "akko", key: "akko", name: "עכו", en: "Akko (Acre)", lat: 32.9270, lon: 35.0690, area: "צפון", region: "israel" },
  { slug: "haifa", key: "haifa", name: "חיפה", en: "Haifa", lat: 32.8275, lon: 34.9897, area: "צפון", region: "israel" },
  { slug: "atlit", key: "atlit", name: "עתלית", en: "Atlit", lat: 32.700, lon: 34.930, area: "חוף הכרמל", region: "israel", pages: false },
  { slug: "dor", key: "dor", name: "דור (טנטורה)", en: "Dor Beach", lat: 32.615, lon: 34.915, area: "חוף הכרמל", region: "israel", pages: false },
  { slug: "caesarea", key: "caesarea", name: "קיסריה", en: "Caesarea", lat: 32.4860, lon: 34.8820, area: "חוף הכרמל", region: "israel" },
  { slug: "hadera", key: "hadera", name: "חדרה (גבעת אולגה)", en: "Hadera", lat: 32.430, lon: 34.870, area: "שרון", region: "israel", pages: false },
  { slug: "mikhmoret", key: "mikhmoret", name: "מכמורת", en: "Mikhmoret", lat: 32.400, lon: 34.865, area: "שרון", region: "israel", pages: false },
  { slug: "netanya", key: "netanya", name: "נתניה", en: "Netanya", lat: 32.3215, lon: 34.8532, area: "שרון", region: "israel" },
  { slug: "herzliya", key: "herzliya", name: "הרצליה", en: "Herzliya", lat: 32.1624, lon: 34.7990, area: "שרון", region: "israel" },
  { slug: "tel-aviv", key: "telaviv", name: "תל אביב", en: "Tel Aviv", lat: 32.0809, lon: 34.7610, area: "מרכז", region: "israel" },
  { slug: "bat-yam", key: "batyam", name: "בת ים", en: "Bat Yam", lat: 32.0170, lon: 34.7370, area: "מרכז", region: "israel" },
  { slug: "rishon", key: "rishon", name: "ראשון לציון", en: "Rishon LeZion", lat: 31.980, lon: 34.730, area: "מרכז", region: "israel", pages: false },
  { slug: "palmachim", key: "palmachim", name: "פלמחים", en: "Palmachim", lat: 31.930, lon: 34.700, area: "מרכז", region: "israel", pages: false },
  { slug: "ashdod", key: "ashdod", name: "אשדוד", en: "Ashdod", lat: 31.8044, lon: 34.6473, area: "דרום", region: "israel" },
  { slug: "nitzanim", key: "nitzanim", name: "ניצנים", en: "Nitzanim", lat: 31.730, lon: 34.600, area: "דרום", region: "israel", pages: false },
  { slug: "ashkelon", key: "ashkelon", name: "אשקלון", en: "Ashkelon", lat: 31.6699, lon: 34.5738, area: "דרום", region: "israel" },
  { slug: "zikim", key: "zikim", name: "זיקים", en: "Zikim", lat: 31.610, lon: 34.500, area: "דרום", region: "israel", pages: false },
  // ---- Red Sea: Eilat → Sinai, the classic road south (north → south) ----
  { slug: "eilat", key: "eilat", name: "אילת", en: "Eilat", lat: 29.48, lon: 34.93, area: "ים סוף", region: "redsea" },   // open water off the coral reserve; the city point has no marine data
  { slug: "coral-beach", key: "coralbeach", name: "חוף האלמוגים", en: "Coral Beach (Eilat)", lat: 29.505, lon: 34.920, area: "אילת", region: "sinai", pages: false },
  { slug: "taba", key: "taba", name: "טאבה", en: "Taba", lat: 29.492, lon: 34.898, area: "סיני", region: "sinai", pages: false },
  { slug: "bir-sweir", key: "birsweir", name: "ביר סוויר", en: "Bir Sweir", lat: 29.29, lon: 34.78, area: "סיני", region: "sinai", pages: false },
  { slug: "ras-shitan", key: "rasshitan", name: "ראס שיטאן", en: "Ras Shitan", lat: 29.13, lon: 34.70, area: "סיני", region: "sinai", pages: false },
  { slug: "nuweiba", key: "nuweiba", name: "נואיבה", en: "Nuweiba", lat: 29.0267, lon: 34.6650, area: "סיני", region: "sinai", pages: false },
  { slug: "ras-abu-galum", key: "rasabugalum", name: "ראס אבו גלום", en: "Ras Abu Galum", lat: 28.63, lon: 34.56, area: "סיני", region: "sinai", pages: false },
  { slug: "blue-hole", key: "bluehole", name: "הבלו הול", en: "Blue Hole (Dahab)", lat: 28.572, lon: 34.537, area: "סיני", region: "sinai", pages: false },
  { slug: "dahab", key: "dahab", name: "דהב", en: "Dahab", lat: 28.494, lon: 34.513, area: "סיני", region: "sinai", pages: false },
  { slug: "nabq", key: "nabq", name: "נבק", en: "Nabq", lat: 28.10, lon: 34.43, area: "סיני", region: "sinai", pages: false },
  { slug: "naama-bay", key: "naamabay", name: "מפרץ נעמה", en: "Naama Bay", lat: 27.915, lon: 34.330, area: "סיני", region: "sinai", pages: false },
  { slug: "sharm", key: "sharm", name: "שארם א-שייח׳", en: "Sharm El Sheikh", lat: 27.86, lon: 34.30, area: "סיני", region: "sinai", pages: false },
  // ---- World: famous beaches people know by name (scored in their own local morning) ----
  { slug: "bondi", key: "bondi", name: "בונדי, סידני", en: "Bondi Beach, Sydney", lat: -33.891, lon: 151.278, region: "world", pages: false },
  { slug: "waikiki", key: "waikiki", name: "וואיקיקי, הוואי", en: "Waikiki, Honolulu", lat: 21.276, lon: -157.827, region: "world", pages: false },
  { slug: "copacabana", key: "copacabana", name: "קופקבנה, ריו", en: "Copacabana, Rio", lat: -22.971, lon: -43.182, region: "world", pages: false },
  { slug: "south-beach", key: "southbeach", name: "סאות׳ ביץ׳, מיאמי", en: "South Beach, Miami", lat: 25.782, lon: -80.130, region: "world", pages: false },
  { slug: "cancun", key: "cancun", name: "קנקון", en: "Cancún", lat: 21.135, lon: -86.745, region: "world", pages: false },
  { slug: "malibu", key: "malibu", name: "מאליבו", en: "Malibu", lat: 34.035, lon: -118.690, region: "world", pages: false },
  { slug: "barceloneta", key: "barceloneta", name: "ברצלונטה, ברצלונה", en: "Barceloneta, Barcelona", lat: 41.378, lon: 2.192, region: "world", pages: false },
  { slug: "nice", key: "nice", name: "ניס", en: "Nice, Côte d'Azur", lat: 43.694, lon: 7.265, region: "world", pages: false },
  { slug: "santorini", key: "santorini", name: "סנטוריני", en: "Santorini", lat: 36.375, lon: 25.486, region: "world", pages: false },
  { slug: "mykonos", key: "mykonos", name: "מיקונוס", en: "Mykonos", lat: 37.414, lon: 25.344, region: "world", pages: false },
  { slug: "ibiza", key: "ibiza", name: "איביזה", en: "Ibiza", lat: 38.907, lon: 1.420, region: "world", pages: false },
  { slug: "jumeirah", key: "jumeirah", name: "ג׳ומיירה, דובאי", en: "Jumeirah, Dubai", lat: 25.200, lon: 55.235, region: "world", pages: false },
  { slug: "male", key: "male", name: "המלדיביים", en: "Maldives (Malé)", lat: 4.175, lon: 73.510, region: "world", pages: false },
  { slug: "patong", key: "patong", name: "פאטונג, פוקט", en: "Patong, Phuket", lat: 7.896, lon: 98.290, region: "world", pages: false },
  { slug: "kuta", key: "kuta", name: "קוטה, באלי", en: "Kuta, Bali", lat: -8.718, lon: 115.166, region: "world", pages: false },
  { slug: "boracay", key: "boracay", name: "בורקאי", en: "Boracay", lat: 11.963, lon: 121.924, region: "world", pages: false },
  { slug: "clifton", key: "clifton", name: "קליפטון, קייפטאון", en: "Clifton, Cape Town", lat: -33.940, lon: 18.372, region: "world", pages: false },
  { slug: "zanzibar", key: "zanzibar", name: "זנזיבר (נונגווי)", en: "Nungwi, Zanzibar", lat: -5.727, lon: 39.297, region: "world", pages: false },
];
export const REGIONS = {
  israel: { name: "חופי ישראל", nameEn: "Israel", timezone: "Asia/Jerusalem", order: "north" },
  redsea: { name: "אילת", nameEn: "Eilat", timezone: "Asia/Jerusalem", order: "north" },
  sinai: { name: "מאילת עד שארם", nameEn: "Eilat to Sharm", timezone: "Asia/Jerusalem", order: "north" },
  world: { name: "חופים מפורסמים בעולם", nameEn: "Famous beaches", timezone: "auto", order: "score" },
};
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
// Local wall clock at a beach from Open-Meteo's utc_offset_seconds (for timezone=auto requests).
export function localNowFromOffset(offsetSeconds) {
  const d = new Date(Date.now() + (offsetSeconds || 0) * 1000);
  return { dateStr: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
