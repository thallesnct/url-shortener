---
id: P1-02
title: Add GET /:code redirect with 404/410 and click recording
prd: docs/prds/url-shortener.md
phase: 1
status: todo
blockers: [P0-01]
parallel: true
zones: [apps/api/src/redirect/, apps/api/src/clicks/]
touches-shared: false
branch:
worktree:
pr:
gh:
---

# P1-02 — Add GET /:code redirect with 404/410 and click recording

## Description
Implement the redirect module: look up the link by code, answer `301`/`404`/`410`, and on a
successful redirect insert one click with referrer, user-agent, ip and timestamp. Covers
R6–R9. Tests seed links via the Phase 0 fixtures, so this does not depend on P1-01.

## Acceptance criteria
- [ ] AC1 For a fixture link with no expiry, `GET /:code` returns `301` with `Location` equal to the original URL.
- [ ] AC2 Unknown code returns `404` with JSON `{ error }`; no click row is inserted.
- [ ] AC3 Fixture link with `expiresAt` in the past returns `410` with JSON `{ error }`; no click row is inserted. A link expiring in the future still redirects.
- [ ] AC4 A successful redirect inserts exactly one `clicks` row with `referrer` from the `Referer` header, `user_agent` from `User-Agent`, and `created_at` within a few seconds of now; absent headers are stored as `NULL`.
- [ ] AC5 `ip` is the first comma-separated entry of `X-Forwarded-For` when present (`"1.2.3.4, 10.0.0.1"` → `1.2.3.4`); otherwise the socket address (`null` is acceptable under `app.request()` where there is no socket).
- [ ] AC6 Codes that don't match `^[A-Za-z0-9]{7}$` return `404` without querying.

## Out of scope
- Stats aggregation (P2-02). Cache-Control headers (301 as written — ADR redirect-301-tradeoff).

## Notes for implementer
- Relevant ADRs: redirect-301-tradeoff, api-module-layout (`redirect` sub-app is mounted last; own `apps/api/src/redirect/` and `apps/api/src/clicks/` only).
- Keep the lookup query in the redirect module (`SELECT id, original_url, expires_at FROM links WHERE code = $1`); do not import from `links/` — P1-01 may be in flight.
- `clicks/repo.ts` exposes `recordClick(pool, {...})`; the redirect handler awaits the insert before responding (one insert; acceptable per R9).
- Socket address under `@hono/node-server`: `getConnInfo(c).remote.address` — guard for undefined in tests.
