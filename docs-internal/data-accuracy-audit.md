# Data accuracy audit — 2026-09-20 (build v33)

Question from the owner: are our numbers accurate, do we need another data source, and could a source
"always be right"? Short answer: no source is always right; a forecast is a forecast. What we CAN do is
(a) feed every surface the same, best inputs, (b) show measurements next to forecasts and label them,
(c) be honest about where the forecast point actually is, and (d) keep a record so the index can be
calibrated against reality over time. This pass did (a)–(c). (d) is the next step.

Inventory method: read-only code sweep (Explore agent, 37 tool calls) + live probes of Open-Meteo,
ISRAMAR and the marine grid. Formula (`Palata.scoreOf`, weights, caps, tiers) was NOT changed.

## Findings (before) → what changed (v33)

| # | Finding | Severity | Change |
|---|---|---|---|
| 1 | **Four different recipes** scored the same beach-hour: app (median MFWAM+ECMWF-WAM, wind median ECMWF-IFS+ICON), 🔥 weekly banner (`best_match` only), SEO beach pages (`best_match`, 4 days), push Worker (`best_match`, 3 days). A push could fire on a number the app never shows. | High | `Palata.RECIPE / recipeUrls / blendHourly / scoreSeries` added to `docs/palata.js`. The banner scan (`fetchSingle`), `scripts/build-beach-pages.mjs` and `workers/push/src/index.js fetchForecast` now all use it. Same models, same medians, same trailing-wind history. Tests: 10/10 (`workers/push/test`). |
| 2 | **SST from one hardcoded key** (`sea_surface_temperature_marine_best_match`); a rename would silently kill the water card and the notification copy. | Med | First `sea_surface_temperature*` column with real values is used; `blendHourly` does the same. |
| 3 | **UV labelled "ECMWF+ICON median" but 100 % GFS** (both trusted models return null UV on Open-Meteo). | Low | UV now uses all available models with no trusted-median claim. |
| 4 | **14 of 20 preset points are on land**; the marine API snaps to the nearest sea cell (grid ≈ 9 km). Tel Aviv + Bat Yam share one cell; Ashkelon snaps to Ashdod's row (14 km); Eilat/Taba snap to the same mid-gulf cell 22 km south; Chania 21 km. Moving points west does not help (probed 0/−0.03/−0.06/−0.09°: same cell or worse). | Med (honesty) | Marine cell distance is captured (`gridKm`) and the footer says "נקודת התחזית בים, כ-N ק״מ מהחוף" when ≥ 8 km. Coordinates left as they are, since no offset yields a better cell. |
| 5 | **Buoy shown up to 150 km away**, incl. sheltered Haifa Bay which the fetch script itself calls a bad anchor; hidden after 6 h while our GitHub mirror lags 2–5 h (free-tier cron throttling) → card flickered in and out. | Med | Reach 60 km (per-station `reachKm`), Haifa Bay excluded for the open-coast Hadera buoy, age limit 9 h with the age always printed. |
| 6 | Buoy freshness limited by GitHub Actions cadence. | Med | New Worker endpoint `GET /buoy?lat&lon` reads ISRAMAR directly with a 15-min edge cache and returns the nearest fresh station (Hadera; Shikmona/Haifa added, currently offline since 2026-01-09 and auto-appears when it returns). App tries the Worker first, falls back to `data/hadera-waves.json`. **Needs `npx wrangler deploy` by the owner** (production deploy permission). |
| 7 | Climatology "sea is to the west" nudge (−0.12° lon) applied to every lat ≥ 30.5, incl. Greek islands. | Low | Nudge limited to the Israeli Mediterranean box (31.2–33.3 N, 34.2–35.3 E). |
| 8 | `ewam` model ~26 % null → perturbs the min/max spread behind the confidence phrase. | Low | Not changed (spread is per-hour over models that have values). Candidate: drop `ewam` from the spread set. |
| 9 | Wind gusts never fetched; index uses 10 m sustained wind only. | Info | Unchanged on purpose (formula). Gusts could be *displayed* later. |
| 10 | `chop` (MFWAM wind-wave height) is ≤ 0.10 m for most Mediterranean hours → the 25 % chop factor rarely discriminates on our coast; the height cap is the binding constraint. | Info | Formula question for a later calibration round, not a bug. |
| 11 | Only Hadera publishes a wave JSON on ISRAMAR (Ashdod/Ashkelon/Haifa URLs probed: 404). Shikmona has one but is offline. | Info | See §sources. |

## Verified

- Worker tests 10/10 (incl. new `blendHourly` median/fallback and `recipeUrls` tests).
- Beach pages rebuilt with the shared recipe (10 he + 10 en + /en/), scores plausible (5.0–6.6).
- App in preview (v33): loads, no console errors except the expected 405 from the not-yet-deployed `/buoy`; buoy line falls back to the committed file ("מדידה אזורית: גל 0.7 מ׳ (לפני 3 שע׳, 45 ק״מ מכאן)").
- Live probe: marine grid cells for all 10 Israeli presets recorded above.

## Sources considered

| Source | What | Status / recommendation |
|---|---|---|
| Open-Meteo marine + forecast (current) | MFWAM, ECMWF-WAM, EWAM, GWAM; ECMWF-IFS, ICON, GFS | Keep. **Licence note (Codex):** the free API is for non-commercial use per Open-Meteo's terms; a free app with a donation link is fine, ads/paid tiers would require the paid API plan (~€29/month). |
| ISRAMAR Hadera buoy (current) | Hs, Tp, Hmax hourly | Keep; now proxied through the Worker for 15-min freshness. |
| ISRAMAR Shikmona buoy (new) | Hs, Tp; also wind/air on its page | Wired in; offline since January 2026. |
| CAMERI (Technion) buoys Haifa/Ashdod/Eilat | Wave measurements, public display | Not integrated: reuse rights and a machine-readable feed unverified. Owner could email CAMERI. |
| Israel Meteorological Service 10-min API | ~85 stations, wind speed/dir/gust, air temp | Good "measured wind" anchor for the 25 % wind factor. Needs a free API token by request from IMS (form on ims.gov.il). Recommended next integration once the token exists. |
| Copernicus Marine (CMEMS) Med-WAV | 1/24° Mediterranean wave analysis+forecast | Higher resolution than MFWAM near the coast, would help Eilat/Haifa Bay; requires an account and a small ingestion job. Candidate for a later phase. |
| Windy / Stormglass / Surfline | Aggregators, paid | No: they re-serve the same models; paying for them buys nothing new. |
| User reports (exists) + camera stamp | Ground truth at the waterline | Keep; label "דיווח קהילתי, לא אומת". |

## Next (recommended order)

1. Owner: `cd workers/push && npx wrangler deploy` → `/buoy` goes live; verify `curl ".../buoy?lat=32.08&lon=34.76"`.
2. **Forecast archive for calibration**: a small daily Action that stores the hour-by-hour forecast *as issued* per beach plus the Hadera measurement, so in a month we can say how often "כמעט פלטה+" was confirmed. Without this no formula tuning is defensible.
3. IMS token → "רוח נמדדת" line next to the forecast wind for the nearest coastal station.
4. Optional UI: show wave-height range across models ("לפי המודלים: 0.4–0.7 מ׳") instead of only a confidence phrase.
