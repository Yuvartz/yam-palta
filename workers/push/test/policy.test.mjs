import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { decide, scoreHours, calmRunAt, isQuiet } from "../src/policy.js";
const Palata = createRequire(import.meta.url)("../../../docs/palata.js");

const beach = { key: "telaviv", name: "תל אביב" };
const APP = "https://example.test/";
// Build a day of hours from a score map: hour → {wave, chop, wind}
function day(dateStr, spec) {
  return Array.from({ length: 24 }, (_, h) => {
    const s = spec[h] || { wave: 0.6, chop: 0.3, wind: 20 };   // rough by default
    return { time: `${dateStr}T${String(h).padStart(2, "0")}:00`, waveHeight: s.wave, windWave: s.chop, seaTemp: 28, windKmh: s.wind };
  });
}
const calm = { wave: 0.05, chop: 0.02, wind: 3 };       // ≈ 94 (palata)
const glass = { wave: 0.03, chop: 0.01, wind: 1 };      // ≈ 100 (deluxe)

test("scores: calm spec is palata, default is rough", () => {
  const sc = scoreHours(day("2026-09-21", { 8: calm }), Palata);
  assert.ok(sc[8].score >= Palata.CALM_MIN, `got ${sc[8].score}`);
  assert.ok(sc[9].score < Palata.CALM_MIN);
});

test("onset fires once when calm starts with ≥1 more calm hour, not again next tick", () => {
  const sc = scoreHours(day("2026-09-21", { 8: calm, 9: calm, 10: calm }), Palata);
  const now = { dateStr: "2026-09-21", hour: 8, minute: 5 };
  const r1 = decide({ scored: sc, now, state: { lastCalm: false, sent: [] }, beach, Palata, appUrl: APP });
  assert.equal(r1.events.length, 1); assert.equal(r1.events[0].type, "onset");
  assert.ok(r1.events[0].url.endsWith("?b=telaviv"));
  assert.match(r1.events[0].body, /11:00/);   // window end = last calm hour + 1
  const r2 = decide({ scored: sc, now: { ...now, minute: 20 }, state: r1.state, beach, Palata, appUrl: APP });
  assert.equal(r2.events.length, 0, "same onset must not repeat");
});

test("onset needs at least one more calm hour ahead", () => {
  const sc = scoreHours(day("2026-09-21", { 8: calm }), Palata);   // calm only at 08
  const r = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: 8, minute: 0 }, state: { lastCalm: false, sent: [] }, beach, Palata, appUrl: APP });
  assert.equal(r.events.length, 0);
});

test("quiet hours suppress onset", () => {
  const sc = scoreHours(day("2026-09-21", { 23: calm, 22: calm }), Palata);
  const r = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: 22, minute: 0 }, state: { lastCalm: false, sent: [] }, beach, Palata, appUrl: APP });
  assert.equal(r.events.length, 0); assert.ok(isQuiet(22)); assert.ok(!isQuiet(7));
});

test("daily onset cap = 2", () => {
  const sc = scoreHours(day("2026-09-21", { 7: calm, 8: calm, 11: calm, 12: calm, 15: calm, 16: calm }), Palata);
  let state = { lastCalm: false, sent: [] }, total = 0;
  for (const h of [7, 9, 11, 13, 15]) { const r = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: h, minute: 0 }, state, beach, Palata, appUrl: APP }); total += r.events.length; state = r.state; }
  assert.equal(total, 2);
});

test("deluxe upgrade fires once when already calm", () => {
  // wind history is a 10 h trailing mean — a realistic deluxe needs a calm night before it
  const spec = {}; for (let h = 0; h <= 8; h++) spec[h] = { wave: 0.05, chop: 0.02, wind: 2 };
  spec[9] = { wave: 0.03, chop: 0.01, wind: 0 }; spec[10] = spec[9];
  const sc = scoreHours(day("2026-09-21", spec), Palata);
  const r1 = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: 8, minute: 0 }, state: { lastCalm: false, sent: [] }, beach, Palata, appUrl: APP });
  const r2 = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: 9, minute: 0 }, state: r1.state, beach, Palata, appUrl: APP });
  assert.equal(r2.events.length, 1); assert.equal(r2.events[0].type, "deluxe");
  const r3 = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: 10, minute: 0 }, state: r2.state, beach, Palata, appUrl: APP });
  assert.equal(r3.events.length, 0);
});

test("evening preview at 19:xx for a ≥2h calm morning tomorrow, with true hours", () => {
  const today = day("2026-09-21", {}), tomorrow = day("2026-09-22", { 7: calm, 8: calm, 9: calm });
  const sc = scoreHours([...today, ...tomorrow], Palata);
  const r = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: 19, minute: 10 }, state: { lastCalm: false, sent: [] }, beach, Palata, appUrl: APP });
  assert.equal(r.events.length, 1); assert.equal(r.events[0].type, "evening");
  assert.match(r.events[0].body, /07:00/); assert.match(r.events[0].body, /10:00/);
  const again = decide({ scored: sc, now: { dateStr: "2026-09-21", hour: 19, minute: 40 }, state: r.state, beach, Palata, appUrl: APP });
  assert.equal(again.events.length, 0);
});

test("calmRunAt returns the run containing the index only", () => {
  const sc = scoreHours(day("2026-09-21", { 6: calm, 7: calm, 12: calm, 13: calm, 14: calm }), Palata);
  assert.deepEqual(calmRunAt(sc, 7, Palata.CALM_MIN), { start: 6, end: 7, hours: 2 });
  assert.equal(calmRunAt(sc, 9, Palata.CALM_MIN), null);
});
