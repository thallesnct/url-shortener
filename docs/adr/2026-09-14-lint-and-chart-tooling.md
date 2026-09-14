---
title: Dev tooling — Biome for lint/format, Recharts for the analytics chart
status: accepted
date: 2026-09-14
deciders: user (break-prd-down)
supersedes:
---

# Dev tooling — Biome for lint/format, Recharts for the analytics chart

## Context
Phase 0 needs a `lint` gate and the analytics page needs a bar chart. The PRD left the chart
library open; the breakdown must fix both so implementers don't pick divergent tools.

## Decision
- **Biome** (`biome.json` at the root) is the single lint + format tool for both workspaces.
  `pnpm lint` = `biome check .`; `pnpm typecheck` = `tsc --noEmit` per workspace.
- **Recharts** renders clicks-per-day as a `<BarChart>` in `apps/web`. No other chart
  dependency.

## Alternatives considered
- **ESLint + Prettier** — conventional, but typescript-eslint + react plugin config costs
  minutes the hour doesn't have.
- **tsc only** — fastest, but no style gate for reviewers.
- **Chart.js + react-chartjs-2** — two deps and imperative canvas wiring.
- **Inline SVG bars** — zero deps, but no axes/tooltips without hand-rolling.

## Consequences
- Positive: one config file for lint/format; declarative chart component.
- Negative / cost: Biome's rule set differs from ESLint defaults reviewers may expect; Recharts
  adds ~100 kB to the bundle.
- Follow-ups: none.
