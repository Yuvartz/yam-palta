---
name: yp-social-sharing
description: Improve Yam Palata Open Graph metadata, share-image readability and shared-link behavior, including correct handling of locations, timestamps and preview caches.
---
# Sharing and preview UX

Use existing approved assets and the current static host. Do not send messages, publish, use tracking shorteners, add third-party image services or download unapproved assets.

Inspect the existing Open Graph and Twitter card tags before changing them. Keep title, description, site identity, locale where used and absolute image/page URLs coherent. Metadata should be present in initial HTML for preview clients that do not execute JavaScript. Check that referenced public images exist and are appropriate for their selected card format.

Assess image legibility at small preview sizes and likely crops. Keep branding and a short useful message readable; don't assume a square app icon is always the best sharing image. Propose a dedicated preview asset if needed, using the current asset workflow and approved visual identity.

Do not put a live sea condition or 'now' claim into a long-lived static preview unless its time and update strategy are explicit. Sharing bots cache results; a changed file does not prove WhatsApp or another platform has refreshed its preview. Distinguish inspecting tags, rendering a mock preview and testing an actual platform result.

If sharing a selected location/day is in scope, ensure the receiving URL really restores that state in a clean session and preserves /yam-palta/. Never put private coordinates, tokens or identifiers into public share URLs without an explicit product decision. Query parameters or fragments do not automatically produce a different server-served social image.

Validate accessible names for existing share controls, cancellation and fallback behavior if supported. Do not add a share feature just because this skill was loaded. Report remaining platform-specific preview verification without sending real messages as a test.
