---
name: yp-brand-voice
description: Write or review any YAM PLATA public copy (captions, hooks, bios, posts, replies, PR) in the anti-surf brand voice, in Hebrew or English, with the mandatory forecast disclaimer.
---
# YAM PLATA brand voice

Read `docs-internal/marketing/playbook.md` (voice rules, copy bank) and, for depth, section 6 of
`docs-internal/codex-marketing-plan-2026-09-20.md` and `docs-internal/codex-copy-deck-2026-09-20.md`.

## The five rules (Astra)
1. פלטה היא הרצון; הנתונים מסבירים מתי. The want is a flat sea; numbers only explain when.
2. עוקצים גולשים בחיבה, בלי להבטיח חוף בלעדיהם. Tease surfers fondly; never promise a beach without them.
3. משפטים קצרים. עברית שמדברים בחוף. Short sentences, beach Hebrew, no marketing-ese.
4. מזמינים למים; לעולם לא מבטיחים בטיחות. Invite to the water; never promise safety.
5. מבדילים בין תחזית, מדידה וחוסר נתונים. Forecast, measurement and missing data are three different words.

## Fixed elements
- Name: **YAM PLATA** / ים פלטה. Handle @yamplata. Tagline: הם מחפשים גלים. אנחנו מחפשים פלטה. פחות גלים. יותר ים.
- Tier names exactly as in `docs/palata.js` TIERS (פלטה דלוקס, ים פלטה, כמעט פלטה, גלים קלים, יש גלים, גלים גדולים, וואלאק סוער). 8.0 is the bar; "כמעט" stays "כמעט".
- Any post that shows a score, hour or beach carries: "תחזית לשטיחות הים · מתעדכנת · אינה אישור בטיחות" and the link `https://yamplata.com/?b=<key>&utm_source=<channel>&utm_campaign=<campaign>`.
- Numbers come from `render.mjs` output (`caption.txt`/`.json`) or the app. Never typed from memory, never rounded up.

## Per-format shape
- **Hook (≤ 8 words)** → **one concrete fact** (beach, hour, score, tier) → **one invitation** → disclaimer + link → hashtags (≤ 10 HE, ≤ 6 EN).
- Instagram/Facebook: 2–4 short lines, emoji sparingly (🌊 🐢 🪞 only). TikTok: on-screen text ≤ 6 words. X: ≤ 200 chars, no hashtags beyond #YamPlata. Telegram: plain, date + source line first.
- English: same rules; "flat sea", "Palata index"; never translate פלטה literally as "plate".

## Review checklist
Does it tease without contempt? Is every number traceable? Is the disclaimer present? Is the beach name spelled as in `scripts/lib/beaches.mjs`? Is the RTL/LTR mix readable (wrap Latin in its own line or `<bdi>`)? Would a lifeguard object?
