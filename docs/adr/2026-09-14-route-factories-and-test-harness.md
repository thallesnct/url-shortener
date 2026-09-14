---
title: Route modules are `<module>Routes(deps)` factories; tests get a pool and auto-truncation from `apps/api/test/`
status: accepted
date: 2026-09-14
deciders: implementer(P0-01), user (execute-next-step)
supersedes:
---

# Route modules are `<module>Routes(deps)` factories; tests get a pool and auto-truncation from `apps/api/test/`

## Context
ADR api-module-layout fixes that every module exposes `routes.ts` as a Hono sub-app and
that dependencies are injected through `createApp(deps)`, but leaves open *how* a sub-app
receives `deps` and how test files obtain the Testcontainers pool. Phase 0 had to pick one
shape; later issues (P1–P4) fill their directories by copying it.

## Decision
- `apps/api/src/deps.ts` exports `type Deps = { pool: Pool; config: Config }`.
- `apps/api/src/<module>/routes.ts` exports one function `<module>Routes(deps: Deps)` that
  returns a `new Hono()` declaring **absolute** paths (`/api/health`, `/api/shorten`, `/:code`).
  `app.ts` mounts each with `app.route('/', <module>Routes(deps))`; no prefixes live in
  `app.ts`. Unmatched requests fall through to the global `notFound` (`404 { error }`) and
  thrown errors to `onError` (`500 { error }`).
- `apps/api/test/db.ts` exports `pool` (built from `inject('databaseUrl')`, one per test file)
  and `truncateAll()`. `apps/api/test/setup.ts` (Vitest `setupFiles`) runs
  `beforeEach(truncateAll)` and `afterAll(pool.end)` for every test file, so a test file
  never has to remember either. Tests build their app with
  `createApp({ pool, config: loadConfig({}) })` and call `app.request()`.
- `apps/api/test/fixtures.ts` seeds with raw SQL and returns camelCase rows
  (`insertLink → { id, code, originalUrl, createdAt, expiresAt }`,
  `insertClick → { id, linkId, referrer, userAgent, ip, createdAt }`).

## Alternatives considered
- **Pool on Hono context (`c.set('pool', …)` via middleware)** — hides the dependency in a
  string key; no type safety per module.
- **Explicit `beforeEach(truncateAll)` in every test file** — one forgotten line makes a
  suite order-dependent; the setup file makes isolation the default.
- **Mount with prefixes in `app.ts` (`app.route('/api', links)`)** — splits a route's path
  across two files and makes `redirect` (`/:code`) an exception.

## Consequences
- Positive: adding a module is one file plus one already-existing line in `app.ts`; every
  test starts from empty tables with no boilerplate.
- Negative / cost: each test file opens its own pool (cheap: files run serially); a test
  that needs data to survive between `it` blocks must create it inside the block.
- Follow-ups: none.
