---
id: P4-02
title: Build the analytics page with chart, referrers and copy link
prd: docs/prds/url-shortener.md
phase: 4
status: todo
blockers: [P4-01, P2-02]
parallel: true
zones: [apps/web/src/]
touches-shared: false
branch:
worktree:
pr:
gh:
---

# P4-02 — Build the analytics page with chart, referrers and copy link

## Description
Implement the `/analytics/:code` page: fetch `GET /api/stats/:code`, show original and short
URL, total clicks, a Recharts bar chart of the last 30 days, a top-referrers table, a copy
button, and loading / not-found states. Covers R13–R15.

## Acceptance criteria
- [ ] AC1 With a mocked `fetch` returning a stats payload, the page renders the original URL, the short URL, and `totalClicks`.
- [ ] AC2 `clicksByDay` renders as a bar chart (Recharts `BarChart` present with 30 data points) and `topReferrers` as a table where `null` shows as "direct".
- [ ] AC3 A `404` from the API renders a "link not found" state with the code; a network error renders an error state with a retry button.
- [ ] AC4 The copy button writes the short URL to `navigator.clipboard` (mocked in test) and shows "Copied" feedback.
- [ ] AC5 The page works on a fresh session: no reads from localStorage/sessionStorage; the only input is the URL.
- [ ] AC6 `pnpm build` succeeds and `pnpm lint`/`pnpm typecheck` pass.

## Out of scope
- Auth, editing links, links list page, date-range picker.

## Notes for implementer
- Relevant ADRs: frontend-react-vite-monorepo, lint-and-chart-tooling (Recharts only).
- Fetch relative `/api/stats/${code}` — works under the Vite proxy and when served by the API.
- Recharts renders `ResponsiveContainer` as 0×0 in jsdom; give the chart fixed width/height in tests or assert on the data passed rather than pixels.
- Keep it one route component plus two small presentational components; no state library.
