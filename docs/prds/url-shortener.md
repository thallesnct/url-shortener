---
title: URL Shortener with click analytics
slug: url-shortener
status: accepted
mode: lite
created: 2026-09-14
---

# URL Shortener with click analytics

## Summary
A self-hosted URL shortener: an HTTP API to create short links, redirect on access, and query
usage; every access is recorded as a click; a browser page per link shows analytics and is
shareable by URL. Built in a 1-hour live session where both the result (runs, tested, demoable)
and the process (how AI is directed and where it is second-guessed) are evaluated. Source of
truth for behaviour is the interview brief; anything the brief left free is fixed in *Decisions*.

## Problem & users
- **Link creator** — wants a short link for a long URL, optionally expiring, and wants to see
  how it performs (how many clicks, when, from where) without logging into anything.
- **Link visitor** — follows a short link and is sent to the original URL; expired or unknown
  links fail clearly.
- **Interviewers** — need to `install`, run one command, run tests with one command, and follow a
  short demo: create a link, click it a few times, open its analytics page.

## Goals
- G1 Working API + redirect + click tracking, runnable locally after `pnpm install` with one command.
- G2 A shareable analytics page per link showing totals, clicks per day (last 30 days), and top referrers.
- G3 Integration tests covering every endpoint, passing with one command.
- G4 A README with setup, run/test commands, and the stack justification.
- G5 A readable commit history that reflects the decisions taken.

## Non-goals
- Authentication, accounts, or per-user ownership of links (analytics pages are public by URL).
- Custom aliases / vanity codes.
- Rate limiting, abuse protection, bot filtering.
- Geo-IP, device parsing beyond storing the raw user-agent.
- Deleting or editing links after creation.
- Deployment / hosting beyond local docker-compose.

## Functional requirements

### Link creation
- **R1** `POST /api/shorten` accepts JSON `{ url: string, expiresAt?: string }` and responds
  `201` with `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt }` (`expiresAt` is `null`
  when not provided; timestamps are ISO-8601 UTC).
- **R2** `url` is accepted only if it parses as an absolute URL whose scheme is `http` or
  `https`; anything else (missing, malformed, other scheme, non-string) yields `400` with a JSON
  error body `{ error: string }`.
- **R3** `expiresAt`, when present, must be a valid ISO-8601 datetime strictly in the future;
  otherwise `400`.
- **R4** `shortCode` is 7 characters from `[A-Za-z0-9]`, generated randomly; on the (rare)
  collision the generation retries rather than failing.
- **R5** `shortUrl` is `<BASE_URL>/<shortCode>`, where `BASE_URL` comes from configuration and
  defaults to the address the server is listening on.

### Redirect & click tracking
- **R6** `GET /:code` responds `301` with `Location: <originalUrl>` for an existing,
  non-expired link. (Known trade-off: browsers cache 301, so repeat clicks by the same browser
  may not reach the server — see *Decisions*. The demo therefore generates clicks with `curl`,
  which does not cache.)
- **R7** `GET /:code` responds `404` (JSON error body) when no link has that code.
- **R8** `GET /:code` responds `410` (JSON error body) when the link exists but `expiresAt` is
  in the past at request time. No click is recorded for `404`/`410`.
- **R9** Every successful redirect records one click with: `referrer` (from the `Referer`
  header, `null` when absent), `userAgent` (`User-Agent` header, `null` when absent), `ip`
  (first address in `X-Forwarded-For` when present, else the socket remote address), and a UTC
  timestamp. Recording the click must not delay or fail the redirect for the visitor beyond
  what a single insert costs.

### Listing & stats
- **R10** `GET /api/urls` returns `200` with an array of links, most recently created first,
  each `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt, clickCount }`.
- **R11** `GET /api/stats/:code` returns `200` with `{ shortCode, originalUrl, totalClicks,
  clicksByDay, topReferrers }` where:
  - `clicksByDay` is an array of `{ day: "YYYY-MM-DD", clicks: number }` covering the last 30
    days (UTC) including today, in ascending order, with zero-filled days for gaps;
  - `topReferrers` is an array of `{ referrer: string | null, clicks: number }`, descending by
    clicks, at most 10 entries; absent referrers are grouped under `null` (rendered as
    "direct" in the UI).
- **R12** `GET /api/stats/:code` returns `404` for an unknown code. Expired links still
  return stats (`200`) — expiry only affects redirects.

### Analytics page
- **R13** `GET /analytics/:code` serves a browser page (the SPA) that shows, for that link:
  the original URL and short URL, total clicks, clicks per day for the last 30 days as a chart,
  and the top referrers as a table. Data comes from `GET /api/stats/:code`.
- **R14** The page is shareable by copy-pasting its URL: it works on a fresh browser session
  with no login or local state, and shows a clear "not found" state for unknown codes.
- **R15** The page has a control to copy the short URL to the clipboard.

## Non-functional requirements
- **N1** After `pnpm install`, `pnpm dev` is the single command that brings up the database
  (docker-compose), applies migrations, and starts the API and the web app; the README states
  the URLs to open.
- **N2** `pnpm test` is the single command that runs the whole suite and exits non-zero on any
  failure; it needs Docker running and nothing else pre-started.
- **N3** Every endpoint in R1–R12 has at least one integration test hitting the real HTTP
  handler and a real Postgres; R13/R14 have at least a smoke test that the page route serves
  the app shell.
- **N4** Configuration (database URL, port, `BASE_URL`) is read from environment variables with
  working defaults matching docker-compose, so a clean clone runs with no `.env` editing.
