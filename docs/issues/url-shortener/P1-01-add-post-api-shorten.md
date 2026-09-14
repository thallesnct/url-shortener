---
id: P1-01
title: Add POST /api/shorten with URL validation and code generation
prd: docs/prds/url-shortener.md
phase: 1
status: in-progress
blockers: [P0-01]
parallel: true
zones: [apps/api/src/links/]
touches-shared: false
branch: feat/shorten-endpoint
worktree: .worktrees/feat/shorten-endpoint
pr:
gh:
---

# P1-01 — Add POST /api/shorten with URL validation and code generation

## Description
Implement link creation in the `links` module: validate the body, generate a 7-char
alphanumeric code with collision retry, insert the row, return the contract. Covers R1–R5.

## Acceptance criteria
- [ ] AC1 `POST /api/shorten` with `{ "url": "https://example.com/a?b=1" }` returns `201` and `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt: null }`; `shortCode` matches `^[A-Za-z0-9]{7}$`, `shortUrl === config.baseUrl + '/' + shortCode`, `createdAt` is ISO-8601 UTC, and the row exists in `links`.
- [ ] AC2 `400` with `{ error }` for: missing body, non-JSON body, `url` not a string, `ftp://…`, `javascript:…`, `example.com` (no scheme), empty string.
- [ ] AC3 `{ url, expiresAt }` with a valid future ISO datetime returns `201` echoing `expiresAt` as ISO UTC; a past datetime or a non-date string returns `400`.
- [ ] AC4 Code generation is unit-tested: 7 chars, alphabet `[A-Za-z0-9]`, uses `crypto.randomBytes`/`getRandomValues` (not `Math.random`).
- [ ] AC5 On unique-violation (`23505`) the insert retries with a new code (at least 3 attempts) — tested by pre-inserting a fixture link with the code the stubbed generator returns first.

## Out of scope
- `GET /api/urls` (P2-01). Redirect (P1-02). Custom aliases, rate limiting.

## Notes for implementer
- Relevant ADRs: api-module-layout (own `apps/api/src/links/` only; `app.ts` already mounts the stub), api-stack-node-hono.
- Validation: `new URL(url)` + `protocol in {'http:','https:'}`; no validation library needed.
- Insert with `RETURNING`; catch `err.code === '23505'` for retry. Make the generator injectable so AC5 can stub it.
- Files: `apps/api/src/links/routes.ts`, `links/validate.ts`, `links/code.ts`, `links/repo.ts`, tests alongside. Use `insertLink` from `apps/api/test/fixtures.ts`.
