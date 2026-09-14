---
name: commit
description: Create a git commit safely and in Conventional Commits format. Use for every commit in this repository, including commits made by sub-agents. Never pushes.
argument-hint: "[optional hint for the message]"
---

# commit

## Safety first — stop and report on any violation
1. **Branch.** `git branch --show-current`. If it is in `commit.protectedBranches` (`.claude/workflow.json`), do not commit unless the user explicitly asked to commit there, or the caller is `execute-next-step` committing workflow bookkeeping (files under `docs/issues/`, `docs/prds/`, `docs/adr/` only), or the repository has no commits yet (initial commit). Otherwise create a branch first.
2. **Inspect.** `git status --porcelain`, then `git diff` and `git diff --cached`. Read what you are about to commit.
3. **Stage explicitly by path.** Never `git add -A`, `git add .`, or `git add -u` on a tree you have not reviewed file by file.
4. **Never stage** `.env*`, credentials, keys, tokens, `*.pem`, large binaries, `node_modules/`, build output, `.worktrees/`. If such a file is modified, say so and leave it out.
5. **Never** `--no-verify`, never `--amend` a commit that exists on any remote, never force-push. This skill does not push at all.
6. Hooks fail → fix the cause. Do not bypass.
7. **One logical change per commit.** If the diff mixes concerns (feature + unrelated refactor + formatting), split into several commits.

## Message
```
<type>(<scope>): <subject>

<body>

<footer>
```
- `type`: `feat` | `fix` | `refactor` | `test` | `docs` | `chore` | `build` | `ci` | `perf` | `style`
- `scope`: module or area (`auth`, `workflow`, `deps`). Use `commit.scopes` from config when it is non-empty.
- `subject`: imperative mood, lower-case start, no trailing period, ≤ 72 chars.
- `body`: the *why*, not a restatement of the diff. Wrap at 72. Reference the issue (`Refs: P1-02`) and ADRs when relevant.
- `BREAKING CHANGE:` footer when applicable.
- **No tool-attribution trailers** (`Co-Authored-By: Claude …`, `Claude-Session: …`).

Use `git commit -F <file>` or a quoted heredoc so the body survives intact.

## After committing
Print `git log -1 --stat`. Do not push — pushing is the orchestrator's or the user's decision.
