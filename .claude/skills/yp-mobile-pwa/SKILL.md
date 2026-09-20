---
name: yp-mobile-pwa
description: Improve Yam Palata mobile web and installed-PWA behavior, safe areas, keyboard layout, installation guidance and offline/update reliability.
---
# Mobile and PWA

Preserve the existing web app and GitHub Pages deployment shape. Do not migrate to native apps, introduce services or modify notification infrastructure without a separate request.

Inspect manifest.json, sw.js, startup metadata and asset paths together. Keep URLs valid under /yam-palta/ and in a local subpath preview. Do not assume a root-domain deployment. Check the currently opened app version against the repository before diagnosing stale assets.

Test browser mode and installed mode separately where available. Account for safe-area insets, changing browser chrome, portrait/landscape layouts, virtual keyboard occlusion and scroll locking. Use responsive viewport behavior without disabling zoom.

Make installation guidance capability-aware and dismissible. Request notification permissions only after an explicit user action. Explain unsupported or denied states accurately without repeated prompts; mock enrollment in development.

For caching changes, preserve last-known data with truthful timestamps and graceful offline presentation. Distinguish the app shell from time-sensitive forecasts. Scope cache cleanup to caches owned by Yam Palata; Cache Storage may be shared with other paths on the same origin. Do not delete unrelated caches or user storage.

Check coherent shell/script versions during service-worker updates, interrupted updates, a first offline visit and a returning offline visit. Update cache versioning only according to the established release process. Never claim real iOS verification from desktop emulation.
