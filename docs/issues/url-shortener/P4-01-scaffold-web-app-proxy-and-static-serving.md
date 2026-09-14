---
id: P4-01
title: Scaffold apps/web with Vite proxy and serve built SPA at /analytics
prd: docs/prds/url-shortener.md
phase: 4
status: in-progress
blockers: [P0-01]
parallel: false
zones: [apps/web/, apps/api/src/web/, package.json, pnpm-workspace.yaml, pnpm-lock.yaml, biome.json]
touches-shared: true
branch: feat/scaffold-web-app-proxy-and-static-serving
worktree: /Users/thallesncarvalho/dev/blueprint-ai/.worktrees/feat/scaffold-web-app-proxy-and-static-serving
pr:
gh:
---

# P4-01 — Scaffold apps/web with Vite proxy and serve built SPA at /analytics

## Description
Add the React + Vite + TypeScript workspace, wire the root `dev` script to run compose + API +
Vite concurrently, proxy API and short-code requests to the API, and make the API serve the
built bundle so `/analytics/:code` lives on the API origin. Covers N1 (web part), the serving
half of R13/R14 and N3's smoke test. Page content is P4-02.

## Acceptance criteria
- [ ] AC1 `apps/web` is a Vite React TS app with `react-router` routes `/analytics/:code` (placeholder component showing the code) and a catch-all "not found"; `pnpm --filter web test` runs a Vitest + Testing Library smoke test rendering the placeholder for a code.
- [ ] AC2 `vite.config.ts` proxies `/api` and `^/[A-Za-z0-9]{7}$` to `http://localhost:3000`; nothing else is proxied (`/vite.svg`, `/favicon.ico` stay on Vite).
- [ ] AC3 Root `pnpm dev` runs `docker compose up -d`, then `concurrently` the API (`tsx watch`) and Vite; root `pnpm build` builds the web app; `pnpm test`, `pnpm lint`, `pnpm typecheck` still cover both workspaces and pass.
- [ ] AC4 The API `web` module serves `apps/web/dist` statically and returns `dist/index.html` for any `GET /analytics/*`; an API test asserts `GET /analytics/abc1234` → `200`, `content-type: text/html` when a fixture `index.html` exists, and that `/api/*` and `/:code` routes are unaffected.
- [ ] AC5 Recharts and `react-router` are installed in `apps/web` (P4-02 must not touch manifests).

## Out of scope
- Real page content, stats fetching, chart, copy button (P4-02).

## Notes for implementer
- Relevant ADRs: frontend-react-vite-monorepo (proxy anchoring gotcha in *Follow-ups*), api-module-layout (`web` stub is mounted before `redirect`), lint-and-chart-tooling.
- `@hono/node-server/serve-static` with `root: '../web/dist'` resolved relative to the API package; return `index.html` for `/analytics/*` regardless of file existence (SPA fallback).
- Make the dist path configurable (`WEB_DIST` env) so the API test can point at a temp dir with a fixture `index.html`.
- Biome: extend `biome.json` for JSX/`apps/web` if needed — that and the lockfile are why this is `touches-shared`.
