---
name: yp-seo-javascript
description: Evaluate what search crawlers and non-JavaScript preview bots can understand in Yam Palata, and improve initial HTML and link discoverability without a framework migration.
---
# JavaScript and discoverability

Use this project's existing HTML/CSS/JavaScript stack. No new rendering services, servers, dependencies, framework migrations, publishing or third-party source uploads.

Compare the initial HTML with a rendered DOM where available. Determine whether purpose, a descriptive heading, useful explanation and relevant links are available without a successful forecast API response. Check visibility conditions as well as whether text exists in the file. Google can render JavaScript, but that is not a reason to assume every bot or preview client can.

Keep essential non-time-sensitive explanation and metadata in initial HTML when practical. Do not fabricate current weather as a fallback. Preserve a useful app shell and understandable loading/error states without hiding all contextual content until the network succeeds.

Use actual anchors with href for navigation to real documents. Keep buttons for UI actions. User interactions, localStorage, installation and geolocation permissions must not be necessary to understand the site's basic purpose. Do not convert every button into a fake link solely for SEO.

For proposed location URLs, first establish meaningful content, public/private boundaries and direct-load behavior. GitHub Pages requires routes that work as served static resources; a History API change alone does not provide server fallback. Fragment state may help users but should not be presented as an independent indexable page strategy. Propose new URL architecture before implementation.

Verify initial load, JavaScript-enabled load, API failure, clean browser storage and direct navigation at the /yam-palta/ base path. Keep static copy and rendered content semantically consistent; do not serve keyword-stuffed content to bots. Record missing crawler or Search Console evidence explicitly.
