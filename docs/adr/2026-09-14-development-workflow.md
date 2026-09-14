---
title: PRD-driven development workflow with zone-scheduled parallel implementers
status: accepted
date: 2026-09-14
deciders: user
supersedes:
---

# PRD-driven development workflow with zone-scheduled parallel implementers

## Context
We want an agent-driven pipeline that can take a prompt to a working app or feature with minimal human steering, without the failure modes of naive parallel agents: merge conflicts from shared files, per-branch "green" that is red on trunk, contradictory conventions invented in parallel, and unbounded retry loops.

## Decision
- Pipeline: `make-prd` → `break-prd-down` → `execute-next-step` (orchestrator) → `implementer` agents using `tdd` and `commit`. See `docs/workflow.md`.
- **Issues are local markdown files** under `docs/issues/<prd-slug>/` with flat frontmatter. `issues.backend: "github"` adds a mirror; local files remain authoritative.
- **Parallelism is scheduled on ownership zones** declared per issue (`zones`, `touches-shared`), evaluated at run time. The static `parallel` flag is a hint only.
- **Nothing is done until merged and fully green on the integration branch.** The orchestrator integrates sequentially and resets on failure.
- **ADRs are decided at planning time** by `make-prd`/`break-prd-down` with the user. Implementers write to `docs/adr/proposals/` only; a human promotes. ADR IDs are `YYYY-MM-DD-<slug>`.
- **All loops are bounded** by config (`prd.maxRounds`, `execution.maxImplementerIterations`, `execution.maxIntegrationRetries`) and terminate in an explicit `blocked` state.
- **Exploration is a separate mode** (`--explore`) that produces a spike report and never enters the issue pipeline without an explicit promotion.
- Branch names describe the change (`feat/<slug>`), never the ADR/PRD.
- Changesets are created only when `.changeset/` exists (or config forces it).

## Alternatives considered
- **GitHub issues as the only store** — better for humans, but couples the pipeline to network/auth and makes zone metadata awkward. Kept as an optional mirror instead.
- **Trusting a static `parallelizable` flag** — decided before code exists; wrong for exactly the phase-1 issues that all touch scaffolding.
- **Letting implementers write ADRs directly** — races on filenames and content between parallel agents.
- **Sequential-numbered ADRs** — collide under parallel proposals.

## Consequences
- Positive: mergeability is a scheduling property, not luck; trunk green is verified, not assumed; decisions have one owner.
- Negative / cost: more upfront metadata per issue (zones); orchestrator runs are slower because integration is sequential; a human is in the loop for ADR promotion.
- Follow-ups: none until the first real PRD exercises the pipeline; revisit `sharedManifests` per stack.
