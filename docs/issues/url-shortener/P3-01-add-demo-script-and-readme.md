---
id: P3-01
title: Add pnpm demo script and README with stack justification
prd: docs/prds/url-shortener.md
phase: 3
status: in-progress
blockers: [P1-01, P1-02, P2-01, P2-02]
parallel: false
zones: [scripts/demo.sh, README.md, package.json]
touches-shared: true
branch: feat/demo-script-and-readme
worktree: .worktrees/feat/demo-script-and-readme
pr:
gh:
---

# P3-01 — Add pnpm demo script and README with stack justification

## Description
Close the must-ship set: a one-command demo that exercises the whole API with `curl`, and the
README the interviewers will follow. Covers N6, N8 and documents the 301 trade-off from the
redirect ADR. Nothing in this issue is exercised by `pnpm test` (the demo needs the dev
stack on a fixed port; the suite uses Testcontainers).

## Acceptance criteria
- [ ] AC1 `scripts/demo.sh` (run via root `pnpm demo`) against a running `pnpm dev`: POSTs a link to `/api/shorten`, performs 5 `curl` requests to the short URL with at least 3 distinct `Referer` values (one with none), fetches `/api/stats/<code>`, and prints the short URL, the stats JSON and the analytics URL `http://localhost:3000/analytics/<code>`. Exits non-zero on any non-2xx/3xx response. Verified by hand, not by the suite.
- [ ] AC2 `README.md` has sections: prerequisites (Node 24, pnpm, Docker), install, run (`pnpm dev` + URLs), test (`pnpm test`), demo (`pnpm demo`), API reference (the five endpoints with one `curl` each), stack and persistence justification (from the ADRs), trade-offs (301 caching and why the demo uses curl; public analytics URLs; X-Forwarded-For unvalidated).
- [ ] AC3 README is ≤ ~120 lines and every command in it works as written.

## Out of scope
- Automated test of the demo script (would couple `pnpm test` to the dev stack — see PRD N2).
- The analytics page itself (P4-*); the README may link to `/analytics/:code` as "Phase 4".

## Notes for implementer
- Relevant ADRs: all five stack ADRs (summarise their *Decision* sections in the README — do not re-argue them), redirect-301-tradeoff.
- `curl -s -o /dev/null -w '%{http_code}'` for click loops; `curl -H 'Referer: https://twitter.com/'`.
- Root `package.json` gets `"demo": "bash scripts/demo.sh"` — that edit is why this issue is `touches-shared`.
