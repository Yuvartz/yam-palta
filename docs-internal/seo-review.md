# SEO / discovery review — 2026-09-20 (skill pack pass, build v30, LOCAL ONLY)

Scope: the six `yp-seo-*` / `yp-search-*` / `yp-structured-data` / `yp-social-sharing` skills
(installed 2026-09-20 under `.claude/skills/`, created=6, identical=0, conflict=0; the 12 UI/UX skills untouched).
Rules followed: no commit, no push, no deploy, no Search Console verification, no sitemap submission,
no indexing request, no analytics/tracking added or changed. Everything below is uncommitted in the working tree.

Note on the pack's premise: it was written against `https://yuvartz.github.io/yam-palta/`. Since 2026-09-20 the
app is served at the origin root of **https://yamplata.com/** (CNAME in `docs/`, old URL 301s). Therefore the
"`/yam-palta/` path must be preserved" rule no longer applies, and `docs/robots.txt` IS the origin-root robots.txt.

## Evidence classes

- **S** = source inspection (files in `docs/`, `scripts/`).
- **B** = rendered browser check (built-in browser, mobile emulation, http://localhost:5050 and the live domain earlier today).
- **E** = search-engine / third-party evidence. **None gathered** — no Search Console, no crawler-rendered fetch, no ranking data.
- **U** = unverified hypothesis.

## Inventory (before this pass)

| Item | Finding | Class |
|---|---|---|
| Public URLs | `/` (app), `/robots.txt`, `/sitemap.xml`, 10 beach pages `/<slug>/` (akko, ashdod, ashkelon, bat-yam, caesarea, eilat, haifa, herzliya, netanya, tel-aviv), `/og-image.png`, `/manifest.json` | S+B |
| `<title>` | 50 chars, generic "מתי הים באמת רגוע?" | S |
| meta description | ~190 chars (over the ~155 snippet budget) | S |
| Canonical | `https://yamplata.com/` present, absolute | S |
| OG / Twitter | og:title/description/image(1200×630)/url/locale/site_name, twitter summary_large_image; all absolute on yamplata.com | S |
| JSON-LD | one `WebApplication` block, valid | S |
| Headings in initial HTML | **no `<h1>`** before JS renders; hero verdict was an `<h1>` rendered by JS (content = tier label, changes hourly) | S+B |
| Static crawlable text | `#introText` paragraph + `<section id="about">` (H2 + H3s + 6-question FAQ `<dl>`) present in the initial HTML | S |
| Rendering dependency | Everything above the about section (score, forecast, week) is JS-rendered from Open-Meteo at runtime; crawlers without JS get intro + about + links | S |
| robots.txt | origin root, `Allow: /`, `Sitemap: https://yamplata.com/sitemap.xml`; HTTP 200 on live domain | S+B |
| sitemap.xml | 11 URLs, `lastmod` = build date (truthful: beach pages are rebuilt every 3 h by the Action) | S |
| Beach pages | title/description/canonical/OG/`WebPage`+`Beach` JSON-LD, 3-day table, links; **no twitter card, no breadcrumb** | S |
| Internal links | app → 10 beach pages (about section) ; beach page → app + all other beaches | S |
| Sharing UX | Web Share / copy link / WhatsApp / QR with `?b=<slug>` deep-link; og-image is a single static brand image (no per-beach preview image) | S+B |
| Measurement | GoatCounter already active (`ANALYTICS.code="yuvartz"`) with custom events; no Search Console property | S |

## Changes made (all local, reversible, no behaviour/formula change)

### 01 Technical
- `docs/index.html`: meta description shortened to 120 chars; title rewritten (40 chars). Canonical/robots/sitemap unchanged (already correct at origin root).
- Build bumped **v29 → v30** (`BUILD`, `palata.js?v=30`, `sw.js VERSION`) so the copy changes actually reach installed PWAs when published.

### 02 JavaScript & discoverability
- The about heading is now the page's single static `<h1>` (present in initial HTML, stable text). The JS-rendered hero verdict became `<h2 class="hero-verdict">`; all `.hero h1` selectors renamed, so the look is pixel-identical. Verified in browser: exactly 1 `<h1>`, verdict color/animation unchanged.
- `#introText` static paragraph kept (removed by JS after render, as before).

### 03 Content & intent
- Title/description/intro/about now state the actual intent ("ים שטוח", "בלי גלים", swimming/snorkel/SUP) instead of a generic "מתי הים רגוע". FAQ answers tightened (Codex copy deck), no keyword stuffing, no article above the fold.
- Beach pages: title `מצב הים ב<חוף> היום — יש פלטה? מדד X | ים פלטה` (50 chars), H1 `הים ב<חוף> היום: מחכים לפלטה?` + one-line sub, description 155 chars, about paragraph rewritten and now honest that it is a forecast (buoy mention kept only where the app really shows it — centre coast). 10 pages + sitemap regenerated locally with the new template.

### 04 Structured data
- Added `FAQPage` JSON-LD to `index.html`, generated from the *visible* FAQ `<dl>` (6 Q/A, text identical after tag stripping). Validated as JSON; both blocks parse.
- Beach pages: added `BreadcrumbList` (ים פלטה › חוף). `WebPage`/`Beach` kept.
- Not added: `Event`/`Rating`/`Review`/`Dataset` — not supported by the visible page; `WebApplication.aggregateRating` deliberately absent.

### 05 Social sharing
- New og:title "ים פלטה — פחות גלים. יותר ים." + og/twitter descriptions in the brand voice.
- Beach pages: added `twitter:card/title/description/image`, `og:image:width/height`, `og:site_name`.
- Share/WhatsApp/QR flows unchanged (verified earlier today on device). Copy-link toast reworded.

### 06 Measurement
- No new collection. GoatCounter stays as is. Search Console remains an owner action (below).

### Copy (Codex "אסטרא" deck, filed in `codex-copy-deck-2026-09-20.md`)
- Tier labels: `גלי עדין → גלים קלים`, `גל גדול → גלים גדולים` (labels only; thresholds/colors/formula untouched — `git diff docs/palata.js` shows no numeric change).
- Hero subtitles, confidence phrases, notification pool/titles/evening copy (all variants now include the window end — Worker policy test that asserts it passes: 8/8), install/share/camera/feedback/support micro-copy, manifest description, README opening.

## Verified

- Browser (mobile emulation, localhost:5050, SW v30 active): title, `<h1>` count = 1, verdict "גלים קלים" in tier color, new subtitle + confidence line, notify help, feedback prompt, about section styling, beach page `/tel-aviv/` with breadcrumb and new H1. No console errors.
- `workers/push` tests: 8 pass, 0 fail.
- Leftover string scan: 0 hits for the old phrases.

## Not verified / open

- **E**: nothing about indexing, ranking, rich-result eligibility or social-cache state. Local files have not reached Google or the WhatsApp/Facebook preview caches; they only will after a commit + push + cache refresh.
- Rich Results / Schema validator not run (would require uploading the page to a third-party tool — skipped under the "no external submission" rule; the owner can paste the live URL after publishing).
- Per-beach OG images (would need `scripts/build-og-image.py` per slug; deferred, marginal).
- English pages (`/en/`) for the en-speaking audience — separate proposal.
- `BreadcrumbList` on the app root is intentionally absent (single page).

## Owner actions (not done by Claude, by design)

1. Approve brand copy: tagline **"הם מחפשים גלים. אנחנו מחפשים פלטה."**, tier renames above, og:title "פחות גלים. יותר ים.".
2. Then: `git add -A && git commit && git pull --rebase && git push` (verify with `curl -s https://yamplata.com/sw.js | grep VERSION` → v30).
3. Google Search Console: add property `yamplata.com` (DNS TXT via Cloudflare), submit `https://yamplata.com/sitemap.xml`, "Request indexing" for `/` and 2–3 beach pages. Steps in `launch-steps.md` §5.
4. After publish: paste `https://yamplata.com/` into Google's Rich Results Test and Facebook Sharing Debugger / WhatsApp to refresh the preview cache.
5. Optional: Bing Webmaster Tools import from Search Console.
