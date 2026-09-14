---
name: tdd
description: Implement a task test-first (red → green → refactor) following the project's guidelines and ADRs. Use whenever implementing an issue, an acceptance criterion, or a bug fix. The implementer agent invokes this for every issue.
argument-hint: "<issue path, or a description of the behaviour to implement>"
---

# tdd

## Before the first test
- Read `CLAUDE.md`, the ADRs the issue references (and skim `docs/adr/` titles for anything else relevant), and the issue itself — its **Acceptance criteria** are your test list. If given only a description, write the acceptance criteria yourself first and show them.
- Find the test runner and conventions: test directory layout, file naming, fixtures/factories, how to run a *single* file, lint and typecheck commands. Match them exactly. Never introduce a second test framework or assertion style.
- No test runner at all → stop and report. That is a Phase 0 issue, not something to improvise here.

## The loop — one acceptance criterion at a time
1. **Red.** Write the smallest test that expresses the criterion. Run only that test. It must fail, and fail for the *right reason* — an assertion, not an import error or typo. If it passes immediately, either the behaviour already exists or the test is wrong; find out which before continuing.
2. **Green.** Write the minimum production code that passes. No speculative generality, no "while I'm here". Run the single test, then its file.
3. **Refactor.** Remove duplication, name things properly, apply ADR conventions. Run the file again. Behaviour must not change — if you find yourself wanting a new test during refactor, that is new behaviour: go back to Red.
4. Next criterion.

## After the last criterion
- Run the **full** suite, lint, and typecheck. That is the exit condition; a green single file is not.
- Report: tests added (path + name), production files touched, files touched outside the issue's `zones` (the orchestrator needs this), and any acceptance criterion you could not cover and why.

## Rules
- Never weaken, skip, or delete a test to reach green. If a test is genuinely wrong, say so explicitly and fix the *test* with the justification in your report.
- Mock at boundaries you don't own (network, clock, filesystem, third-party services). Don't mock your own modules unless an ADR says to.
- Tests describe behaviour, not implementation: assert on outputs and observable effects, not on internal calls.
- Stay inside the issue's `zones`. If a change outside them is unavoidable, make it minimal and flag it.
- Do not commit; the caller decides when.
