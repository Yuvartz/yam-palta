---
name: yp-frontend-quality
description: Improve Yam Palata plain-JavaScript structure, DOM updates, event lifecycle and state correctness without a framework rewrite.
---
# Frontend quality

Work only in this repository. Preserve existing architecture, dependencies, user changes and shared browser/push contracts. Do not run unfamiliar scripts before reading them, access secrets or install tooling automatically.

Read the actual App closure, rendering functions, storage keys and palata.js interface before refactoring. Keep scoring and its wording centralized where the project already does so. Do not duplicate constants or formulas in UI code to simplify a component.

Separate state derivation from presentation when a concrete bug or maintenance problem warrants it. Prefer localized helpers over rebuilding the entire page as a component framework. Preserve event handlers, accessibility attributes and selected/focused elements during DOM updates.

Use textContent or safe DOM construction for user-controlled strings. Validate link schemes and coordinate inputs. Identify existing unsafe sinks before choosing a remediation; avoid broad innerHTML rewrites that destroy focus or attach duplicate listeners.

Bound listeners, timers and observers by their lifecycle. Make repeated initialization and refresh behavior explicit. Clean up canceled animation work and stale request callbacks. Keep storage changes backward compatible and use isolated data for destructive test cases.

Verify the changed behavior and a nearby regression path. Do not reformat large unrelated sections, silently swallow errors or claim maintainability improvements that merely replace one style with another.
