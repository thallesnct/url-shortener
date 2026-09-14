---
title: Time-dependent route factories take an optional `now` parameter after `deps`
status: proposed
date: 2026-09-14
deciders: implementer(P2-02)
supersedes:
---

# Time-dependent route factories take an optional `now` parameter after `deps`

## Context
`GET /api/stats/:code` (P2-02) returns a 30-day series that ends on *today's* UTC date. Its
tests must be deterministic (a click "29 days ago" must land in the first bucket on any day
the suite runs), so the handler needs an injectable clock. ADR route-factories-and-test-harness
fixes the factory shape as `<module>Routes(deps: Deps)` and `Deps` lives in
`apps/api/src/deps.ts`, a file no feature issue owns. `app.ts` (also shared) calls every
factory with `deps` only.

## Decision
- A route factory whose behaviour depends on the current time accepts the clock as an
  **optional second parameter with a default**: `statsRoutes(deps, now: () => Date = () => new Date())`.
  `app.ts` keeps calling `<module>Routes(deps)`; nothing shared changes.
- The window boundaries are computed **once in JS** from `now()` and passed to SQL as
  parameters (`created_at >= $2`); SQL `now()` is not used for the window, so the day series
  and the SQL filter can never disagree.
- Tests that need a fixed date build the sub-app directly
  (`statsRoutes(deps, () => fixedDate).request(...)`); everything else still goes through
  `createApp(deps)`.

## Alternatives considered
- **`now` on `Deps`** — cleaner injection, but requires editing `deps.ts` and `app.ts`
  (shared manifests) for one module; every other factory would carry a clock it never reads.
- **`vi.useFakeTimers()` / `vi.setSystemTime()`** — fakes `Date` for the whole file,
  including `pg`'s connection timeouts and the fixtures' `now()` defaults; fragile with
  Testcontainers.
- **SQL `now() - interval '29 days'`** — non-deterministic and a rolling 29×24 h window, not
  a UTC-day boundary; a click early on day −29 could be filtered out while zero-filling
  still emits its bucket.

## Consequences
- Positive: deterministic date tests without touching shared files; a single, greppable
  pattern for the next time-dependent module (e.g. expiry checks in `redirect`).
- Negative / cost: one factory has a different arity from the others; a reader of `app.ts`
  cannot see that a clock exists.
- Follow-ups: if a second module needs a clock, move `now` into `Deps` in one shared change
  and supersede this record.
