---
name: break-prd-down
description: Break a PRD into vertical phases and dependency-ordered issue files (mirrored to GitHub when configured), with ownership zones so the orchestrator can parallelise safely. Use after make-prd, or whenever a PRD changed and its issues must be re-synced.
argument-hint: "[path/to/prd.md]"
disable-model-invocation: true
---

# break-prd-down

## 1. Resolve the PRD
1. `$ARGUMENTS` is a path → use it.
2. Otherwise list `docs/prds/*.md`. If exactly one has no `docs/issues/<slug>/` directory yet, use it and say so.
3. Otherwise ask which one (`AskUserQuestion` with the list). Never guess between candidates.

## 2. Read the codebase before planning
This is what makes the skill work on feature #20, not just feature #1.
- `CLAUDE.md`, accepted `docs/adr/*.md`, `.claude/workflow.json` (`execution.sharedManifests`).
- Layout: `git ls-files` (or `find` if not tracked yet), package manifests, test runner and how to run one file, lint/typecheck commands, CI config.
- Modules the PRD touches: grep the codebase for the PRD's domain nouns.
Record findings in the phases README (*Codebase notes* and *Shared manifests*).

**Greenfield check:** no test runner, no CI, or no runnable entry point → **Phase 0 (walking skeleton) is mandatory**: scaffold, test runner, lint, CI, one trivial end-to-end path. Phase 0 issues are `parallel: false`, `touches-shared: true`.

## 3. Phases
- **Vertical.** Each phase ends in something demoable or testable end-to-end. Not "all models, then all endpoints, then all UI".
- 2–6 phases is typical. Each has a goal, observable exit criteria, and the ADRs it depends on.
- Write `docs/issues/<slug>/README.md` from `docs/templates/phases.md`.
- Add a short *Phases* summary (name + goal, one line each) above the generated block in the PRD so the PRD reads on its own.

## 4. Issues
One issue = one implementer session, one branch, ideally ≤ half a day of work. Use `docs/templates/issue.md`. File name `docs/issues/<slug>/<id>-<title-slug>.md`.

| field | rule |
|---|---|
| `id` | `P<phase>-<nn>`, zero-padded, unique within the PRD |
| `title` | imperative, objective, ≤ 70 chars — "Add login endpoint", not "Auth stuff" |
| `status` | `todo` |
| `blockers` | ids that must be `done` first. True dependencies only, not preferred ordering |
| `parallel` | hint: `false` when the work inherently conflicts with anything else in its phase |
| `zones` | concrete dirs/files this issue owns (`[src/auth/, tests/auth/]`). The orchestrator schedules on prefix-disjointness of these, so be honest and specific |
| `touches-shared` | `true` if it edits anything matching `execution.sharedManifests` or the repo-specific list in the phases README (lockfiles, migrations, CI, DI/route registries). These run alone |

Body: **Description** (with the R-numbers it covers), **Acceptance criteria** (testable — each becomes ≥ 1 test in the `tdd` skill), **Out of scope**, **Notes for implementer** (ADRs, files to look at, gotchas).

Then run `scripts/workflow/issues.sh validate <slug>` — fix until it prints `ok`. It checks id uniqueness, blocker existence, phase ordering, and cycles.

## 5. Re-running on an amended PRD (must be idempotent)
If `docs/issues/<slug>/` already exists:
- Never modify an issue whose status is `in-progress`, `review`, or `done`.
- New requirements → new issues, continuing the numbering within their phase.
- Requirements removed from the PRD → `status: dropped` (keep the file).
- `todo` issues whose scope changed → rewrite in place, same id.
- Print a diff summary: added / dropped / rewritten / untouched.

## 6. Decisions surfaced during breakdown
If splitting the work reveals a decision the PRD didn't make (queue vs cron, where a boundary goes, a new dependency), ask the user with a recommendation and write the ADR **now** into `docs/adr/` (`deciders: user (break-prd-down)`). Implementers must not be the ones who discover these.

## 7. Sync the PRD
`scripts/workflow/issues.sh sync-prd <slug>` regenerates the checklist between the markers. Never hand-edit that block.

## 8. GitHub backend (`issues.backend: "github"`)
Local files are still written and remain authoritative for `zones`, `blockers`, and status; GitHub is a mirror for humans.
- Require `gh auth status` to pass; otherwise warn and continue local-only.
- `gh issue create --repo <issues.github.repo> --title "<id>: <title>" --body-file <file> --label "<labelPhase>"`, then `issues.sh set <file> gh <number>`.
- Blockers → a `Blocked by #n` list appended to the body.
- On re-runs, update existing issues by number (`gh issue edit`) instead of creating duplicates; close dropped ones with a comment.

## Output
Phases with issue counts, the critical path (longest blocker chain), issues flagged `touches-shared`, the first ready batch, and the suggested `/execute-next-step <slug>`. Do not commit.
