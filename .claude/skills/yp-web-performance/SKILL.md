---
name: yp-web-performance
description: Diagnose and improve measured Yam Palata load speed, input responsiveness, scrolling, visual stability and animation cost on mobile web.
---
# Web performance

Use existing local/browser tooling and representative data. No external profiling uploads, added telemetry, benchmark packages or speculative framework migrations.

Establish a repeatable baseline for first load, returning cached load, location switching, timeline interaction and scrolling. Record browser/device or emulation settings, network/cache state and workload. Separate provider latency from main-thread or rendering work.

Investigate observed bottlenecks: repeated DOM replacement, unnecessary data fetching, layout reads mixed with writes, oversized assets, font loading, continuous motion, expensive blur/shadow compositing or accumulating listeners. Their presence alone does not prove a performance issue.

Preserve essential information and visual stability while optimizing. Reuse results only within valid freshness and location boundaries. Reserve image dimensions, avoid animating offscreen content, and prefer browser-native primitives when suitable.

Do not reduce forecast accuracy, disable important accessibility behavior or change the user's refresh expectations simply to improve a metric. Do not remove an atmospheric effect without checking whether a cheaper implementation preserves its intent.

Measure the same workload after a focused change; report values and tradeoffs, not unsupported percentage claims. Desktop emulation is a useful signal, not proof of iPhone battery or frame-rate performance.
