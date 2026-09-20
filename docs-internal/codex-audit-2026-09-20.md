# PART A

Read-only audit of current files; recorded fixes excluded. JavaScript parsing and isolated scoring/notification probes completed. Live-site access failed, so device behavior and Pages settings remain unverified.

| Severity | File:Line | Why | Fix |
|---|---|---|---|
| **P1** | `.github/workflows/buoy.yml:21–35`; `.github/workflows/jellyfish.yml:20–34` | Default-token pushes do **not** trigger Pages builds; repository feeds can advance without publication. [GitHub confirmation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site). | Explicitly deploy the updated artifact; monitor published feed timestamps. |
| **P1** | `docs/index.html:2612–2623,2832` | Hourly ticks bypass the load-time stale guard. Probe confirmed a notification with `dataStale=true`. | Enforce freshness inside `maybeNotify()`, including failed-refresh age. |
| **P1 before push activation** | `SETUP-PUSH.md:19–29` | “Anyone with the link” exposes subscription endpoints, keys and coordinates without authentication. | Use private Sheets access or an authenticated subscription store. |
| **P2** | `docs/palata.js:38–44`; `docs/index.html:1036–1042` | Negative inputs scored 100; invalid secondary factors produced `NaN`. Browser scoring duplicates validation. | Validate finite, nonnegative inputs; delegate browser scoring to `scoreOf()`. |
| **P2** | `docs/index.html:986–989,1125,1176` | Foreign/custom beaches silently use Israel time; DST differences can mislead planning. | Label the timezone explicitly or use beach-local zones with UTC timestamps. |
| **P2** | `docs/index.html:2587–2596`; `scripts/send-push.mjs:95–118,136–155` | A→B→A selection suppresses the final subscription update; reruns can duplicate notifications; expired endpoints persist. | Upsert current preferences, persist delivery keys, remove 404/410 subscriptions, provide unsubscribe. |
| **P2** | `scripts/send-push.mjs:58–75,143–149` | Push uses different models/daylight rules and opens the homepage rather than its beach. | Share forecast/daylight logic; include a beach deep link. |
| **P2** | `docs/index.html:684,768,2232–2245,2644` | Duplicate `intro` IDs target the explanation paragraph instead of the film. Separate from the fixed hidden-CSS bug. | Give both unique IDs; update removal/skip selectors; capture deep-link status before clearing it. |
| **P2** | `docs/index.html:1370–1372,2404–2411` | Score’s accessible name omits its number; stamp positioning requires dragging. | Announce score/tier; add keyboard-accessible position presets. |
| **P2** | `docs/sw.js:32–41,109–129` | Fresh HTML can combine with cached scoring JS; activation deletes offline API/font caches. | Version coupled assets; retain compatible data caches; offer controlled reload. |
| **P2** | `docs/index.html:1854–1855,2595–2596` | Opaque Forms responses cannot prove acceptance, yet submissions become “done.” | Use acknowledged submissions or honest “sent, unverified” status with retry. |
| **P2** | `README.md:68–69`; `docs/index.html:654,1125–1130,2714` | “Everything local” misstates third-party transfers; inline handlers impede strict CSP. | Disclose coordinate/form recipients in-app; replace handlers and add hash-based script CSP plus connection allowlists. |
| **P2** | `docs/index.html:54,769,1132,2095`; `docs/sw.js:23–25` | Font stylesheet, eager video and concurrent scans add load; requests lack deadlines; icons preload. | Self-host subset fonts, lazy-load video, limit scans, add timeouts, optimize PNGs. |
| **P3** | `docs/index.html:700–730` | Planning is buried beneath detailed measurements. | Move the next useful window directly below the verdict. |
| **P3** | `docs/index.html:2205,2222–2225,2520–2528` | Track is dormant; installed sessions never increment the visit counter, distorting return cohorts. | Count launches independently of installation UI; verify events before activation. |
| **P3** | `docs/robots.txt:1–3`; `docs/sitemap.xml:3` | Project-subdirectory robots.txt is not authoritative. [Google specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec). | Submit sitemap directly; serve robots.txt at the custom-domain root. |

Top-10 roadmap:

1. Make feed publication explicit.
2. Block stale notifications centrally.
3. Privatize subscription storage.
4. Validate and unify scoring.
5. Repair subscription synchronization and delivery deduplication.
6. Fix intro identity and deep-link handling.
7. Make shell updates coherent.
8. Improve accessibility, planning hierarchy and timezone labels.
9. Reduce loading costs; test iOS/Android install, offline/update, RTL and reduced-motion journeys.
10. Validate Forms, analytics, privacy disclosures and search launch.

# PART B

