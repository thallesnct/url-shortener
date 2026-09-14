---
id: P2-01
title: Add GET /api/urls listing with click counts
prd: docs/prds/url-shortener.md
phase: 2
status: todo
blockers: [P0-01]
parallel: true
zones: [apps/api/src/urls/]
touches-shared: false
branch:
worktree:
pr:
gh:
---

# P2-01 — Add GET /api/urls listing with click counts

## Description
Implement the `urls` module: list all links, newest first, each with its click count. Covers
R10. Independent of P1-*: tests seed rows with the Phase 0 fixtures.

## Acceptance criteria
- [ ] AC1 With no links, `GET /api/urls` returns `200 []`.
- [ ] AC2 With three fixture links created at different times, the response is ordered by `createdAt` descending and each item has `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt, clickCount }`.
- [ ] AC3 `clickCount` equals the number of `clicks` rows for that link (0 for none, N after inserting N fixture clicks); other links' clicks are not counted.
- [ ] AC4 `shortUrl` is `config.baseUrl + '/' + shortCode`; `expiresAt` is `null` or ISO UTC.

## Out of scope
- Pagination (PRD open question — assume no). Filtering.

## Notes for implementer
- Relevant ADRs: api-module-layout (own `apps/api/src/urls/` only).
- One query: `LEFT JOIN` + `COUNT(clicks.id)` + `GROUP BY links.id ORDER BY created_at DESC`.
- Reuse nothing from `links/` (may be in flight); a `shortUrl` helper of one line is fine to duplicate.
