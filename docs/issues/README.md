# Issues

One directory per PRD: `docs/issues/<prd-slug>/`, containing `README.md` (phases + codebase notes) and one file per issue, `P<phase>-<nn>-<title-slug>.md`. Template: `docs/templates/issue.md`.

**Frontmatter `status` is the single source of truth.** States: `todo → in-progress → review → done`, plus `blocked` and `dropped`. The PRD's checklist is generated from these files by `scripts/workflow/issues.sh sync-prd <slug>` — never edit it by hand.

`zones` and `touches-shared` drive parallel scheduling in `/execute-next-step`. Be concrete; vague zones serialise your batch.

GitHub mirror: set `issues.backend` to `"github"` in `.claude/workflow.json`; the `gh:` field then holds the issue number.
