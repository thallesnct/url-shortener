---
title: Testing — Vitest, integration-first via app.request(), Testcontainers Postgres
status: accepted
date: 2026-09-14
deciders: user (make-prd)
supersedes:
---

# Testing — Vitest, integration-first via app.request(), Testcontainers Postgres

## Context
Tests must run with one command and be green at the end of the session; the reviewers will
demo the wiring (create → redirect → click recorded → stats). Persistence is Postgres, so the
suite needs a real database with isolation between runs.

## Decision
- **Vitest** as the runner for both workspaces; root `pnpm test` runs everything.
- **Integration-first**: every API endpoint is exercised through Hono's `app.request()` (no
  socket) against a real Postgres. Unit tests only where logic is pure and worth isolating
  (URL validation, code generation, day zero-filling).
- **Testcontainers** (`@testcontainers/postgresql`) starts one ephemeral Postgres per test run
  in a global setup; migrations are applied once; tables are truncated between tests.
- The web app gets a smoke test that the analytics route renders the shell; component tests
  are optional.

## Alternatives considered
- **Separate test database on the compose instance** — one fewer dependency, but requires the
  compose stack to already be up and leaks state between runs. Rejected by the user.
- **pglite** — in-process Postgres without Docker, but a second engine with dialect gaps.
- **Mocked repository** — fast, proves nothing about the SQL aggregations analytics depend on.
- **node:test** — zero-dep, but slower feedback loop than Vitest during a live build.

## Consequences
- Positive: tests prove the real SQL and the full request path; no shared state between runs.
- Negative / cost: Docker required for tests; ~5–10 s container startup per run; Testcontainers
  is a heavier dev dependency.
- Follow-ups: cache the Postgres image locally before the session to avoid a pull during the demo.
