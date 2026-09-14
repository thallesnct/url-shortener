---
id: P1-01
title: <Imperative, objective title>
prd: docs/prds/<slug>.md
phase: 1
status: todo              # todo | in-progress | review | done | blocked | dropped
blockers: []              # issue ids that must be done first, e.g. [P0-01, P1-02]
parallel: true            # hint only; orchestrator schedules on zones + touches-shared
zones: []                 # dirs/files this issue owns, e.g. [src/auth/, tests/auth/]
touches-shared: false     # true if it edits lockfiles, migrations, CI, DI wiring, etc.
branch:
worktree:
pr:
gh:                       # GitHub issue number when issues.backend = github
---

# <id> — <title>

## Description
What and why, in 2–5 sentences. Link the PRD requirements this covers (R3, R4).

## Acceptance criteria
Each line becomes at least one test.
- [ ] AC1 …
- [ ] AC2 …

## Out of scope
- …

## Notes for implementer
- Relevant ADRs: …
- Files to look at: …
- Known gotchas: …
