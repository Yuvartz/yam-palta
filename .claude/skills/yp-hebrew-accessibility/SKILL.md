---
name: yp-hebrew-accessibility
description: Audit Yam Palata Hebrew RTL layout, mixed-direction values, keyboard focus, semantics, contrast, text scaling and reduced-motion behavior.
---
# Hebrew, RTL and accessibility

Work only within this application and existing tools. Do not install accessibility overlays, external audit services or new fonts as an automatic fix.

Preserve Hebrew document language and RTL direction. Prefer logical CSS properties where they express layout intent. Isolate LTR numbers, coordinates, URLs and units using appropriate bidi markup; inspect actual rendering rather than reversing strings. Geographic arrows, compass directions and chart axes follow their semantic meaning, not blanket mirroring.

Use native buttons, labels and form controls where possible. Add accessible names to icon-only actions, represent selected/expanded state and keep keyboard focus visible. Avoid making entire cards ambiguously clickable when they contain nested controls.

Check reading order against visual order, modal focus containment/return and keyboard access to every required action. Use live announcements sparingly for meaningful loading/error changes; do not announce every animated numeric update.

Check text contrast, status cues beyond color, comfortable touch areas, zoom and larger system text. Reduce nonessential motion while keeping understandable state transitions. Emoji and wave sprites need meaningful alternatives only when they convey information; decorative graphics should be ignored by assistive technology.

Test long Hebrew names and mixed numeric units in the same sentence. Distinguish automated findings, manual keyboard checks and actual screen-reader testing; do not claim full accessibility compliance from a static scan.
