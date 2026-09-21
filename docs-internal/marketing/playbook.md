# YAM PLATA marketing playbook (the agent's working memory)

Distilled from `docs-internal/codex-marketing-plan-2026-09-20.md` (Astra's full plan, 430 lines: read it for detail),
`docs-internal/codex-copy-deck-2026-09-20.md`, and owner decisions. Keep this file short and current.

## Brand in one breath
- **Product**: yamplata.com, Hebrew PWA. A 0–10 "Palata index" of how FLAT the sea is, per beach, hour by hour, a week ahead, with push alerts when it goes flat. For swimmers, snorkelers, SUP, parents, floaters. The opposite of a surf app.
- **Name**: always **YAM PLATA** in Latin letters, ים פלטה in Hebrew. Handle everywhere: **@yamplata** if free; on 2026-09-21 `@yamplata` was already taken on TikTok (a private person), so check every network first and pick ONE consistent fallback (e.g. `@yam.plata` or `@yamplata.app`) before opening any account.
- **Tagline (owner's, locked)**: הם מחפשים גלים. אנחנו מחפשים פלטה. פחות גלים. יותר ים.
- **Tiers**: פלטה דלוקס (≥9.8) · ים פלטה (≥9.0) · כמעט פלטה (≥8.0) · גלים קלים · יש גלים · גלים גדולים · וואלאק סוער. 8.0 is "the bar".
- **Voice rules** (Astra): פלטה היא הרצון, הנתונים מסבירים מתי · עוקצים גולשים בחיבה, בלי להבטיח חוף בלעדיהם · משפטים קצרים, עברית של חוף · מזמינים למים, לעולם לא מבטיחים בטיחות · מבדילים בין תחזית, מדידה וחוסר נתונים.
- **Mandatory line on every forecast asset**: "תחזית לשטיחות הים · מתעדכנת · אינה אישור בטיחות" + source + production time.

## Audiences (one line each)
שחיינים ומאסטרס (בוקר, קביעות) · שנורקלרים (אילת/סיני, שקיפות) · סאפ (רוח!) · הורים עם ילדים (בטיחות-רגש, שבת בבוקר) · שחייני חורף ותיקים · טריאתלטים (אימוני מים פתוחים) · תיירים (English pages /en/).

## Channels and cadence (zero budget)
| Channel | Role | Cadence |
|---|---|---|
| Instagram | showcase; daily story = the video, 2 Reels/wk | daily story, 3 posts/wk |
| TikTok | humor, surfer-teasing, 6–15 s | 2/wk |
| X | brand voice, build-in-public | 3/wk |
| Facebook page + groups (שחייה בים הפתוח, סאפ, שנירקול) | reach existing need; ask admins first | page 2/wk, groups ≤1 useful post/wk |
| Telegram channel | evening forecast service | 1 auto message/evening |
| WhatsApp communities | via admins | 1–2/wk |
| YouTube Shorts | recyclable library | 1–2/wk from week 3 |
| Partners: swim coaches, SUP rentals, beach kiosks (QR), lifeguard pages | trust & repeat use | pilots, one at a time |
| PR (tech/lifestyle) | human story: the anti-surf app | from week 3, 2 pitches/wk |
Never: Google Business profile for the app itself (not eligible); paid ads before organic signal.

## Content pillars
1. **מחר בבוקר: יש פלטה?** daily video (tools/video, regions israel/sinai/planet…). 2. **Best flat mornings this week** (weekly). 3. Surfer-teasing memes. 4. User photos with the camera stamp. 5. Education (why dawn is flat, swell vs wind waves, jellyfish). 6. **Beach of the week** (link to its SEO page). 7. **הכי פלטה בכדור הארץ** (planet edition) as a weekly curiosity.

## Production system (exists)
- `tools/video/render.mjs --region <israel|sinai|redsea|world|europe|caribbean|americas|asia|oceania|africa|mideast|planet> [--target now] [--preview]` → MP4 1080×1920 15 s + poster + board + caption.txt + json. Same data recipe as the app. README in tools/video.
- Publishing is **manual** for now (upload pack). Planned: Buffer free (3 channels). TikTok needs an approved provider or native upload. Direct APIs need app reviews; see Astra §4.
- Music: none by default; only original/licensed. TTS optional (ElevenLabs Hebrew, ~$6/mo).

## Measurement (exists)
GoatCounter `yuvartz.goatcounter.com`, events: launch, beach, camera, share, notifications, push-registered, maps-link, support-click. Use UTM: `utm_source=<channel>&utm_campaign=<name>&utm_content=<creative>` and keep `?b=<beach>`. KPIs: installs (push-registered as proxy), weekly actives, notification subscribers (Worker /health), shares, beach-page organic visits (Search Console once verified).

## Calendar awareness (Israel)
- Check the Hebrew calendar before scheduling: no posting on Yom Kippur; Shabbat and holiday evenings are low-value for "tomorrow" stories (owner decides); חול המועד סוכות/פסח and summer vacation are peak family-beach windows; Friday afternoon = weekend planners; Sinai stories fit Thursday/Friday.
- Links: `?b=<key>` only for beaches that exist as presets in the app (`pages !== false` in `scripts/lib/beaches.mjs`); for world/planet/extra beaches link to `https://yamplata.com/` (or `/en/`) with UTM only.

## Legal / honesty guardrails
- Open-Meteo free API is **non-commercial**: free app + donations OK; ads or paid tiers require the paid plan first.
- Never invent or round a score; never post a stale "tomorrow" after 06:00 of that day; never imply safety.
- Meta/TikTok/YouTube: unaudited apps post privately; music from in-app libraries is not a brand licence.
- Nothing is sent, posted or published by the agent without the owner's explicit OK in chat.

## Owner checklist status (update here)
- [ ] admin email + 2FA · [ ] @yamplata on IG/TikTok/X/YouTube/FB · [ ] FB page ↔ IG Business · [ ] Telegram channel · [ ] Buffer free connected · [ ] HTTPS media hosting for MP4s · [ ] Search Console verified · [ ] PayPal/BMC link for DONATE.url

## Decisions log
- 2026-09-20: `calendar.md` opened. No accounts yet → week 1 (20–26.9) is soft-launch prep, daily story rendered and **held**; Astra day 1 (soft launch) moves to Sun 27.9 (Chol HaMoed Sukkot), day 8 (public launch) to week 3. Erev Yom Kippur (20.9 evening) and Yom Kippur (21.9): nothing goes out even once accounts exist. First pack: `tools/video/out/pack-2026-09-21/`.

## Copy bank (short list; full 20+10 in Astra §6)
הם מחפשים גלים. אנחנו מחפשים פלטה. · פחות גלים. יותר ים. · הגלשן יכול לנוח. המשקפת פחות. · המגבת מוכנה. מה עם הים? · כמעט פלטה זה עדיין כמעט. אנחנו לא מעגלים בשביל הלייק. · יש גלים. יש גם מחר. · הקפה של הבוקר מחפש נוף שטוח. · אולי מחר המשקפת תקום לפניכם.
EN: They chase waves. We chase flat seas. · Fewer waves. More sea. · Almost flat means almost. · For swimmers, snorkelers, paddlers and professional floaters.
Hashtags HE: #ימפלטה #YamPlata #יםשטוח #פלטה #שחייהבים #סאפ #שנירקול #תחזיתים #חוףהים · EN: #flatsea #beachforecast #swim #snorkel #sup
