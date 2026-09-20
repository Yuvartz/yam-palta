# YAM PLATA story generator

Renders the daily vertical video ("מחר בבוקר: יש פלטה?") from the live forecast, using the exact same
recipe as the app (`Palata.recipeUrls / blendHourly / scoreSeries`). Output per run:

- `out/<date>-<region>-<target>.mp4` — 1080×1920, H.264, 30 fps, 12 s (no audio)
- `out/….poster.png` — cover frame (the three-beach scene)
- `out/….caption.txt` — Hebrew caption + hashtags + deep link with UTM
- `out/….json` — the data used (for audit) and the full beach ranking

## Setup (once)

```bash
cd tools/video
npm install
npx playwright install chromium
```

ffmpeg must be on PATH (`ffmpeg -version`).

## Run

```bash
node render.mjs                     # tomorrow morning (06–11), Israel Med beaches, top 3
node render.mjs --target now        # what is flat right now
node render.mjs --region redsea     # Eilat
node render.mjs --duration 15       # 6 / 12 / 15 s scripts
node render.mjs --preview           # poster PNG only, ~5 s — check data and layout first
```

## How it works

`template.html` is a 1080×1920 page with four scenes (title → three beaches → hour bars of the flattest
beach → tagline). Nothing is CSS-animated: `render(data)` fills the DOM once and `seek(t)` positions every
element for time `t`, so each frame is deterministic. `render.mjs` fetches the forecast, picks the story,
screenshots 360 frames with Playwright Chromium and encodes them with ffmpeg.

Rules baked in (from the Codex marketing plan): every frame carries "תחזית לשטיחות הים, לא אישור בטיחות",
the source and the production time; no score is shown without valid wave height and wind; the video is
never posted late (re-render instead of publishing a stale "tomorrow").

## Not yet

Publishing. The plan is Buffer (free tier, 3 channels) with a public HTTPS URL for the MP4, or manual upload.
TikTok direct posting needs an approved provider; see `docs-internal/codex-marketing-plan-2026-09-20.md` §4.
