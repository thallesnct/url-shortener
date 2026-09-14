---
id: P2-02
title: Add GET /api/stats/:code with clicksByDay and topReferrers
prd: docs/prds/url-shortener.md
phase: 2
status: in-progress
blockers: [P0-01]
parallel: true
zones: [apps/api/src/stats/]
touches-shared: false
branch: feat/stats-endpoint
worktree: .worktrees/feat/stats-endpoint
pr:
gh:
---

# P2-02 — Add GET /api/stats/:code with clicksByDay and topReferrers

## Description
Implement the `stats` module: total clicks, a zero-filled 30-day series, and the top-10
referrers for one link. Covers R11, R12. Independent of P1-*: tests seed links and clicks with
the Phase 0 fixtures (`insertClick` accepts `createdAt`).

## Acceptance criteria
- [ ] AC1 Unknown code → `404 { error }`.
- [ ] AC2 Fixture link with no clicks → `200 { shortCode, originalUrl, totalClicks: 0, clicksByDay: [30 entries, all clicks: 0], topReferrers: [] }`.
- [ ] AC3 `clicksByDay` has exactly 30 entries `{ day: 'YYYY-MM-DD', clicks }`, ascending, ending on today's UTC date; a click 31 days ago is excluded, one 29 days ago and one today are counted on the right days.
- [ ] AC4 Day bucketing is UTC: a click at `23:30Z` and one at `00:30Z` the next day land on different days.
- [ ] AC5 `topReferrers` groups by referrer descending by clicks, max 10 entries, `null` referrer grouped as `{ referrer: null, clicks }`; `totalClicks` counts all clicks regardless of age.
- [ ] AC6 An expired link still returns `200` stats.
- [ ] AC7 Zero-filling is a pure, unit-tested function `fillDays(rows, today)`.

## Out of scope
- The analytics page (P4-02). Bot filtering, unique visitors.

## Notes for implementer
- Relevant ADRs: api-module-layout (own `apps/api/src/stats/` only), persistence-postgres (aggregate in SQL: `date_trunc('day', created_at AT TIME ZONE 'UTC')`, `GROUP BY`).
- Two or three queries are fine: total, by-day for `created_at >= now() - interval '29 days'` truncated to the day, top referrers `LIMIT 10`.
- Make "today" injectable (`now: () => Date`) so AC3/AC4 are deterministic.
