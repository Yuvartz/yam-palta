---
name: yp-visual-interaction-qa
description: Verify Yam Palata UI changes through local rendered screenshots, interaction scenarios and regression checks across representative mobile states.
---
# Visual and interaction QA

Use this project's available local testing/browser tools. Do not install dependencies without authorization, send real reports or notifications, modify production data or upload screenshots externally.

Take baseline and changed screenshots with matching fixtures, viewport and selected location/day. Test the smallest supported phone, a typical phone and desktop; choose actual project targets when documented. Include normal and reduced-motion modes. Inspect rendered output yourself if image access is available; do not claim inspection based only on a screenshot file existing.

Exercise principal journeys: load conditions, switch locations quickly, add a valid/invalid place, open forecast details, move between days, change water preference, open/close installation help and return from background. Check focus and scroll continuity.

Use local fixtures or interception for denied permissions, offline data, partial provider failures, slow responses and feedback success/error. Prevent real submissions and subscription changes. Wait for meaningful UI readiness rather than unconditional sleeps or network-idle on a page that may poll.

Review Hebrew text, numeric direction, overflow, contrast, selected states and layout shifts. Inspect console errors and failed relevant requests. Verify animation interruption interactively; static screenshots cannot demonstrate timing quality.

Record exactly what ran, what passed and what remains untested. Mark emulated mobile, actual iOS and screen-reader checks separately. Add regression tests for meaningful behavior only; avoid assertions that merely repeat implementation details.
