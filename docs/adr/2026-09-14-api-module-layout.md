---
title: API module layout — route stubs and full schema fixed in the walking skeleton
status: accepted
date: 2026-09-14
deciders: user (break-prd-down)
supersedes:
---

# API module layout — route stubs and full schema fixed in the walking skeleton

## Context
Implementers run in parallel worktrees and are scheduled on ownership-zone disjointness.
Two files would otherwise be edited by every feature issue: the route registry (`app.ts`) and
the migrations directory — both are shared manifests that force serial execution. The frontend
ADR also requires a fixed route order (`/api/*`, `/analytics/*` before `/:code`).

## Decision
- `apps/api/src/app.ts` exports `createApp(deps)`; it mounts one Hono sub-app per feature
  module in a **fixed order** decided once in Phase 0: `health`, `links`, `urls`, `stats`,
  `web`, then `redirect` (the `/:code` catch-all is always last).
- Every feature module lives in its own directory `apps/api/src/<module>/` and exposes
  `routes.ts` (a Hono sub-app). Phase 0 creates **empty stubs** for every module the PRD needs;
  feature issues fill their own directory and never edit `app.ts`.
- Dependencies (the `pg` pool, config) are injected through `createApp(deps)`; no module
  imports a global pool. Tests build the app with the Testcontainers pool.
- The **whole schema** (`links`, `clicks`, unique index on `links.code`, index on
  `clicks(link_id, created_at)`) ships in one migration in Phase 0. Later issues do not add
  migrations unless a requirement changes.
- Test files are co-located: `apps/api/src/<module>/*.test.ts`. Shared test infrastructure
  (`apps/api/test/`: Testcontainers global setup, `truncateAll`, raw-SQL fixtures
  `insertLink` / `insertClick`) is written in Phase 0 and treated as shared.

## Alternatives considered
- **Each issue registers its own route in `app.ts`** — every issue becomes `touches-shared`;
  zero parallelism and route-order bugs discovered live.
- **One migration per feature** — same serialisation through `**/migrations/**`.
- **Global pool singleton** — simpler imports, but tests can't swap the database cleanly.

## Consequences
- Positive: feature issues own disjoint directories and run in parallel; route order is a
  Phase 0 fact, not a per-issue risk.
- Negative / cost: stubs that exist before their feature; `createApp(deps)` plumbing up front.
- Follow-ups: none.
