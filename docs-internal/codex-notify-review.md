## 1. Current-state assessment

Read-only review of all six files. Files changed externally during inspection; citations refer to the captured snapshot. No files were modified, secrets inspected, or push sent.

**Today:** local alerts can run on load, hourly ticks and refocus; hidden-tab timers pause. Known cached/failed forecasts are blocked (`docs/index.html:2635–2669,2854–2864`). Background push remains unconfigured: the public VAPID key lives at `docs/index.html:872`; Form/entry fields are empty (`:873–874`). The private key is intended for repository secrets and remains unconfigured **per owner**, not independently verified (`SETUP-PUSH.md:31–39`).

The sender parses quoted CSV, keeps the latest endpoint row, groups coordinates, imports Palata scoring/copy, and sends VAPID push (`scripts/send-push.mjs:14–30,39–54,92–155`). Workflow: hourly at :10 plus manual dispatch (`.github/workflows/push-notify.yml:3–6`).

**Defects and gaps:**

- **False readiness:** “active” checks permission/Form URL, not stored subscription. Opaque `no-cors` POST resolution becomes permanent success; errors disappear (`docs/index.html:2586–2597,2602–2620`). Help promises background operation despite paused hidden-tab timers (`:2588,2855–2859`).
- **No startup repair:** `init` never calls `subscribePush`; rotation resubscribes locally without uploading the replacement (`docs/index.html:2821–2866`; `docs/sw.js:160–168`).
- **Wrong beach:** permanent per-beach markers make A→B→A leave B latest. Signatures ignore changed subscription keys/coordinates (`docs/index.html:2610–2619`; `scripts/send-push.mjs:107–118`). Add/remove/deep-link paths omit synchronization (`docs/index.html:1304–1309,2209–2213,2772`).
- **Switch races:** subscription updates precede successful loading; rollback does not restore server preference. Retained old hourly data can trigger under the new beach during a tick (`docs/index.html:2674–2679,2814–2818,2854–2856`).
- **Duplicates:** switching resets local transition state; session state cannot deduplicate tabs/server sends. Cron/manual reruns lack a persistent event ledger (`docs/index.html:2639–2647,2814`; `scripts/send-push.mjs:135–155`).
- **Wrong window end:** local “now” uses the highest-average later window. Isolated replay: current calm ends 09:00, but a stronger later window produces 12:00 (`docs/index.html:1763–1777,2642–2644`).
- **Residual stale risk:** no age gate protects pending/hung refreshes; fetches lack timeouts (`docs/index.html:1145,2637,2854–2864`).
- **Scoring drift:** browser ensemble inputs differ from sender defaults; browser bypasses `scoreOf`’s invalid-secondary-value fallback (`docs/index.html:1037–1055,1139–1178`; `scripts/send-push.mjs:24–30,58–69`; `docs/palata.js:38–45`).
- **Missed events:** current-hour onset logic misses sufficiently delayed runs, overnight→morning availability and calm→deluxe upgrades; preview requires hour 19. Local alerts lack quiet hours; both lack minimum duration (`scripts/send-push.mjs:74–82,136–149`; `docs/index.html:2635–2647`).
- **Misleading copy:** scores 80–89 can say “פלטה עכשיו”; evening always claims palata and may select afternoon (`docs/palata.js:57,68–80`; `scripts/send-push.mjs:148–149`).
- **Lifecycle/operations:** no in-app unsubscribe; expired endpoints only log; caps silently exclude subscribers. HTTP/schema failures can become successful empty runs (`docs/index.html:2593–2620`; `scripts/send-push.mjs:58–70,92–93,118–125,155`). Globally valid custom beaches can fail the sender’s 20–45 coordinate restriction (`docs/index.html:2768–2770`; `scripts/send-push.mjs:117`).
- **Clicks:** payload lacks `?b=key`; local notifications lack URL data; worker focuses any same-origin window and does not await navigation (`scripts/send-push.mjs:143,149`; `docs/index.html:2627–2631`; `docs/sw.js:171–177`).
- **False test success:** local-only test announces success immediately; `showNotification` rejection is unhandled, yet transition state becomes consumed (`docs/index.html:2512–2517,2630–2647`). Setup suggests editing an imported threshold in the wrong file (`SETUP-PUSH.md:56–58`; `scripts/send-push.mjs:15`).

