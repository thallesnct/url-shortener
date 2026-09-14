# URL Shortener with click analytics — phases

PRD: [docs/prds/url-shortener.md](../../prds/url-shortener.md)

Time box: 1 hour live. Every implementer session pays a worktree + `pnpm install` + Postgres
container tax, so issues are deliberately coarse (8 total) and must-ship work (Phases 0–3)
completes before should-ship work (Phase 4).

## Phase 0 — Walking skeleton
**Goal:** pnpm monorepo, Hono API with `createApp(deps)` and every route stub mounted in fixed
order, Postgres via compose, migration runner + full schema, Vitest + Testcontainers global
setup, Biome, root scripts (`dev`, `test`, `lint`, `typecheck`), one end-to-end health test
that hits the database.
**Exit criteria:** `pnpm install && pnpm test` is green from a clean clone with Docker running;
`pnpm dev` serves `GET /api/health` → `200 {"status":"ok","db":"ok"}`; `pnpm lint` and
`pnpm typecheck` pass.
**Depends on ADRs:** api-stack-node-hono, persistence-postgres, testing-vitest-testcontainers,
api-module-layout, lint-and-chart-tooling.

## Phase 1 — Create and redirect
**Goal:** `POST /api/shorten` and `GET /:code` with click recording — a short link can be
created and followed with `curl`, and the click row lands in Postgres.
**Exit criteria:** R1–R9 covered by integration tests; `curl -X POST … /api/shorten` then
`curl -i localhost:3000/<code>` returns `301` and `clicks` has one more row.
**Depends on ADRs:** api-module-layout, redirect-301-tradeoff.

## Phase 2 — Listing and stats
**Goal:** `GET /api/urls` and `GET /api/stats/:code` — the analytics data the page will show.
Independent of Phase 1 (tests seed rows through the Phase 0 fixtures), so it runs in the same
batch.
**Exit criteria:** R10–R12 covered by integration tests including 30-day zero-fill and
referrer ranking.
**Depends on ADRs:** api-module-layout, persistence-postgres.

## Phase 3 — Demo script and README
**Goal:** `pnpm demo` creates a link, clicks it several times with `curl` and prints the
analytics URL; README covers setup, run, test, stack justification and the 301 trade-off.
This closes the must-ship set.
**Exit criteria:** N6, N8 met; a reviewer can follow the README end-to-end.
**Depends on ADRs:** redirect-301-tradeoff, all stack ADRs (for the justification text).

## Phase 4 — Analytics page (should-ship)
**Goal:** `apps/web` React/Vite SPA served at `/analytics/:code` from the API origin, showing
totals, a Recharts bar chart of the last 30 days, top referrers, copy-short-URL, not-found
state. Root `pnpm dev` runs compose + API + Vite.
**Exit criteria:** R13–R15 met; `pnpm build && pnpm dev` then opening
`http://localhost:3000/analytics/<code>` shows real numbers.
**Depends on ADRs:** frontend-react-vite-monorepo, lint-and-chart-tooling.

## Shared manifests in this repo
Files that force serialised execution (from `execution.sharedManifests` plus anything discovered):
- `package.json`, `apps/*/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `tsconfig*.json` (root and per app), `biome.json`
- `docker-compose.yml`
- `apps/api/src/db/migrations/**`
- `apps/api/src/app.ts` (route registry — mounts sub-apps in fixed order)
- `apps/api/test/**` (Testcontainers global setup, `truncateAll`, fixtures)
- `apps/api/vitest.config.ts`, `apps/web/vite.config.ts`

## Codebase notes
What `break-prd-down` learned about the existing code that implementers must respect:
- **Greenfield.** At breakdown time the repo contains only the workflow scaffold
  (`.claude/`, `docs/`, `scripts/workflow/`). No manifests, no code. Phase 0 creates everything
  below.
- **Test runner / how to run one file:** Vitest. Root `pnpm test` runs both workspaces
  (`pnpm -r test`). One file: `pnpm --filter api exec vitest run src/links/shorten.test.ts`.
  API tests need Docker (Testcontainers starts one Postgres per run in `test/global-setup.ts`).
  Vitest must run API test files **serially** (`fileParallelism: false`) because they share one
  database and `truncateAll` between tests.
- **Layout conventions** (ADR api-module-layout):
  ```
  package.json  pnpm-workspace.yaml  docker-compose.yml  biome.json  README.md
  scripts/demo.sh
  apps/api/src/app.ts            createApp({ pool, config }) — mounts sub-apps, fixed order
  apps/api/src/server.ts         node entry: run migrations, listen on PORT
  apps/api/src/config.ts         env → { port, baseUrl, databaseUrl }
  apps/api/src/db/{pool,migrate}.ts  + db/migrations/0001_init.sql (links, clicks, indexes)
  apps/api/src/<module>/routes.ts    health · links · urls · stats · web · redirect
  apps/api/src/<module>/*.test.ts    co-located tests
  apps/api/test/{global-setup,db,fixtures}.ts
  apps/web/                          Vite + React (Phase 4)
  ```
- **Route order** in `app.ts`: `health`, `links` (`/api/shorten`), `urls` (`/api/urls`),
  `stats` (`/api/stats/:code`), `web` (`/analytics/*`), `redirect` (`/:code`) — last.
- **Dependency injection:** no module imports a global pool. `createApp(deps)` passes it down;
  tests build the app with the container pool.
- **Config defaults** must match `docker-compose.yml` so a clean clone runs without `.env`:
  `DATABASE_URL=postgres://shortener:shortener@localhost:5432/shortener`, `PORT=3000`,
  `BASE_URL=http://localhost:3000`.
- **CI is deliberately omitted.** The brief grades a local run and one-command tests; a GitHub
  workflow is a shared manifest that would cost a serial session. Add one after the session if
  the repo is pushed.
- **Existing modules touched by this PRD:** none (greenfield).
