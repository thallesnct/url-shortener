---
title: TypeScript sources import each other with explicit `.ts` specifiers
status: proposed
date: 2026-09-14
deciders: implementer(P0-01)
supersedes:
---

# TypeScript sources import each other with explicit `.ts` specifiers

## Context
`apps/api` is `"type": "module"` and typechecked with `tsc --noEmit` under
`module: NodeNext` (AC6 of P0-01). NodeNext rejects extensionless relative imports even
though `tsx` and Vitest resolve them, so a convention had to be fixed before the first file
was written; retrofitting specifiers across every module later is pure churn. The same code
is executed by four resolvers: `tsc`, `tsx watch` (dev), Vitest (tests) and, potentially,
Node 24's native type-stripping (`node src/server.ts`).

## Decision
- Relative imports between TypeScript files use the real file name, e.g.
  `import { migrate } from './db/migrate.ts'`. Never `./migrate` or `./migrate.js`.
- The root `tsconfig.json` enables `allowImportingTsExtensions` (legal because `noEmit` is
  on) and `verbatimModuleSyntax`; type-only imports are written `import type`.
- Path resolution inside modules uses `import.meta.url` (no `__dirname`).

## Alternatives considered
- **`./migrate.js` specifiers (classic NodeNext)** — the file that is named does not exist;
  confusing for readers and breaks Node's native type-stripping, which needs `.ts`.
- **`moduleResolution: bundler` + extensionless** — typechecks, but describes a runtime the
  API does not have; the API is never bundled.

## Consequences
- Positive: one specifier style that all four resolvers accept; `node --experimental-strip-types`
  can run the API without `tsx` if ever needed.
- Negative / cost: unusual to reviewers used to `.js` specifiers; must stay `noEmit`.
- Follow-ups: `apps/web` (P4-01) is bundled by Vite and may keep Vite's extensionless style.
