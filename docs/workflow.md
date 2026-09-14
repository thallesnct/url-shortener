# Development workflow

PRD → phases → issues → implementers → integration. Every architectural decision becomes an ADR.

```
/make-prd [--lite|--explore] <prompt>
   bounded Q&A (recommendations first, "accept defaults" escape, round cap)
   → docs/prds/<slug>.md  + docs/adr/YYYY-MM-DD-*.md (accepted)
   → or docs/spikes/<slug>.md in --explore mode (no PRD, no ADRs)

/break-prd-down [prd]
   reads PRD *and* codebase → vertical phases (phase 0 = walking skeleton on greenfield)
   → docs/issues/<slug>/README.md (phases, codebase notes, shared manifests)
   → docs/issues/<slug>/P<n>-<nn>-<title>.md  (blockers, zones, touches-shared)
   → validate, then regenerate the PRD checklist

/execute-next-step [slug]
   ready set  = todo issues whose blockers are done
   batch      = zone-disjoint issues, ≤ maxParallel; touches-shared runs alone
   dispatch   → implementer agent per issue, each in .worktrees/<branch>
   integrate  → zone feedback, ADR gate (ask user, before merge), rebase, merge, FULL suite; red = reset + bounce
   bookkeeping → promote accepted ADRs, status, sync-prd, summary
```

## Why it is shaped this way

| Risk | Mitigation |
|---|---|
| Parallel implementers produce unmergeable branches | Issues declare **ownership zones**; scheduling is on zone disjointness at run time. Shared manifests (lockfiles, migrations, CI, DI wiring) run alone. |
| Four green worktrees ≠ green trunk | Orchestrator merges sequentially and runs the **full suite on the integration branch** before marking `done`. |
| Parallel agents inventing contradictory conventions | ADRs are decided in `make-prd` / `break-prd-down`. Implementers only write to `docs/adr/proposals/`; the orchestrator asks the user before promoting. Date-slug IDs, no sequence collisions. |
| Unbounded loops burning tokens | `prd.maxRounds`, `execution.maxImplementerIterations`, `execution.maxIntegrationRetries`. Loops end in `blocked` with the failing output, not in retries. |
| Simplify undoing what tests drove out | Implementer loop exits only from the **verify** step; review/simplify are never last. |
| Status drift between issue files and the PRD | Issue frontmatter is the single source of truth; the PRD checklist is generated (`issues.sh sync-prd`). |
| Breakdown ignoring the existing codebase | `break-prd-down` reads layout, conventions, and modules the PRD touches before writing issues. |
| Interrupted runs leaving worktrees around | Bookkeeping is committed at dispatch; the next run's resume check offers resume / integrate / reset. |

## Fit by scenario

- **Full app (greenfield)** — the primary target. Phase 0 walking skeleton runs single-agent; parallelism starts in phase 1.
- **Single feature** — `/make-prd --lite` (one round, one page) then the same back half.
- **Exploring a feature definition** — `/make-prd --explore`. Ends in a spike report, not a PRD; a deliberate *Promote to PRD?* gate. The pipeline is commit-shaped, so exploration is kept out of it on purpose.

## Issue backends

`issues.backend` in `.claude/workflow.json`:
- `local` (default) — files under `docs/issues/<slug>/` are the whole story.
- `github` — same files, plus a mirror on GitHub via `gh` (`gh:` frontmatter holds the number). Local files stay authoritative for zones, blockers, and status; GitHub is for humans.

## Delivery modes

`execution.delivery`:
- `integrate` (default) — merge onto the integration branch locally after a green full run.
- `pr` — prove mergeability locally, then push and open a PR; a human merges.

## Directory layout

```
.claude/workflow.json          config
.claude/skills/<name>/SKILL.md make-prd · break-prd-down · tdd · execute-next-step · commit
.claude/agents/implementer.md
docs/prds/<slug>.md
docs/issues/<slug>/README.md   phases + codebase notes
docs/issues/<slug>/P1-02-*.md  issues
docs/adr/YYYY-MM-DD-<slug>.md  accepted decisions
docs/adr/proposals/            implementer proposals awaiting a human
docs/spikes/<slug>.md          exploration reports
docs/templates/                prd · issue · phases · adr · spike
scripts/workflow/issues.sh     list · ready · get · set · validate · sync-prd
.worktrees/                    implementer worktrees (git-ignored)
```
