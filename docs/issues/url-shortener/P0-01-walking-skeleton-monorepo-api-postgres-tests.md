---
id: P0-01
title: Scaffold monorepo, Hono API, Postgres, migrations and test harness
prd: docs/prds/url-shortener.md
phase: 0
status: done
blockers: []
parallel: false
zones: [package.json, pnpm-workspace.yaml, pnpm-lock.yaml, docker-compose.yml, biome.json, tsconfig.json, .gitignore, apps/api/]
touches-shared: true
branch: feat/walking-skeleton
worktree: .worktrees/feat/walking-skeleton
pr:
gh:
---

# P0-01 — Scaffold monorepo, Hono API, Postgres, migrations and test harness

## Description
Walking skeleton for the whole project. Creates the pnpm workspace, the `apps/api` Hono app
with `createApp(deps)` and every route stub mounted in the fixed order from the module-layout
ADR, the compose Postgres, the migration runner with the complete schema, the Vitest +
Testcontainers harness, Biome, and the root scripts. One end-to-end test proves the request
path reaches the database. Covers N1 (API part), N2, N4, N5.

## Acceptance criteria
- [ ] AC1 From a clean clone with Docker running, `pnpm install && pnpm test` exits 0; the suite starts its own Postgres via Testcontainers, applies migrations, and runs `GET /api/health` through `app.request()` expecting `200` and body `{ "status": "ok", "db": "ok" }` (the handler runs `SELECT 1` on the injected pool).
- [ ] AC2 `pnpm dev` runs `docker compose up -d` then starts the API with `tsx watch`; migrations are applied on startup; `curl localhost:3000/api/health` returns the same body.
- [ ] AC3 Migration `0001_init.sql` creates `links(id, code UNIQUE, original_url, created_at, expires_at NULL)` and `clicks(id, link_id FK, referrer NULL, user_agent NULL, ip NULL, created_at)` with an index on `clicks(link_id, created_at)`; the runner records applied files in `schema_migrations` and is idempotent (a test applies twice and asserts no error and one row per file).
- [ ] AC4 Route stubs exist and are mounted in `app.ts` in this order: `health`, `links`, `urls`, `stats`, `web`, `redirect`; every stub is an empty Hono sub-app (so unmatched requests fall through to a `404` JSON `{ error }`). `app.test.ts` asserts only what stays true forever: `/api/health` → `200`, unknown `/api/nope` → `404` JSON. It must **not** assert stub behaviour — later issues own those modules and must not need to edit a shared test.
- [ ] AC5 `apps/api/test/fixtures.ts` exports `insertLink({ code, originalUrl, expiresAt? })` and `insertClick({ linkId, referrer?, userAgent?, ip?, createdAt? })` (raw SQL) and `test/db.ts` exports `truncateAll()`; a test uses both.
- [ ] AC6 `pnpm lint` (Biome) and `pnpm typecheck` (`tsc --noEmit`) pass at the root.
- [ ] AC7 Config is read from env with defaults `PORT=3000`, `BASE_URL=http://localhost:3000`, `DATABASE_URL=postgres://shortener:shortener@localhost:5432/shortener` matching `docker-compose.yml`.

## Out of scope
- Any real endpoint behaviour (shorten, redirect, urls, stats) — stubs only.
- `apps/web` and the Vite proxy (P4-01). CI workflow (deliberately omitted, see phases README).
- README content beyond a placeholder title (P3-01).

## Notes for implementer
- Relevant ADRs: api-stack-node-hono, persistence-postgres, testing-vitest-testcontainers,
  api-module-layout, lint-and-chart-tooling. Follow the layout in
  `docs/issues/url-shortener/README.md` exactly — later issues own those directories.
- Deps: `hono`, `@hono/node-server`, `pg`, `@types/pg`, `tsx`, `typescript`, `vitest`,
  `testcontainers`, `@testcontainers/postgresql`, `@biomejs/biome`. Pin versions.
- Stubs return nothing (empty sub-app → global 404 handler), never `501`; no later issue should have to change a status-code expectation in a file it doesn't own.
- Vitest: `globalSetup: ['test/global-setup.ts']`, `fileParallelism: false` (tests share one DB
  and truncate between them). Pass the container URL to workers via `provide('databaseUrl')` /
  `inject` — do not assume `process.env` set in global setup reaches workers; verify.
- Migration runner: read `db/migrations/*.sql` sorted, apply each inside a transaction, insert
  into `schema_migrations(name)`. Keep it ~40 lines; no library.
- `createApp({ pool, config })` returns the Hono app; `server.ts` is the only place that builds
  the pool from env and calls `serve()`.
- Pre-pull `postgres:16-alpine` before the live session so neither compose nor Testcontainers
  downloads during the demo.
