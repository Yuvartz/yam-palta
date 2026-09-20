---
name: yp-campaign-planning
description: Plan and track YAM PLATA marketing: weekly/30-day content calendar, channel cadence, launch sequence milestones, KPIs from GoatCounter and the push Worker, and weekly review notes.
---
# Campaign planning and measurement

Sources: `docs-internal/marketing/playbook.md` (cadence, KPIs, checklist), Astra's plan sections 2, 3 and 5 in
`docs-internal/codex-marketing-plan-2026-09-20.md` (channel table, 30-day calendar, launch sequence with 90-day targets).

## Files you maintain
- `docs-internal/marketing/calendar.md`: one table per week (date, channel, pillar, asset, status, link). Seed it from Astra's 30-day table; move undone items forward, never delete history.
- `docs-internal/marketing/weekly-<YYYY-MM-DD>.md`: posted (with links), numbers, what worked, what to change, next week's three priorities.
- `docs-internal/marketing/playbook.md` owner checklist: tick items only when the owner confirms.

## Launch sequence (Astra §5, condensed)
1. **Soft launch (weeks 1–2)**: friends, 1–2 swim/SUP groups with admin approval, Telegram channel, daily story running. Goal: feedback + first 50 notification subscribers.
2. **Public launch week (week 3)**: PR pitches (2/wk), X build-in-public thread, Reels series "מה זה פלטה", partner pilot (one SUP rental or coach).
3. **Days 30–90**: Product Hunt only after the English experience exists; kiosk QR pilot; beach-of-the-week SEO loop; evaluate paid test only with organic signal.

## KPIs and where they come from
| KPI | Source | How |
|---|---|---|
| Installs proxy / push subscribers | Worker `GET https://yam-palata-push.yam-palata-push.workers.dev/health` → `subscribers` | curl, weekly |
| Launches, beach switches, shares, camera, notifications, support clicks | GoatCounter events (dashboard `yuvartz.goatcounter.com`) | owner pastes or exports; agent reads what it is given |
| Traffic by channel | GoatCounter referrers + UTM (`utm_source`, `utm_campaign`, `utm_content`) | keep the UTM scheme in `playbook.md` |
| Organic search | Google Search Console (after owner verification) | owner exports |
| Content output | `tools/video/out/pack-*/POST.md` statuses | count ready/posted |
Report deltas week over week; do not extrapolate or promise rankings/virality.

## Rules
- Plan only what one person can execute: max 1 daily asset + 3 original pieces per week (Astra's operating rule).
- Every planned post has: channel, pillar, asset path, caption owner (`yp-brand-voice`), UTM, time (Israel), status.
- No paid spend, no new tools/accounts and no external submissions without the owner's explicit OK.
