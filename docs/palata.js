// Palata Index — the ONE definition of the scoring math and the notification voice.
// Loaded by docs/index.html (browser global `Palata`) and by scripts/send-push.mjs
// (Node, via createRequire) — previously each carried its own copy and they had
// already drifted apart. Tune here, both channels follow.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Palata = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const KMH_PER_KNOT = 1.852;
  const toKnots = kmh => kmh == null ? null : kmh / KMH_PER_KNOT;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const pad = n => String(n).padStart(2, "0");

  // 4 weighted factors (0-100). Thresholds are the vision doc's draft assumptions —
  // named, easily-tunable curves rather than scattered magic numbers.
  const WEIGHTS = { height: 0.35, chop: 0.25, wind: 0.25, history: 0.15 };
  const HISTORY_HOURS = 10;   // trailing window for the "Wind History" factor (doc says 8-12h)

  const chopScoreFn = chop => chop == null ? .5 : clamp01(1 - Math.max(0, chop - 0.10) / 0.45);   // 0-0.10m excellent -> 0.55m+ ~0
  const windScoreFn = knots => knots == null ? .5 : clamp01(1 - knots / 14);                       // 0kt excellent -> 14kt+ ~0
  const heightScoreFn = h => h == null ? .5 : clamp01(1 - Math.max(0, h - 0.10) / 1.1);            // 0-0.10m glassy -> 1.2m+ ~0
  // Hard ceiling by total wave height: "palata" means a FLAT sea — real waves can never be
  // called palata no matter how calm the wind. Caps sit just under each tier's floor.
  const heightTierCap = h => h == null ? 100 : h > 0.35 ? 79 : h > 0.20 ? 89 : h > 0.10 ? 97 : 100;

  // Core score from raw factor values (waveHeight m, chop m, wind kt, windHistory kt).
  function scoreOf(waveHeight, chop, windKt, histKt) {
    const sum = heightScoreFn(waveHeight) * WEIGHTS.height + chopScoreFn(chop) * WEIGHTS.chop
      + windScoreFn(windKt) * WEIGHTS.wind + windScoreFn(histKt) * WEIGHTS.history;
    return Math.min(Math.round(clamp01(sum) * 100), heightTierCap(waveHeight));
  }

  const TIERS = [
    { min: 98, key: "deluxe", emoji: "🪞",  label: "פלטה דלוקס", short: "דלוקס", color: "#ffd479" },
    { min: 90, key: "palata", emoji: "🌊",  label: "ים פלטה",    short: "פלטה",  color: "#2dd4bf" },
    { min: 80, key: "almost", emoji: "🐢",  label: "כמעט פלטה",  short: "כמעט",  color: "#5ec9c2" },
    { min: 60, key: "gentle", emoji: "🏊",  label: "גלי עדין",   short: "עדין",  color: "#e9c46a" },
    { min: 40, key: "waves",  emoji: "🌬️", label: "יש גלים",    short: "גלים",  color: "#f0a55a" },
    { min: 20, key: "big",    emoji: "🏄",  label: "גל גדול",    short: "גדול",  color: "#ec7a5a" },
    { min: 0,  key: "stormy", emoji: "⛈️", label: "וואלאק סוער", short: "סוער",  color: "#f06a6a" },
  ];
  const CALM_MIN = 80;     // "כמעט פלטה" tier or better — the swim/notify bar everywhere
  const DELUXE_MIN = 98;

  // Notification copy in the app's voice: it URGES you to the water, it doesn't file a report.
  function notifyCopy(deluxe, beach, water, endHour, score) {
    const w = water != null ? ` · מים ${Math.round(water)}°` : "";
    const end = endHour != null ? ` · החלון עד ${pad(endHour)}:00` : "";
    const pool = deluxe ? [
      `הים חלק כמו מראה${w}. נדיר — רוץ 🪞`,
      `דלוקס אמיתי${w}${end}. שנייה לפני שכולם מגלים 🤫`,
      `זה היום שמחכים לו${w}. הכל שטוח, הכל שלך 💎`,
    ] : [
      `הים נרגע${w}${end}. עזוב הכל 🐢`,
      `פלטה עכשיו${w}. הים לא מחכה לנצח 🌊`,
      `מדד ${score != null ? (score / 10).toFixed(1) : "גבוה"}${w}${end}. סגור את המחשב ובוא 🏊`,
    ];
    return { title: deluxe ? `💎 פלטה דלוקס ב${beach}!` : `🌊 ים פלטה ב${beach}!`, body: pool[Math.floor(Math.random() * pool.length)] };
  }
  const eveningCopy = (beach, s, e) => ({
    title: `🌅 מחר פלטה ב${beach}`,
    body: `צפוי ים רגוע ${pad(s)}:00–${pad(e)}:00. כוון שעון, הים מחכה.`,
  });

  return {
    KMH_PER_KNOT, toKnots, clamp01,
    WEIGHTS, HISTORY_HOURS, chopScoreFn, windScoreFn, heightScoreFn, heightTierCap, scoreOf,
    TIERS, CALM_MIN, DELUXE_MIN,
    notifyCopy, eveningCopy,
  };
});
