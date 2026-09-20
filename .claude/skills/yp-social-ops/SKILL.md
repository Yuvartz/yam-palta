---
name: yp-social-ops
description: Produce the daily YAM PLATA story video and a ready-to-upload pack (MP4s, posters, per-channel captions, UTM links, posting times) without publishing anything.
---
# Daily story operations

Tooling: `tools/video/render.mjs` (see `tools/video/README.md`). Runs from `tools/video`; needs Playwright Chromium
(installed) and ffmpeg on PATH. Same forecast recipe as the app; never edit numbers after rendering.

## Standard daily run (Israel evening, 17:00–19:00 Israel time)
1. `node render.mjs --preview` → open `out/<date>-israel-tomorrow.poster.png` and `.board.png` with Read; check names, RTL, colours.
2. If the board is flat-monotone (all beaches same score), still render, but pick a second angle for the caption (education / meme / planet edition).
3. `node render.mjs` (full, ~90 s). Optional the same evening: `--region sinai` (Thu/Fri for weekend trips), `--region planet` (weekly curiosity), `--region europe|caribbean|…` for the English audience.
4. Build the pack: `out/pack-<date>/` containing the MP4s, posters and `POST.md` with, per channel:
   caption (from `caption.txt`, adapted by `yp-brand-voice`), hashtags, link with UTM (`utm_source=instagram|tiktok|x|facebook|telegram|whatsapp|youtube`, `utm_campaign=daily_story`, `utm_content=<region>`), suggested posting time, and `status: ready | needs-owner | skipped`.
5. Tell the owner what is in the pack. Do not upload, schedule or message anyone.

## Platform specs (current)
Vertical 1080×1920 H.264 30 fps, ≤ 15 s: Instagram Reels/Stories, TikTok, YouTube Shorts, Facebook Reels, X (video ≤ 2:20 ok). Cover = `.poster.png`. Keep the bottom 250 px and top 180 px free of key text (already in template). Add on-platform captions only in the post text; the video already burns its own labels.

## Freshness rules
- A "tomorrow" story must be posted before 06:00 Israel time of that day; otherwise re-render with `--target now` or skip.
- World editions: each beach is scored in its own local morning; say "לפי השעון המקומי".
- Never post a story whose `.json` shows `ranking` empty or a beach with `score: null` in the top three.

## When publishing gets automated (not yet)
Buffer free (3 channels) needs an HTTPS URL for each MP4 and OAuth connections done by the owner; TikTok needs an approved provider or native upload; unaudited Meta/YouTube apps post privately. Until then, the pack is the deliverable.