Assume the project itself moves to `https://yamplata.com/`, retaining `docs/` as the publishing directory.

| File:Line | Current value | Change needed |
|---|---|---|
| `docs/index.html:9,17,27` | Canonical, OG URL, JSON-LD URL: old site | Replace with new HTTPS root. |
| `docs/index.html:18,25` | Absolute OG/Twitter image URLs | New origin plus `/og-image.png`. |
| `docs/index.html:2181–2184,2198` | `shareUrl()` derives current URL; history retains pathname | Already adaptive; verify root, `index.html` and `?b=` entry points. |
| `docs/index.html:2383` | Camera text `yuvartz.github.io/yam-palta` | Replace stamp text. |
| `docs/index.html:30–50,651,769–771,801,948,1862,1876,2442,2604,2824` | Relative manifest/icons/splash/video/JS/art/data/SW | Keep relative; preserve directory layout and trailing-slash entry. Registration becomes root-scoped. |
| `docs/manifest.json:2,8–9,15–18` | `id:"./"`; start/scope `"."`; relative icons | Start/scope adapt. **ID resolves against origin**, currently `https://yuvartz.github.io/`; choose stable new-origin ID. [Resolution rules](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id). |
| `docs/sw.js:14–25,54,112–117,125–138,152–176` | Versioned caches, relative shell/fallback/icons/click URLs, same-origin data matching | No hard-coded project prefix. Bump version; constrain clicked clients/targets to the new registration scope. |
| `docs/robots.txt:3`; `docs/sitemap.xml:3` | Old sitemap/home URLs | Replace origin and remove project prefix. |
| `scripts/send-push.mjs:20,143,149` | `APP_URL`, notification targets | New root plus beach query. VAPID contact at line 90 need not change. |
| `scripts/build-og-image.py:68–70` | Old URL baked into PNG | Change text and regenerate `docs/og-image.png`. |
| `scripts/gen-tier-art.py:19–29`; `scripts/build-app-icons.py:15–66` | Tier/brand/icon/splash outputs | Inspected tiers/logo/badge contain no URL; derived icons/splashes need no domain edit. |
| `README.md:6`; `EMAIL-beachcam.md:11`; `docs-internal/analytics-setup.md:9` | Site links; GoatCounter domain | Update links and analytics domain configuration. |
| `SETUP-PUSH.md:26,43–58` | External Google endpoints; setup instructions | No old-origin literal; document new-site enrollment/testing. |
| `.github/workflows/buoy.yml:26–35`; `.github/workflows/jellyfish.yml:25–34`; `.github/workflows/push-notify.yml:25–30` | Repository paths/secrets | No domain literals; preserve paths and deploy `docs/`. |
| `.claude/skills/yp-mobile-pwa/SKILL.md:9`; `.claude/launch.json:5` | Subpath requirement; project label | Update deployment guidance; label is harmless. |
| `docs/index.html:52–54,706,751,838,1126–1130,1179–1180,1318,1816–1819,1915,1941,1958,2212,2714` | External fonts/APIs/Forms/attribution/analytics | Keep external URLs; review origin restrictions. |

1. Prepare changes and an old-origin migration notice first. Announce reinstall/re-enrollment; offer preference export. New origin means separate storage, permissions, SW and install identity. Scope-only changes do not necessarily change manifest identity. Existing push subscriptions remain attached to old workers; they do not transfer. [Push lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
2. Verify domain ownership. In repository **Settings → Pages**, confirm branch `/docs`, then save the custom hostname. Ensure `docs/CNAME` contains only `yamplata.com`. Custom Actions publishing instead uses the Pages setting and ignores CNAME. [GitHub setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
3. Configure apex A records: `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`; AAAA: `2606:50c0:8000::153` through `8003::153`. Point `www`—or the chosen subdomain—CNAME to `yuvartz.github.io`, without repository path. Wait for DNS/certificate issuance; enable **Enforce HTTPS**. [DNS values](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#dns-records-for-your-custom-domain).
4. **Yes, Pages redirects the old project URL to its configured custom-domain root**, removing the project prefix; this requires Pages configuration/deployment, not DNS alone. Verified against [Bootstrap’s project URL](https://twbs.github.io/bootstrap/). An account-level domain instead retains project subpaths. Test this site’s redirect chain, suffixes and query preservation after cutover; cached/offline PWAs may bypass server redirects.
5. Verify assets, metadata, feeds, new installs and push; submit the new sitemap, then retire old subscriptions after a migration window.

Codex session ID: 01a0be01-b17f-7e32-a2bc-5bf367887b7b
Resume in Codex: codex resume 01a0be01-b17f-7e32-a2bc-5bf367887b7b
