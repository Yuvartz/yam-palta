---
name: yp-motion-design
description: Create or review Yam Palata transitions, feedback and ambient movement with CSS or existing browser APIs, including interruption, reduced motion and mobile performance.
---
# Interface motion

Operate only in this repository with existing browser capabilities. Do not add Motion, GSAP, React or any other animation dependency merely for polish.

Inventory existing animations and classify each as feedback, navigation, state change or ambiance. Give every new animation a user-facing purpose. Preserve instant access to current data; do not delay interaction until an entrance sequence finishes or replay every section on each refresh.

Define the trigger, animated properties, duration/easing, interruption behavior, focus timing and reduced-motion equivalent. Short direct feedback and slightly longer spatial transitions may differ; tune against actual use rather than enforcing one duration globally.

For dialogs, forecast expansion and day changes, maintain spatial continuity and prevent surrounding content from jumping unpredictably. Keep RTL reading order and previous/next meaning coherent; do not blindly invert geographic direction or data axes.

Prefer transform/opacity when suitable. Treat height animations and layout-dependent effects as measured tradeoffs. Cancel or retarget interrupted animations and avoid stale completion callbacks reopening closed UI. Rapid taps and location changes must leave the interface in its correct final state.

Respect prefers-reduced-motion, including ambient loops. Stop unnecessary work in hidden tabs and offscreen regions. Sea motion is atmosphere or a documented visualization, never a substitute for measured wave information. Verify normal/reduced modes, repeated input, background/resume and frame pacing on a constrained device where available.
