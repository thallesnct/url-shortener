---
title: Persistence — Postgres via docker-compose with plain SQL
status: accepted
date: 2026-09-14
deciders: user (make-prd)
supersedes:
---

# Persistence — Postgres via docker-compose with plain SQL

## Context
Links and clicks must survive restarts during the demo, and the analytics endpoint needs
aggregations (clicks per day over 30 days, top referrers). The brief allows any persistence
("SQLite, Postgres, Redis, file, in-memory") but asks for the choice to be defended. Docker is
available on the machine.

## Decision
- **Postgres** started by `docker-compose.yml` at the repo root, one service, default
  credentials matching the API's default `DATABASE_URL` so a clean clone runs without editing.
- Access via the **`pg`** driver with hand-written SQL — no ORM, no query builder. Two tables:
  `links` (code, original_url, created_at, expires_at) and `clicks` (link id, referrer,
  user_agent, ip, created_at).
- **Migrations are numbered `.sql` files** applied at API startup and before tests by a small
  in-repo runner (tracked in a `schema_migrations` table). No external migration tool.
- Aggregations (`clicksByDay`, `topReferrers`) are done in SQL (`date_trunc`, `GROUP BY`), with
  day zero-filling done in application code.

## Alternatives considered
- **SQLite via `node:sqlite`** — zero external deps and `:memory:` in tests; rejected by the user
  in favour of a production-like engine.
- **In-memory Map** — fastest to write, but data is lost on every restart and aggregations
  would live in JS; weak story to defend.
- **Redis** — good for the redirect hot path, poor fit for 30-day aggregations without extra
  structures.
- **ORM (Drizzle/Prisma)** — schema tooling costs setup time; two tables and four queries do not
  justify it.

## Consequences
- Positive: real SQL aggregations, durable data across restarts, same engine in dev and tests.
- Negative / cost: Docker becomes a prerequisite for both `pnpm dev` and `pnpm test`; startup
  is slower than an embedded DB; test isolation needs Testcontainers (see testing ADR).
- Follow-ups: index `clicks(link_id, created_at)` for the by-day query; consider a
  `links(code)` unique index from day one (needed for collision retry).
