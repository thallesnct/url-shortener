# URL shortener with click analytics

Create short links, redirect on access, record every click, and query per-link stats.
Node 24 + TypeScript + Hono API over Postgres, in a pnpm monorepo (`apps/api`; `apps/web` in Phase 4).

## Prerequisites

- Node 24 (`node --version`)
- pnpm 9 (`corepack enable` picks the pinned version from `package.json`)
- Docker with the Compose plugin, running (`docker info`) — used by both `pnpm dev` and `pnpm test`

## Install

```sh
pnpm install
```

## Run

```sh
pnpm dev   # docker compose up -d --wait (Postgres 16 on :5432) → migrations → API on http://localhost:3000
```

- API: `http://localhost:3000` — `curl http://localhost:3000/api/health` → `{"status":"ok","db":"ok"}`
- Analytics page: `http://localhost:3000/analytics/<code>` (Phase 4, not served yet)

Configuration is read from the environment with defaults that match `docker-compose.yml`, so a
clean clone needs no `.env`: `PORT=3000`, `BASE_URL=http://localhost:3000`,
`DATABASE_URL=postgres://shortener:shortener@localhost:5432/shortener`. Ctrl-C stops the API; `docker compose down` stops Postgres.

## Test

```sh
pnpm test        # Vitest; starts its own throwaway Postgres via Testcontainers — needs Docker, nothing pre-started
pnpm lint        # Biome
pnpm typecheck   # tsc --noEmit
```

## Demo

With `pnpm dev` running in another terminal:

```sh
pnpm demo        # BASE_URL=http://localhost:4000 pnpm demo to point elsewhere
```

`scripts/demo.sh` creates a link, follows it five times with `curl` under three distinct
`Referer` values plus one request without any, then prints the stats JSON, the short URL and
the analytics URL. It exits non-zero on the first non-2xx/3xx response.

## API reference

Errors are always JSON: `{ "error": "<message>" }`. Timestamps are ISO-8601 UTC.

```sh
# 201 { shortCode, shortUrl, originalUrl, createdAt, expiresAt }
curl -X POST http://localhost:3000/api/shorten -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/docs","expiresAt":"2030-01-01T00:00:00Z"}'
```
`url` must be an absolute `http(s)` URL of at most 2048 characters; `originalUrl` echoes its
normalised form (`https://example.com` → `https://example.com/`). `expiresAt` is optional, must be
in the future, and is read as UTC when it has no offset. Anything else → `400`.

```sh
# 301 Location: <originalUrl> and one click recorded; 404 unknown code; 410 expired (no click)
curl -i http://localhost:3000/<code> -H 'Referer: https://twitter.com/'
```

```sh
# 200 [ { shortCode, shortUrl, originalUrl, createdAt, expiresAt, clickCount }, … ] newest first
curl http://localhost:3000/api/urls
```

```sh
# 200 { shortCode, originalUrl, totalClicks, clicksByDay, topReferrers }; 404 unknown code
curl http://localhost:3000/api/stats/<code>
```
`clicksByDay` is the last 30 UTC days including today, ascending, zero-filled
(`{ day: "YYYY-MM-DD", clicks }`); `topReferrers` is at most 10 `{ referrer, clicks }` by clicks
descending, missing referrers grouped under `null`. Expired links still return stats.

```sh
# 200 { status: "ok", db: "ok" }; 503 when Postgres is unreachable
curl http://localhost:3000/api/health
```

## Stack and persistence

Decisions were taken up front and recorded in [`docs/adr/`](docs/adr/); this is the summary.

- **Node 24 + TypeScript + Hono** ([ADR](docs/adr/2026-09-14-api-stack-node-hono.md)): the runtime
  reviewers already have; `tsx` runs the TypeScript directly, so there is no build step. Hono is
  a minimal router on Web-standard `Request`/`Response`, so every endpoint is tested in-process
  through `app.request()` without opening a socket.
- **Postgres via docker-compose, plain SQL** ([ADR](docs/adr/2026-09-14-persistence-postgres.md)):
  data survives restarts and the analytics aggregations (`clicksByDay`, `topReferrers`) are real
  SQL (`GROUP BY`) instead of JS loops. The `pg` driver with hand-written queries — two tables and
  a handful of queries do not justify an ORM. Numbered `.sql` migrations are applied by a small
  in-repo runner at API startup and before tests.
- **Vitest, integration-first, Testcontainers** ([ADR](docs/adr/2026-09-14-testing-vitest-testcontainers.md)):
  each run starts an ephemeral Postgres, so tests prove the actual SQL and never share state with
  `pnpm dev`. Unit tests only where logic is pure (URL validation, code generation, day fill).
- **One module per feature, `createApp(deps)`** ([ADR](docs/adr/2026-09-14-api-module-layout.md)):
  `apps/api/src/<module>/routes.ts` sub-apps mounted in a fixed order (`/api/*` before the `/:code`
  catch-all), the pool injected rather than imported, tests co-located.
- **pnpm monorepo, React + Vite SPA served by the API** ([ADR](docs/adr/2026-09-14-frontend-react-vite-monorepo.md)),
  **Biome + Recharts** ([ADR](docs/adr/2026-09-14-lint-and-chart-tooling.md)): Phase 4 — the
  analytics page is built to `apps/web/dist` and served on the API origin so its URL is shareable.

## Trade-offs

- **`301` and click counting** ([ADR](docs/adr/2026-09-14-redirect-301-tradeoff.md)): the brief
  asks for `301`, but browsers cache a permanent redirect and follow it locally, so repeat visits
  from the same browser never reach the server and are under-counted. Kept as specified; the demo
  generates clicks with `curl`, which does not cache, so the numbers it shows are real. Switching
  to `302` is a one-token change if accurate counting matters more than the letter of the brief.
- **Analytics is public by URL**: `/analytics/<code>` and `/api/stats/<code>` need no token or
  login — "easy to share" wins, and auth is a non-goal.
- **`X-Forwarded-For` is trusted as-is**: the recorded `ip` is the first entry of that header when
  present, else the socket address. No trusted-proxy list, so it is spoofable; fine for a local demo.
