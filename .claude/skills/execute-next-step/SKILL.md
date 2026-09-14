---
name: execute-next-step
description: Orchestrate the next batch of ready issues for a PRD - schedule by ownership-zone disjointness, run up to N implementer sub-agents in isolated worktrees, integrate each branch onto the integration branch with a full test run, promote ADR proposals, and print an itemised summary. Use to advance a PRD's implementation.
argument-hint: "[prd-slug] [--dry-run] [--max N]"
disable-model-invocation: true
---

# execute-next-step

You are the orchestrator. You do not write production code — implementers do. You own git topology (worktrees, branches, merges), issue state, and the PRD checklist.

Helper: `scripts/workflow/issues.sh` (`list`, `ready`, `set`, `sync-prd`). Config: `.claude/workflow.json` → `execution.*`.

## 0. Preconditions
- `git rev-parse --git-dir` succeeds, the repo has at least one commit, and the current branch is `execution.integrationBranch`. Working tree clean; if dirty, stop and list what is uncommitted.
- Resolve the slug: `$ARGUMENTS`, else the only directory under `docs/issues/`, else ask.
- `--max N` overrides `execution.maxParallel`. `--dry-run` stops after the plan.
- **Bookkeeping branch.** Under `execution.delivery: integrate`, bookkeeping commits (issue/PRD/ADR files only) go straight to the integration branch. Under `delivery: pr` the remote integration branch is presumably protected, so bookkeeping goes to a long-lived `chore/workflow-state` branch (create from the integration branch if missing, check it out for bookkeeping, return afterwards); the user pushes/PRs it when they choose.

## 1. Resume check
`issues.sh list <slug>`. For every issue with `status: in-progress`:
- Its `worktree` exists → ask the user per issue (`AskUserQuestion`): **resume** (re-spawn the implementer on that worktree), **integrate** (it looks finished — go to step 4), or **reset** (`git worktree remove --force`, delete branch, `status: todo`). Never pick silently.
- Its `worktree` is gone → `status: todo`, warn.
Issues in `review` under delivery `integrate` are re-queued for step 4 (a previous run was interrupted before merging).

## 2. Build the batch
1. `issues.sh ready <slug>` → candidates, already ordered by phase then id.
2. A candidate with `touches-shared: true` runs **alone** (batch size 1) and goes before non-shared candidates of the same phase — shared manifests are the number-one merge-conflict source.
3. Otherwise add candidates while their `zones` are prefix-disjoint from every issue already in the batch (`src/auth/` vs `src/auth/session/` overlap; `src/auth/` vs `src/billing/` don't) and the batch is under the max. `parallel: false` → batch of 1.
4. Zones empty → treat as `touches-shared: true` and tell the user the issue needs zones.
5. Print the plan: what runs, and why each excluded ready candidate was excluded. `--dry-run` ends here.

## 3. Dispatch
For each issue in the batch:
- Branch: `feat/<title-slug>` (or `fix/`, `chore/` by nature). Named after the change, never after an ADR/PRD/phase.
- `git worktree add -b <branch> <worktreeDir>/<branch> <integrationBranch>`.
- `issues.sh set` → `status: in-progress`, `branch`, `worktree`.
Commit that bookkeeping with the `commit` skill (`chore(workflow): start <ids>`) so the state survives an interruption.

Then, in **one message**, spawn one `Agent` per issue with `subagent_type: "implementer"`. The prompt must contain: issue path, branch, worktree path, integration branch, `execution.maxImplementerIterations`, and "end with the STATUS line exactly as your instructions specify". Wait for all of them; do not poll.

## 4. Integrate — sequentially, in batch order
Independently green branches are not a green trunk. Parse every STATUS line first. Then, for each implementer that reported `STATUS: review`:

0. **Zone feedback.** If `OUTSIDE_ZONES` is non-empty: append those paths to the issue's `zones` (`issues.sh set`) so future scheduling uses reality, not the breakdown's guess. If any of them collide with another in-flight issue's zones, integrate this branch first, and treat the colliding branch's rebase in step 1 as higher-risk (expect conflicts; do not skip its full run).
1. **ADR gate — before merging.** If `ADR_PROPOSALS > 0`, read each proposal from the worktree and ask the user per proposal (`AskUserQuestion`): **accept**, **reject**, or **defer**. Reject → `SendMessage` the implementer the reason, ask it to remove the proposal and rework the code that embodies the decision, re-verify, and report again (counts toward `maxIntegrationRetries`). The code implementing a rejected decision never reaches the integration branch. Accept / defer → continue; record the choice for step 5.
2. `git -C <worktree> rebase <integrationBranch>`. Conflict → `SendMessage` the implementer the conflict output and ask it to resolve and re-verify; retry up to `execution.maxIntegrationRetries`, then `status: blocked` with reason `rebase conflict`.
3. Record `PRE=$(git rev-parse HEAD)`. Merge per `execution.mergeStrategy` (`git merge --ff-only <branch>` by default).
4. Run the **full** test suite + lint + typecheck on the integration branch.
   Red → `git reset --hard $PRE`, bounce to the implementer with the failing output (same retry cap), else `status: blocked` with reason `integration failure`.
5. Green → `status: done`, `git worktree remove <worktree>`, `git branch -d <branch>`.

Delivery `pr` (`execution.delivery`): perform steps 0–4 on a throwaway local branch to prove mergeability, reset, then `git push -u origin <branch>` and `gh pr create --title "<id>: <title>" --body-file <issue>`; record `pr:`; status stays `review` — a human merges. Keep the worktree until the PR is merged.

Implementers that reported `STATUS: blocked` → keep `status: blocked`, write their NOTES into a `## Blocked` section in the issue file, keep the worktree.

## 5. Bookkeeping
- Accepted ADR proposals (now on the integration branch under `docs/adr/proposals/`): `git mv` to `docs/adr/`, set `status: accepted`, add `deciders: user (execute-next-step)`. Deferred ones stay in `proposals/`. Rejected ones never merged.
- `issues.sh sync-prd <slug>`.
- Phase complete (all `done`/`dropped`) → say so.
- GitHub backend: mirror status with `gh issue close` / `gh issue comment`.
- Commit the bookkeeping (`chore(workflow): complete <ids>`) with the `commit` skill on the bookkeeping branch from step 0. Nothing else is committed by the orchestrator.

## 6. Summary — always printed, even after failures
```
Batch: <slug> phase N — k issues (max parallel M)
✔ P1-02 Add login endpoint   feat/login-endpoint    merged     tests 142/142   ADR accepted 1   zones +src/shared/errors.ts
✔ P1-03 Add signup           feat/signup            PR #12     review
✖ P1-04 Add migrations       feat/migrations        blocked    rebase conflict in src/db/schema.ts (2 retries)
Phase 1: 3/5 done · Next ready: P1-05, P1-06 (parallel) · Still blocked: P2-01 (by P1-04)
ADRs: accepted 1, deferred 0, rejected 0 — pending in proposals/: none
Worktrees left: .worktrees/feat/migrations (blocked)
```

## Rules
- Never exceed `maxParallel`; never dispatch two issues with overlapping zones.
- Never edit files inside an implementer's worktree yourself; message the implementer.
- Never force-push; never rewrite the integration branch beyond the pre-merge reset in step 4.
- Never merge a branch whose ADR proposals have not been through the gate.
- If interrupted, issue frontmatter is the state; the next run's resume check picks it up.
