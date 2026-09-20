---
name: yp-navigation-forms
description: Improve location selection and addition, preferences, forecast expansion and modal navigation in Yam Palata without adding unnecessary steps.
---
# Navigation and forms

Use current project behavior and DOM patterns. No new services, packages, automatic permission requests or real feedback submissions during testing.

Keep location selection obvious and stable during refresh. Adding or removing a place must not silently reset unrelated preferences or select the wrong location. Use a compact preset path with advanced coordinates available when needed; do not require technical input from everyone.

Validate coordinates, required names and supported map-link formats with actionable inline errors. Preserve entered values after errors. Display untrusted place names as text and validate parsed URLs rather than inserting user strings into HTML. Do not send arbitrary pasted URLs to a new proxy.

Dialogs need an accessible name, deliberate initial focus, focus containment, keyboard dismissal when appropriate, scroll locking and focus return. A dialog close must not activate the control beneath it. Test with the on-screen keyboard visible.

Use semantic buttons for expansions, expose expanded state and preserve focus when details render. Model pending, success and failure for actual async actions, prevent duplicate submissions and only claim completion after it occurs.

Notification and installation flows must reflect capabilities and consent. Denied permission is a legitimate state. Preserve unsaved form input when switching away where the existing flow allows it; confirm only genuinely destructive actions.
