---
name: yp-seo-technical
description: Audit and improve Yam Palata titles, descriptions, canonical URLs, crawl controls, public URL inventory and sitemap decisions on its existing GitHub Pages host.
---
# Technical SEO

Stay within the Yam Palata repository. Preserve existing app behavior and user changes. Do not install packages, access secrets, alter global configuration, change other repositories or publish.

Inspect existing metadata before editing. Use a descriptive Hebrew title reflecting both the brand and actual purpose; keep the meta description useful and factual. Align canonical URLs, public page identity and sharing metadata without producing duplicate tags. Search engines may choose different title/snippet text, so don't promise an exact result.

Inventory real reachable URLs and their content before recommending more pages. Preserve the /yam-palta/ base path. A localStorage location selection is not automatically an independently indexable page. Do not create a sitemap listing nonexistent location routes, UI-only states or tracking variants.

Only add a sitemap if it is useful for the actual site structure. Use absolute canonical public URLs and truthful modification dates. Do not generate daily lastmod values just because the application checks the weather. A sitemap does not guarantee indexing and its absence alone is not a blocker for a one-page app.

Robots rules belong at the origin root, https://yuvartz.github.io/robots.txt, not /yam-palta/robots.txt. Inspect that resource read-only where possible. A restriction there may require work outside this repository; report it without changing the owner site's files. Do not invent a requirement for an allow-all robots file. Treat robots.txt as crawl guidance, not access control or a guaranteed removal from search.

Check unintended noindex directives, conflicting canonical tags, broken links, status behavior and metadata missing from initial HTML. Preserve intentional visibility decisions; removing intentional restrictions or changing crawler policy requires user direction. Verify locally and distinguish readiness from confirmed indexing.
