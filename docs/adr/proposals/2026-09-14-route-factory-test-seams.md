---
title: Route factories take an optional second `options` argument for test seams
status: proposed
date: 2026-09-14
deciders: implementer(P1-01)
supersedes:
---

# Route factories take an optional second `options` argument for test seams

## Context
ADR route-factories-and-test-harness fixes `<module>Routes(deps: Deps)` as the shape of every
module and `Deps = { pool, config }` as the injected dependencies. P1-01 needed to stub the
short-code generator so a test can force a `23505` collision and prove the retry. The generator
is not a shared dependency — no other module and no production caller ever passes it — so
widening `Deps` (a shared file outside the module's zone) would have made every module and
`app.ts` carry a links-only concern.

## Decision
- A module that needs a test-only override accepts it as an **optional second argument**:
  `linksRoutes(deps: Deps, options: { generateCode?: CodeGenerator } = {})`. `app.ts` keeps
  calling `<module>Routes(deps)` unchanged; only that module's tests pass `options`.
- `Deps` stays reserved for dependencies that are genuinely shared (pool, config). Anything
  used by exactly one module is an `options` field of that module.
- The options type is declared inline in the factory signature (not exported) unless a second
  caller appears.

## Alternatives considered
- **Add `generateCode` to `Deps`** — touches `deps.ts`, `app.ts` and every test that builds an
  app; makes a links-only detail global.
- **`vi.mock('./code.ts')`** — mocks a module the team owns, which the tdd skill forbids, and
  binds the test to the file layout.
- **Insert the pre-generated code through a repo-level test only** — would not exercise the
  HTTP path, so the retry could regress in `routes.ts` unnoticed.

## Consequences
- Positive: `Deps` stays small; every module's seams are visible in its own signature; tests
  hit the real HTTP handler with a stub only at the boundary they need.
- Negative / cost: two ways to inject things (`deps` vs `options`) — the rule above says which.
- Follow-ups: `apps/api/src/config.ts` should strip a trailing slash from `BASE_URL` so
  modules do not each normalise it (P1-01 does it locally in `links/routes.ts`).
