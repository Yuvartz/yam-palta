---
name: yp-data-state-ux
description: Design correct loading, refresh, partial failure, offline and stale-data states for Yam Palata forecast, observation and report data.
---
# Data-state UX

Use the app's existing sources and storage contracts. Do not add data providers, telemetry or permissions, or change score formulas within a UI task.

Represent first load, background refresh, fresh data, cached data, partial success, empty results and failure distinctly. Preserve valid content during a refresh when useful, clearly tied to its place and time. Never replace unknown values with zero or present old data as live.

Track request identity by location and relevant parameters. Abort obsolete requests where supported, or ignore stale responses before updating any view. A slow result for a previous beach must not overwrite the currently selected beach's conditions.

Keep forecast, buoy and jellyfish report availability independent when their sources fail separately. Show useful partial data and a targeted explanation. Do not label the entire app broken because one optional section is unavailable.

Reserve reasonable loading space to avoid layout shifts, but do not use skeletons that fabricate data shape or block usable content. Errors should identify a useful next action, preserve preferences and permit bounded retries without request storms.

Use source observation/forecast timestamps, not only the time a cache was read, to convey freshness. Test slow responses, reversed completion order, missing fields, provider errors, cached/offline responses and recovery. Keep simulated conditions confined to local tests.
