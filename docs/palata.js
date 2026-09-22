// Palata Index — the ONE definition of the scoring math and the notification voice.
// Loaded by docs/index.html (browser global `Palata`) and by workers/push (the Cloudflare
// Worker that sends background push) — previously each carried its own copy and they had
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
  // Missing height caps below the calm bar too: we won't declare a sea swim-flat without
  // actually knowing the wave height (wind+chop alone could otherwise reach 83).
  // Extended down the scale too: a 2 m smooth swell with no wind used to score 65 ("גלי עדין") —
  // real waves can never be called gentle just because the air is still.
  const heightTierCap = h => h == null ? 79
    : h > 2.2 ? 19 : h > 1.5 ? 29 : h > 1.0 ? 39 : h > 0.7 ? 59
    : h > 0.35 ? 79 : h > 0.20 ? 89 : h > 0.10 ? 97 : 100;

  // Core score from raw factor values (waveHeight m, chop m, wind kt, windHistory kt).
  // Returns null (no verdict) when wave height or current wind is unknown — a missing factor used
  // to score as a neutral 0.5, which let "no data" reach כמעט פלטה and fire notifications.
  // Missing chop falls back to total height; missing history falls back to the current wind.
  function scoreOf(waveHeight, chop, windKt, histKt) {
    if (waveHeight == null || windKt == null || !isFinite(waveHeight) || !isFinite(windKt) || waveHeight < 0 || windKt < 0) return null;
    // Secondary factors: a missing OR invalid value falls back rather than poisoning the sum with NaN
    if (chop == null || !isFinite(chop) || chop < 0) chop = waveHeight;
    if (histKt == null || !isFinite(histKt) || histKt < 0) histKt = windKt;
    const sum = heightScoreFn(waveHeight) * WEIGHTS.height + chopScoreFn(chop) * WEIGHTS.chop
      + windScoreFn(windKt) * WEIGHTS.wind + windScoreFn(histKt) * WEIGHTS.history;
    return Math.min(Math.round(clamp01(sum) * 100), heightTierCap(waveHeight));
  }

  const TIERS = [
    { min: 98, key: "deluxe", emoji: "🪞",  label: "פלטה דלוקס", short: "דלוקס", color: "#ffd479" },
    { min: 90, key: "palata", emoji: "🌊",  label: "ים פלטה",    short: "פלטה",  color: "#2dd4bf" },
    { min: 80, key: "almost", emoji: "🐢",  label: "כמעט פלטה",  short: "כמעט",  color: "#8ee3c8" },
    { min: 60, key: "gentle", emoji: "🏊",  label: "גלים קלים",  short: "קלים",  color: "#e9c46a" },
    { min: 40, key: "waves",  emoji: "🌬️", label: "יש גלים",    short: "גלים",  color: "#f0a55a" },
    { min: 20, key: "big",    emoji: "🏄",  label: "גלים גדולים", short: "גדולים",  color: "#ec7a5a" },
    { min: 0,  key: "stormy", emoji: "⛈️", label: "וואלאק סוער", short: "סוער",  color: "#f06a6a" },
  ];
  const CALM_MIN = 80;     // "כמעט פלטה" tier or better — the swim/notify bar everywhere
  const DELUXE_MIN = 98;

  // Notification copy in the app's voice: it URGES you to the water, it doesn't file a report.
  function notifyCopy(deluxe, beach, water, endHour, score) {
    const w = water != null ? ` · מים ${Math.round(water)}°` : "";
    const end = endHour != null ? ` · החלון עד ${pad(endHour)}:00` : "";
    // Voice: the anti-surf app — inviting, cheeky about surfers, never a safety promise.
    const pool = deluxe ? [
      `ב${beach} התחזית: ים מראה${w}${end}. הגלשן נח, המשקפת מתעוררת`,
      `ב${beach} פלטה דלוקס${w}${end}. הקפה יכול לבוא בכוס לדרך`,
      `ב${beach} הים כמעט שכח לעשות גלים${w}${end}. אנחנו לא מתלוננים`,
    ] : [
      `ב${beach} הים נרגע${w}${end}. המשקפת כבר בתיק?`,
      `ב${beach} מתקרבים לפלטה${w}${end}. זמן למצוא את המגבת`,
      `ב${beach} פחות גלים, יותר חשק לים${w}${end}. באים?`,
    ];
    // Honest tiering: 80-89 is "כמעט פלטה", not full palata — the title says which one it is.
    const title = deluxe ? `${beach}: פלטה דלוקס`
      : (score != null && score < 90) ? `${beach}: כמעט פלטה` : `${beach}: ים פלטה`;
    return { title, body: pool[Math.floor(Math.random() * pool.length)] };
  }
  const eveningCopy = (beach, s, e) => ({
    title: `${beach}: מחר בבוקר?`,
    body: `ב${beach} צפוי ים רגוע ⁦${pad(s)}:00–${pad(e)}:00⁩. נכין מגבת לבוקר?`,   // LRI…PDI: the range stays LTR inside RTL notification text
  });

  // ---------- Forecast recipe (shared by the app's scan, the SEO beach pages and the push Worker) ----------
  // One definition of WHICH models feed the index, so every surface scores the same inputs:
  //   wave height  = median(Météo-France MFWAM, ECMWF-WAM)      wind waves = MFWAM (ECMWF has no partition)
  //   wind 10 m    = median(ECMWF-IFS 0.25°, DWD ICON)          SST        = Open-Meteo best_match (the only model publishing it)
  // The formula itself (scoreOf) is untouched; this only fixes the inputs and the trailing wind history.
  const RECIPE = { waveModels: ["meteofrance_wave", "ecmwf_wam"], partModel: "meteofrance_wave", windModels: ["ecmwf_ifs025", "icon_seamless"] };
  // Numbers only: the global isFinite() accepts "0.6", and ("0.4"+"0.6")/2 silently produces nonsense.
  const numOrNull = v => { const n = typeof v === "number" ? v : NaN; return Number.isFinite(n) ? n : null; };
  const median = vals => { const a = (vals || []).map(numOrNull).filter(v => v !== null).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  function recipeUrls(lat, lon, opts) {
    const o = opts || {}, fd = o.forecastDays || 7, pd = o.pastDays == null ? 1 : o.pastDays, tz = encodeURIComponent(o.timezone || "Asia/Jerusalem");   // "auto" = the beach's own clock
    const common = `latitude=${lat}&longitude=${lon}&timezone=${tz}&forecast_days=${fd}&past_days=${pd}`;
    return {
      marine: `https://marine-api.open-meteo.com/v1/marine?${common}&hourly=wave_height,wind_wave_height,sea_surface_temperature&models=best_match,${RECIPE.waveModels.join(",")}`,
      weather: `https://api.open-meteo.com/v1/forecast?${common}&hourly=wind_speed_10m&models=${RECIPE.windModels.join(",")}`,
      sun: `https://api.open-meteo.com/v1/forecast?${common}&daily=sunrise,sunset`,
    };
  }
  // First hourly column whose name starts with `base` and that has at least one real value — keys are
  // suffixed per model (`wave_height_ecmwf_wam`, `sea_surface_temperature_marine_best_match`…).
  const colsFor = (hourly, base, models) => models.map(m => (Object.prototype.hasOwnProperty.call(hourly, `${base}_${m}`) ? hourly[`${base}_${m}`] : null)).filter(Array.isArray);
  const allCols = (hourly, base) => Object.keys(hourly).filter(k => k === base || k.indexOf(base + "_") === 0).map(k => hourly[k]).filter(Array.isArray);
  const anyCol = (hourly, base) => allCols(hourly, base).find(c => c.some(v => numOrNull(v) !== null)) || null;
  // marine/weather = raw Open-Meteo JSON from recipeUrls(). Returns plain hours with the four scoring inputs
  // + seaTemp, plus `grid` = the sea cell the marine model actually used (the coast point is often land).
  function blendHourly(marine, weather) {
    const mh = marine && marine.hourly, wh = weather && weather.hourly;
    if (!mh || !wh || !Array.isArray(mh.time) || !Array.isArray(wh.time)) throw new Error("open-meteo payload malformed");
    const waveCols = colsFor(mh, "wave_height", RECIPE.waveModels), waveFb = allCols(mh, "wave_height");
    const partCols = colsFor(mh, "wind_wave_height", [RECIPE.partModel]), partFb = allCols(mh, "wind_wave_height");
    const sst = anyCol(mh, "sea_surface_temperature") || [];
    const windCols = colsFor(wh, "wind_speed_10m", RECIPE.windModels), windFb = allCols(wh, "wind_speed_10m");
    const wIdx = {}; wh.time.forEach((t, i) => { wIdx[t] = i; });
    // trusted median for that hour; if none of the trusted models has a value, the median of whatever models do
    const pick = (cols, fb, i) => { const v = median(cols.map(c => c[i])); return v != null ? v : median(fb.map(c => c[i])); };
    const hours = mh.time.map((t, i) => { const j = wIdx[t]; return {
      time: t, dateStr: t.slice(0, 10), hour: parseInt(t.slice(11, 13), 10),
      waveHeight: pick(waveCols, waveFb, i), windWave: pick(partCols, partFb, i), seaTemp: numOrNull(sst[i]),
      windKmh: j == null ? null : pick(windCols, windFb, j),
    }; });
    return { hours, grid: { lat: marine.latitude, lon: marine.longitude }, timezone: marine.timezone || null, utcOffsetSeconds: marine.utc_offset_seconds == null ? null : marine.utc_offset_seconds };
  }
  // Attach `score` to each hour: wind history = trailing HISTORY_HOURS mean, chop = wind waves (or total height).
  function scoreSeries(hours) {
    const H = HISTORY_HOURS;
    hours.forEach((h, i) => {
      const wind = toKnots(h.windKmh);
      const sl = hours.slice(Math.max(0, i - (H - 1)), i + 1).map(x => x.windKmh).filter(v => v != null);
      const hist = sl.length ? toKnots(sl.reduce((a, b) => a + b, 0) / sl.length) : wind;
      h.score = scoreOf(h.waveHeight, h.windWave != null ? h.windWave : h.waveHeight, wind, hist);
    });
    return hours;
  }

  return {
    KMH_PER_KNOT, toKnots, clamp01,
    WEIGHTS, HISTORY_HOURS, chopScoreFn, windScoreFn, heightScoreFn, heightTierCap, scoreOf,
    TIERS, CALM_MIN, DELUXE_MIN,
    notifyCopy, eveningCopy,
    RECIPE, median, recipeUrls, blendHourly, scoreSeries,
    SENT_KEEP_HINT: 40,   // how many notification ids a subscriber keeps (mirrors SENT_KEEP in the push policy)
  };
});
