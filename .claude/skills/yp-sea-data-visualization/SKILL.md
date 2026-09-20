---
name: yp-sea-data-visualization
description: Improve Yam Palata scores, wave imagery, timelines and forecast graphics while preserving numerical meaning, sources, time and uncertainty.
---
# Sea and forecast visualization

Work within the existing project and data contracts. Do not alter scoring or sources to make the visual output more attractive.

Read palata.js and current rendering code to learn what each value means. Distinguish a 0–100 index, a percentage of a time window and a probability. Label them according to their actual definitions; never invent probabilistic confidence.

Keep units visible and conversions consistent across the hero, details, timeline and notifications. Distinguish forecast values, buoy observations and community reports; associate each with its own location and valid time. Do not describe data from one station as a direct measurement at every beach.

Map wave sprites and colors consistently to their intended metric. Retain textual values and states for people who cannot interpret the artwork or colors. A decorative wave loop must not imply a precise period or height unless that relationship is deliberately implemented and documented.

Handle missing, zero, out-of-range and stale values separately. Preserve the scoring module's established missing-data rules. Do not interpolate display numbers through implausible values while changing locations.

For day/hour graphics, label the selected period and time zone, avoid misleading scales, and distinguish selected from current time. Check midnight and daylight-saving boundaries using existing date conventions. Preserve source attribution and concise limits of the information without turning the interface into a wall of disclaimers.
