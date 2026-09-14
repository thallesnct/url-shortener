---
name: make-prd
description: Turn a product or feature prompt into a PRD through a bounded question-and-answer loop, persisting each technical decision as an ADR. Use when the user wants to define, scope, or explore an app or feature before implementation. Modes - default (full PRD), --lite (one-page PRD, one round), --explore (spike report, no forced decisions).
argument-hint: "[--lite|--explore] <what you want to build or explore>"
disable-model-invocation: true
---

# make-prd

Produce a PRD the rest of the pipeline can consume — or, in `--explore` mode, a spike report that may later be promoted to one.

## Inputs
- `$ARGUMENTS`: optional mode flag, then the prompt. No prompt → ask for one. A path to a `docs/spikes/*.md` file counts as a prompt (promotion).
- `.claude/workflow.json`: `prd.maxRounds`, `prd.maxQuestionsPerRound`, directories.
- Read **before asking anything**: `CLAUDE.md`, `docs/adr/*.md` (accepted decisions are stated, never re-asked), existing `docs/prds/*.md` (avoid overlap), and the codebase if one exists (top-level layout, package manifests, test runner). Questions the codebase already answers are not questions.

## Mode selection
| Mode | When | Rounds | Output |
|---|---|---|---|
| default | a new app, or a feature with real design surface | ≤ `prd.maxRounds` | `docs/prds/<slug>.md` + ADRs |
| `--lite` | small feature, a handful of decisions | 1 | one-page `docs/prds/<slug>.md` |
| `--explore` | the user is still discovering what they want | ≤ `prd.maxRounds` | `docs/spikes/<slug>.md`; no PRD, no ADRs, no issues |

If the prompt looks like a small feature and no flag was given, suggest `--lite` in one line and proceed with whatever the user picks. If the prompt is full of "maybe" / "not sure if" / "should we even", suggest `--explore`.

## Question loop (default and --lite)
Each round:
1. Group questions under **Scope & users**, **Behaviour**, **Technical decisions**, **Non-goals & constraints**. At most `prd.maxQuestionsPerRound`; highest-leverage first (the ones whose answer changes the most downstream work).
2. Every question has 2–4 options with one-line trade-offs and exactly one marked **(Recommended)**, listed first. Use `AskUserQuestion` when available; otherwise number them.
3. **Technical decisions** — framework, storage, auth, API style, key dependencies, testing approach, new conventions — are asked explicitly and individually. Each accepted one becomes an ADR.
4. The user may say "accept defaults" / "go with your recommendations" at any point: take every recommended option, stop asking, move to persisting.
5. After each round restate the current understanding in ≤ 10 bullets and list what is still open. Ask a follow-up round only if an answer opened a genuinely new decision — not to polish.

### Termination — "mutual understanding" means all of
- No open question tagged `must-decide` remains.
- The user has confirmed the restated summary (an explicit yes, or "accept defaults").
- **Or** the round cap is hit: list the still-open items under *Open questions* with `must-decide-before: <phase>`, tell the user, and stop. Do not keep looping.

`--lite`: one round, ≤ 5 questions, every one with a default; then persist.

## Explore mode
- Questions are **hypotheses to test**, not decisions to make. Never push the user to a technical choice; if they don't know, that is the answer and it goes in the report.
- Output `docs/spikes/<slug>.md` from `docs/templates/spike.md`: goal, hypotheses with the cheapest experiment for each and a "learned enough when" condition, options table, and the **Promote to PRD?** gate.
- If the user wants to try something, spike code goes on a `spike/<slug>` branch that is never merged; results go into the *Experiments log*.
- Do not create ADRs or issues here. A promotion run (`/make-prd docs/spikes/<slug>.md`) reads the conclusions and starts the normal loop with them pre-filled.

## Persisting
1. Slug: kebab-case from the title. Write `docs/prds/<slug>.md` from `docs/templates/prd.md`. Keep the `<!-- issues:start -->` / `<!-- issues:end -->` markers intact — `break-prd-down` owns that block.
2. For each accepted technical decision write `docs/adr/YYYY-MM-DD-<slug>.md` from `docs/templates/adr.md` with `status: accepted`, `deciders: user (make-prd)`, and link it from the PRD's *Decisions* table. ADRs are decided here and in `break-prd-down`; implementers may only propose.
3. Requirements must be numbered (R1…, N1…) — issues trace back to them.
4. Do not create issues. Do not commit. Tell the user what was written and that the next step is `/break-prd-down docs/prds/<slug>.md`.

## Rules
- Never invent requirements the user didn't confirm; unknowns go under *Open questions*.
- If an accepted ADR answers a question, state the decision instead of asking it.
- PRDs describe behaviour and decisions, not tasks. No implementation steps, no file lists.
- Re-running on an existing PRD (`/make-prd docs/prds/<slug>.md`) is an amendment: ask only about what changed, keep requirement numbers stable, append new ones, and remind the user to re-run `/break-prd-down`.
