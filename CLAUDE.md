# blueprint-ai

## Workflow

This repo uses a PRD → phases → issues → implementer pipeline. Read `docs/workflow.md`
before doing any planning or orchestration work. Config lives in `.claude/workflow.json`.

| Trigger | Skill / agent | Purpose |
|---|---|---|
| user | `/make-prd [--lite\|--explore] <prompt>` | bounded Q&A → `docs/prds/<slug>.md` (+ ADRs) or a spike report |
| user | `/break-prd-down [prd]` | PRD → vertical phases → issue files with ownership zones |
| user | `/execute-next-step [slug]` | schedule ready issues, run implementers in worktrees, integrate, summarise |
| agents | `tdd` | red → green → refactor for one issue |
| agents | `commit` | safe, Conventional Commits |
| orchestrator | `implementer` agent | one issue, one worktree, loops until green, proposes ADRs |

Helper: `scripts/workflow/issues.sh` (`list`, `ready`, `get`, `set`, `validate`, `sync-prd`).

## Conventions

- Every commit goes through the `commit` skill. Conventional Commits. No tool-attribution trailers.
- Architectural decisions are made at planning time (`make-prd`, `break-prd-down`) and live in
  `docs/adr/` as `YYYY-MM-DD-<slug>.md`. Implementers only *propose* into `docs/adr/proposals/`.
- Issues are local files by default: `docs/issues/<prd-slug>/<id>-<title-slug>.md`. Frontmatter
  `status` is the single source of truth; the checklist in the PRD is generated — never hand-edit
  the block between `<!-- issues:start -->` and `<!-- issues:end -->`.
  Set `issues.backend` to `"github"` to mirror issues to GitHub (local files stay authoritative for
  zones and blockers).
- Branches: `feat|fix|chore/<short-description>` — named after the change, never after an ADR or PRD.
- Implementers never run on `main`; worktrees live in `.worktrees/` (git-ignored).
- Parallelism is decided at run time from each issue's `zones` (ownership) and `touches-shared`
  flag, not from the static `parallel` hint alone.
- Nothing is "done" until it is merged onto the integration branch and the full suite is green there.