- **N5** Schema changes are SQL migration files applied automatically on API startup and before
  tests; no manual `psql` steps.
- **N6** README covers: prerequisites (Node 24, pnpm, Docker), install, run, test, the stack and
  persistence justification, and the deviations/trade-offs listed under *Decisions*.
- **N7** Commit history is Conventional Commits, one logical change per commit.
- **N8** `pnpm demo` (script against a running `pnpm dev`) creates a link, performs several
  clicks with `curl` using varied `Referer` headers, and prints the short URL and the analytics
  URL to open — the end-of-session demo in one command.

## Priority
The hour is the hard constraint. `break-prd-down` phases should respect this cut line.
- **Must ship** — R1–R12, N1–N2, N4–N5, N8: API, redirect with tracking, stats, tests green,
  one-command run and demo. This alone is a passing deliverable.
- **Should ship** — R13–R15 (the SPA), N3's web smoke test, N6–N7 polish. If time runs short,
  a minimal analytics page (totals + table, chart last) beats a half-finished chart.

## Decisions
Every technical decision made while writing this PRD, each backed by an ADR.

| Decision | Choice | ADR |
|---|---|---|
| Runtime & HTTP framework | Node 24 + TypeScript + Hono | [2026-09-14-api-stack-node-hono](../adr/2026-09-14-api-stack-node-hono.md) |
| Persistence | Postgres via docker-compose, plain SQL (`pg`), file-based migrations | [2026-09-14-persistence-postgres](../adr/2026-09-14-persistence-postgres.md) |
| Frontend & repo layout | React + Vite SPA in a pnpm monorepo (`apps/api`, `apps/web`), single root `dev` script, built assets served by the API | [2026-09-14-frontend-react-vite-monorepo](../adr/2026-09-14-frontend-react-vite-monorepo.md) |
| Testing | Vitest, integration-first via Hono `app.request()`, Testcontainers Postgres | [2026-09-14-testing-vitest-testcontainers](../adr/2026-09-14-testing-vitest-testcontainers.md) |
| API module layout | `createApp(deps)`, one sub-app per module mounted in fixed order in Phase 0, full schema in one migration, co-located tests | [2026-09-14-api-module-layout](../adr/2026-09-14-api-module-layout.md) |
| Lint & chart tooling | Biome for lint/format; Recharts for the clicks-per-day chart | [2026-09-14-lint-and-chart-tooling](../adr/2026-09-14-lint-and-chart-tooling.md) |
| Redirect status | `301` as the brief suggests; browser-caching trade-off accepted and documented, demo uses `curl` | [2026-09-14-redirect-301-tradeoff](../adr/2026-09-14-redirect-301-tradeoff.md) |
| Client IP | First entry of `X-Forwarded-For`, else socket address; no trusted-proxy list (non-goal) | folded into the redirect ADR |
| Analytics access | Public by URL, no token — "easy to share"; auth is a non-goal | folded into the redirect ADR |

## Open questions
Anything unresolved when the question loop ended.

| Question | Must decide before |
|---|---|
| Whether `GET /api/urls` needs pagination — assume no for the demo scale. | Only if raised by the interviewers |

## Phases & issues
Breakdown: [docs/issues/url-shortener/README.md](../issues/url-shortener/README.md).

- **Phase 0 — Walking skeleton**: monorepo, Hono app with route stubs, Postgres + full schema, Vitest/Testcontainers, Biome, root scripts, DB-backed health test.
- **Phase 1 — Create and redirect**: `POST /api/shorten` and `GET /:code` with click recording (R1–R9).
- **Phase 2 — Listing and stats**: `GET /api/urls` and `GET /api/stats/:code` (R10–R12); runs alongside Phase 1.
- **Phase 3 — Demo script and README**: `pnpm demo` + README (N6, N8) — closes the must-ship set.
- **Phase 4 — Analytics page** (should-ship): `apps/web` SPA served at `/analytics/:code` (R13–R15).

<!-- issues:start -->
### Phase 0 (1/1 done)
- [x] [P0-01](../issues/url-shortener/P0-01-walking-skeleton-monorepo-api-postgres-tests.md) Scaffold monorepo, Hono API, Postgres, migrations and test harness

### Phase 1 (2/2 done)
- [x] [P1-01](../issues/url-shortener/P1-01-add-post-api-shorten.md) Add POST /api/shorten with URL validation and code generation
- [x] [P1-02](../issues/url-shortener/P1-02-add-redirect-with-click-tracking.md) Add GET /:code redirect with 404/410 and click recording

### Phase 2 (2/2 done)
- [x] [P2-01](../issues/url-shortener/P2-01-add-get-api-urls-listing.md) Add GET /api/urls listing with click counts
- [x] [P2-02](../issues/url-shortener/P2-02-add-get-api-stats-code.md) Add GET /api/stats/:code with clicksByDay and topReferrers

### Phase 3 (1/1 done)
- [x] [P3-01](../issues/url-shortener/P3-01-add-demo-script-and-readme.md) Add pnpm demo script and README with stack justification

### Phase 4 (1/2 done)
- [x] [P4-01](../issues/url-shortener/P4-01-scaffold-web-app-proxy-and-static-serving.md) Scaffold apps/web with Vite proxy and serve built SPA at /analytics
- [ ] [P4-02](../issues/url-shortener/P4-02-build-analytics-page.md) Build the analytics page with chart, referrers and copy link `todo`
<!-- issues:end -->
