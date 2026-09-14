---
title: Frontend — React + Vite SPA in a pnpm monorepo, served by the API when built
status: accepted
date: 2026-09-14
deciders: user (make-prd)
supersedes:
---

# Frontend — React + Vite SPA in a pnpm monorepo, served by the API when built

## Context
`/analytics/:code` must be a visual page (total clicks, per-day chart, top referrers) that is
shareable by URL. The whole project must still start with one command and the analytics URL
must point at the API host, not a separate dev-server port.

## Decision
- **pnpm workspace** with `apps/api` (Hono) and `apps/web` (React + Vite + TypeScript).
- Root `pnpm dev` runs, concurrently: `docker compose up -d`, the API in watch mode, and the
  Vite dev server. **Vite proxies** `/api/*` and `/:code` to the API so the SPA is developed
  against real endpoints without CORS.
- **Root `pnpm build`** produces `apps/web/dist`; the API serves that directory and returns
  `index.html` for `/analytics/*`, so the shareable URL is always on the API's origin.
- The SPA is data-only over `GET /api/stats/:code`; it holds no state beyond the URL.
- Chart library is left to the implementer (smallest dependency that renders a bar chart).

## Alternatives considered
- **Server-rendered HTML via Hono JSX** — no second toolchain, testable with `app.request()`;
  rejected by the user in favour of a richer SPA.
- **Static HTML + fetch** — one file, but no component model for the chart/table.
- **SPA on its own port, no proxy** — two commands and CORS config; the shareable URL would
  point at the Vite port.
- **Serve only the built bundle in dev** — one process, but no HMR during the live session.

## Consequences
- Positive: proper UI with HMR during the demo; production-shaped serving path; single origin.
- Negative / cost: second toolchain and `node_modules`; root scripts (`concurrently`) and the
  Vite proxy are extra wiring; `/analytics/*` and `/:code` must not collide in the router.
- Follow-ups: keep route order explicit — `/api/*` and `/analytics/*` registered before `/:code`.
  Anchor the Vite proxy rule for short codes to the 7-char shape (`^/[A-Za-z0-9]{7}$`), not a
  catch-all — otherwise `/favicon.ico`, `/vite.svg` and every single-segment path hit the API.
