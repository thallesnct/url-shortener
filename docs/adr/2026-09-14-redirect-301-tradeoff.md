---
title: Redirect semantics — 301 as specified, with the caching trade-off accepted
status: accepted
date: 2026-09-14
deciders: user (make-prd)
supersedes:
---

# Redirect semantics — 301 as specified, with the caching trade-off accepted

## Context
The brief specifies `GET /:code` → `301` and also requires that *every* access records a click.
These conflict: browsers cache a `301 Moved Permanently` and follow it locally on subsequent
visits without contacting the server, so repeat clicks from the same browser are not tracked.
The brief allows adapting contracts "if justified". Related small choices: which `ip` to record
behind proxies, and whether the analytics page needs any protection.

## Decision
- **Respond `301`** as written in the brief. The under-counting of cached repeat visits is an
  accepted, documented limitation (README + PRD R6), not a bug.
- The **demo and tests generate clicks with `curl` / in-process requests**, which do not cache,
  so the numbers shown are real.
- **Client IP**: first entry of `X-Forwarded-For` when present, else the socket remote address.
  No trusted-proxy allow-list — spoofable, acceptable for a local demo.
- **Analytics page is public by URL** (`/analytics/:code`), no token or login. "Easy to share"
  outranks confidentiality here and auth is an explicit non-goal.

## Alternatives considered
- **`302` + `Cache-Control: no-store`** — accurate tracking on every click; the recommended
  option, declined by the user to stay literal to the brief. Remains the one-line change if
  interviewers ask.
- **`301` + `Cache-Control: no-store`** — keeps the semantic but depends on caches honouring
  `no-store` on a permanent redirect; less certain than `302`.
- **Secret analytics token returned on create** — safer sharing, but adds a field to the
  contract and a lookup; out of scope for the hour.

## Consequences
- Positive: contract matches the brief; trade-off is visible and defended, which is what the
  interview grades.
- Negative / cost: real-browser repeat clicks are under-counted; anyone with a code can view
  its analytics.
- Follow-ups: switching to `302` is a one-token change plus one header; if done, update R6.