**Platform constraints, not observed device failures:** iOS requires an installed PWA and user gesture; existing onboarding addresses these. The notification badge image does not set an app-icon count; that needs the Badging API (`docs/index.html:2522–2533,2581,2595`; `docs/sw.js:150–157`). [WebKit documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## 2. Recommended architecture

Owner-time estimates exclude implementation:

| Option | Setup | Assessment |
|---|---:|---|
| Google Form/Sheet + Actions | 20–40 min | Familiar; link-accessible subscription data, manual cleanup, fragile acknowledgments. |
| Cloudflare Worker/KV + Cron | 30–45 min | Private storage API, explicit unsubscribe, controllable scheduling; more engineering. |
| OneSignal Free | 15–30 min | Managed subscriptions/unsubscribe and iOS support; another vendor holds device/preferences data; weather evaluation still needed. |

The setup guide actually recommends anyone-with-link CSV access, not published CSV; neither authenticates readers (`SETUP-PUSH.md:19–28`). Standard public-repository Actions are [free](https://docs.github.com/en/billing/concepts/product-billing/github-actions), but schedules can delay/drop or disable after inactivity ([GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)). OneSignal permits 10,000 web subscribers/send ([pricing](https://onesignal.com/pricing), [iOS support](https://documentation.onesignal.com/docs/en/web-push-for-ios)).

**Recommend option B:** Worker API/Cron, KV for cached configuration, and a SQLite Durable Object for authoritative subscriptions, unsubscribe tombstones and event history. [KV alone lacks atomic consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/). This provides acknowledged registration, private records, retry control and standards-based iOS push. Run bounded processing/fanout in the Durable Object because free Workers have [10ms CPU limits](https://developers.cloudflare.com/workers/platform/limits/). Cost: $0 within [free quotas](https://developers.cloudflare.com/durable-objects/platform/pricing/); delivery remains best-effort.

## 3. Notification product design

Separate subscribed beaches from browsing. Default: ≥80 conditions with ≥60 minutes remaining; call ≥90 “palata.” Send one onset/session, optional ≥98 upgrade, and 19:00 preview restricted to tomorrow morning. Quiet hours: 21:00–06:00 Asia/Jerusalem. Cap two daytime alerts plus one preview/device/day.

Optional jellyfish alerts: fresh, deduplicated nearby sightings; never infer toxicity. Existing proximity is 25km/48h (`docs/index.html:1807–1815`). Include these within caps.

Reuse `notifyCopy`/`eveningCopy` with truthful tiers. Link `?b=key`; tag beach+event ID, `renotify:false` for retries. Persist backend deduplication. Optionally set/clear app badges.

“Test” must request a device-only backend send with nonce, traverse VAPID→push service→worker→notification, and distinguish provider acceptance, device receipt and click.

## 4. Ordered implementation plan

**(b) Codable without owner action—proposed, not executed:**

- First, unify scoring/windows in `docs/palata.js` and new `docs/notification-policy.js`; fix `docs/index.html` registration states, preferences, reconciliation and server test.
- Next, add `workers/push/src/index.js`, `workers/push/src/coordinator.js`, `workers/push/wrangler.jsonc` and `workers/push/package.json`: device authentication, validation, quotas, deadlines, retries, deduplication, cleanup and health checks.
- Then update `docs/sw.js` for rotation, scoped/awaited navigation and receipts. Retire `scripts/send-push.mjs` and scheduled `.github/workflows/push-notify.yml` after cutover. Rewrite `SETUP-PUSH.md`; add `tests/notifications.test.mjs`.

**(a) Owner handoff:** create Cloudflare account; deploy bindings and a 15-minute Cron; securely import the existing VAPID pair or generate/store replacement secrets; publish API/public-key configuration. No Google forms required.

**Verification:** install/open PWA on iPhone 16.4+, tap enable; repeat on Android Chrome. Confirm server record, request a delayed nonce test, lock phone, observe delivery, then tap into the correct beach. Verify unsubscribe, reinstall/rotation, A→B→A, offline recovery, repeated cron execution and quiet hours.

Codex session ID: 01a0be0f-d7aa-7001-aae1-d2be174614e6
Resume in Codex: codex resume 01a0be0f-d7aa-7001-aae1-d2be174614e6
