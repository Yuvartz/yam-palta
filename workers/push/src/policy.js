// Notification policy — pure functions, no I/O, unit-tested in test/policy.test.mjs.
// One place decides WHAT to send; index.js only fetches forecasts and delivers.
//
// Events per subscriber (Israel clock, quiet hours 21:00–06:00):
//   onset   — score crosses into ≥ CALM_MIN (80, "כמעט פלטה" or better) with at least one more
//             calm hour ahead (≥ 60 min of usable sea); max 2 per day.
//   deluxe  — score reaches ≥ DELUXE_MIN (98) for the first time today; max 1 per day.
//   evening — at 19:xx: tomorrow morning (06–12) has ≥ 2 consecutive calm hours → preview with
//             the real start/end; max 1 per day.
// Every event has a deterministic id (beach:type:date[:hour]); ids already in state.sent are
// never re-sent, so reruns and overlapping crons are idempotent.

export const QUIET_START = 21, QUIET_END = 6;   // no pushes 21:00–05:59
export const DAY_ONSET_CAP = 2;
export const SENT_KEEP = 40;                    // ids remembered per subscriber (~1 week)

export function israelParts(date = new Date()) {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return { dateStr: s.slice(0, 10), hour: parseInt(s.slice(11, 13), 10), minute: parseInt(s.slice(14, 16), 10) };
}
export function addDays(dateStr, n) { const d = new Date(dateStr + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const pad = n => String(n).padStart(2, "0");

// Score every hour of a forecast with the shared Palata math (wind history = trailing mean).
export function scoreHours(hours, Palata) {
  const H = Palata.HISTORY_HOURS;
  return hours.map((h, i) => {
    const wind = Palata.toKnots(h.windKmh);
    const slice = hours.slice(Math.max(0, i - (H - 1)), i + 1).map(x => x.windKmh).filter(v => v != null);
    const hist = slice.length ? Palata.toKnots(slice.reduce((a, b) => a + b, 0) / slice.length) : wind;
    const chop = h.windWave != null ? h.windWave : h.waveHeight;
    return { time: h.time, dateStr: h.time.slice(0, 10), hour: parseInt(h.time.slice(11, 13), 10), score: Palata.scoreOf(h.waveHeight, chop, wind, hist), seaTemp: h.seaTemp ?? null };
  });
}

// Contiguous calm run that CONTAINS index i → { start, end } hours (end inclusive) or null.
export function calmRunAt(scored, i, calmMin) {
  if (!scored[i] || scored[i].score == null || scored[i].score < calmMin) return null;
  let a = i, b = i;
  while (a > 0 && scored[a - 1].dateStr === scored[i].dateStr && scored[a - 1].score != null && scored[a - 1].score >= calmMin) a--;
  while (b + 1 < scored.length && scored[b + 1].dateStr === scored[i].dateStr && scored[b + 1].score != null && scored[b + 1].score >= calmMin) b++;
  return { start: scored[a].hour, end: scored[b].hour, hours: b - a + 1 };
}

export const isQuiet = hour => hour >= QUIET_START || hour < QUIET_END;

/**
 * Decide the events to send now.
 * @param {object} args
 * @param {Array}  args.scored   scoreHours() output (Israel-local times, includes past days)
 * @param {object} args.now      israelParts()
 * @param {object} args.state    { lastCalm:boolean, lastScore:number|null, sent:string[] }
 * @param {object} args.beach    { key, name }
 * @param {object} args.Palata
 * @returns {{ events: Array<{id,type,title,body,tag,url}>, state: object }}
 */
// After the sends: which state do we store? decide() optimistically marks every event as sent, but only
// events the push service ACCEPTED may be remembered. outcomes[i] is "ok" | "fail" for events[i].
//  - an accepted event is remembered; an accepted deluxe ONSET also remembers the day's deluxe marker, which
//    decide() adds alongside it (otherwise a dip and a return to ≥ 9.8 would send a second deluxe today);
//  - a failed onset/deluxe keeps the previous transition state (lastCalm/lastScore) so the next run retries;
//  - a failed EVENING does not: its retry depends on its own id only, and reverting lastCalm there made the
//    next hour's run announce the same calm spell again under a new hourly onset id.
export function commitSends({ prevState, decided, events, outcomes, beachKey, dateStr }) {
  const prev = prevState || {};
  const acked = new Set(prev.sent || []);
  let retryTransition = false;
  events.forEach((e, i) => {
    if (outcomes[i] === "ok") {
      acked.add(e.id);
      if (e.type === "deluxe" && e.id.startsWith(`${beachKey}:onset:`)) acked.add(`${beachKey}:deluxe:${dateStr}`);
    } else if (e.type !== "evening") {
      retryTransition = true;
    }
  });
  return { ...(retryTransition ? prev : decided), sent: [...acked].slice(-SENT_KEEP) };
}

// decide() reads only three things out of the stored state: whether we were calm, whether the previous
// score had already reached deluxe, and the ids already sent. Two states with the same signature produce
// identical decisions, so the cron can skip the KV write when the signature is unchanged (the free tier
// allows 1000 writes/day and the cron runs 96 times a day). lastSeen/lastScore are diagnostics only.
export function stateSignature(state, Palata) {
  const st = state || {};
  const deluxeAlready = st.lastScore != null && st.lastScore >= Palata.DELUXE_MIN;
  return JSON.stringify([!!st.lastCalm, deluxeAlready, st.sent || []]);
}

export function decide({ scored, now, state, beach, Palata, appUrl }) {
  const sent = new Set(state.sent || []);
  const events = [];
  const url = `${appUrl}?b=${encodeURIComponent(beach.key)}`;
  const idx = scored.findIndex(h => h.dateStr === now.dateStr && h.hour === now.hour);
  const cur = idx >= 0 ? scored[idx] : null;
  const score = cur ? cur.score : null;
  const calmNow = score != null && score >= Palata.CALM_MIN;
  const todayPrefix = `${beach.key}:onset:${now.dateStr}`;
  const onsetsToday = [...sent].filter(id => id.startsWith(todayPrefix)).length;

  if (!isQuiet(now.hour) && cur) {
    // onset: transition into calm (state says we weren't calm before) with ≥ 1 more calm hour ahead
    const run = calmRunAt(scored, idx, Palata.CALM_MIN);
    const enough = run && run.end > now.hour;   // at least the next full hour is calm too
    if (calmNow && !state.lastCalm && enough && onsetsToday < DAY_ONSET_CAP) {
      const id = `${todayPrefix}:${pad(now.hour)}`;
      if (!sent.has(id)) {
        const deluxe = score >= Palata.DELUXE_MIN;
        const c = Palata.notifyCopy(deluxe, beach.name, cur.seaTemp, run.end + 1, score);
        events.push({ id, type: deluxe ? "deluxe" : "onset", title: c.title, body: c.body, tag: `yp-${beach.key}-onset`, url });
        if (deluxe) sent.add(`${beach.key}:deluxe:${now.dateStr}`);
      }
    }
    // deluxe upgrade: already calm, now mirror-flat for the first time today
    if (calmNow && score >= Palata.DELUXE_MIN && state.lastCalm && (state.lastScore == null || state.lastScore < Palata.DELUXE_MIN)) {
      const id = `${beach.key}:deluxe:${now.dateStr}`;
      if (!sent.has(id)) {
        const c = Palata.notifyCopy(true, beach.name, cur.seaTemp, (calmRunAt(scored, idx, Palata.CALM_MIN) || {}).end + 1 || null, score);
        events.push({ id, type: "deluxe", title: c.title, body: c.body, tag: `yp-${beach.key}-deluxe`, url });
      }
    }
  }
  // evening preview for tomorrow morning
  if (now.hour === 19) {
    const tomorrow = addDays(now.dateStr, 1);
    const morning = scored.filter(h => h.dateStr === tomorrow && h.hour >= 6 && h.hour <= 12);
    let best = null, s = null;
    for (let i = 0; i <= morning.length; i++) {
      const calm = i < morning.length && morning[i].score != null && morning[i].score >= Palata.CALM_MIN;
      if (calm && s == null) s = i;
      if (!calm && s != null) { if (!best || i - s > best.len) best = { s, len: i - s }; s = null; }
    }
    if (best && best.len >= 2) {
      const id = `${beach.key}:evening:${now.dateStr}`;
      if (!sent.has(id)) {
        const c = Palata.eveningCopy(beach.name, morning[best.s].hour, morning[best.s + best.len - 1].hour + 1);
        events.push({ id, type: "evening", title: c.title, body: c.body, tag: `yp-${beach.key}-evening`, url });
      }
    }
  }
  for (const e of events) sent.add(e.id);
  const keep = [...sent].slice(-SENT_KEEP);
  return { events, state: { lastCalm: calmNow, lastScore: score, lastSeen: `${now.dateStr}T${pad(now.hour)}:${pad(now.minute)}`, sent: keep } };
}
