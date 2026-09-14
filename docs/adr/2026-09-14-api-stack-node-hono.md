---
title: API stack — Node 24 + TypeScript + Hono
status: accepted
date: 2026-09-14
deciders: user (make-prd)
supersedes:
---

# API stack — Node 24 + TypeScript + Hono

## Context
The URL shortener (PRD `url-shortener`) must be built from scratch in a 1-hour live session, run
with one command after install, and have integration tests that run with one command. The brief
leaves the stack free but asks for the choice to be justified. The machine has Node 24.18,
pnpm 9, Bun 1.3 and Go available.

## Decision
- Runtime **Node 24** (LTS line, ships stable `fetch`, `--watch`, and TypeScript type-stripping;
  what reviewers are most likely to have installed).
- Language **TypeScript**, executed with `tsx` in dev — no compile step to keep running.
- HTTP framework **Hono**: minimal router on Web-standard `Request`/`Response`, so the whole app
  is testable in-process via `app.request()` without opening a socket; also serves static assets
  for the built SPA.
- Package manager **pnpm** with workspaces (see the frontend/monorepo ADR).

## Alternatives considered
- **Fastify** — more batteries (schema validation, plugin ecosystem) but more boilerplate for
  four endpoints; `inject()` offers similar in-process testing. Not worth the extra surface in
  an hour.
- **Express** — familiar, but callback-style, no Web-standard types, weak TypeScript story.
- **Bun + Hono** — fastest startup and built-in sqlite/test runner, but fewer reviewers have Bun
  installed and the persistence decision moved to Postgres anyway.
- **Go + net/http** — single binary, but slower to write JSON handlers and a UI in the time box.

## Consequences
- Positive: tiny dependency footprint; endpoints and the analytics page route are tested
  through the same `app.request()` path; no build step for the API.
- Negative / cost: Hono is less known than Express — README must state why. Type-only
  validation of request bodies has to be written by hand (or via a small validator).
- Follow-ups: none.
