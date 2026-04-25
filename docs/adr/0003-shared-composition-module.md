# ADR 0003 — Shared composition module

- **Status:** accepted
- **Date:** 2026-04-25

## Context

`AGENTS.md` §2.5 states: "If wiring grows complex, extract a `compose<X>(config)` factory in the same file — never in a separate 'container' module that other layers might import."

The template ships three composition roots — `src/index.ts` (CLI), `src/server.ts` (HTTP), `src/worker.ts` (queue) — and the bulk of their wiring is identical: ~25 adapter constructions, ~10 use-case constructions, several decorator stacks. Inlining would mean ~200 lines of literal duplication across three files; a new use case would need to be wired in three places.

## Decision

Allow a single `src/composition.ts` module to hold the shared `compose(config: AppConfig)` factory, **under three constraints**:

1. It is imported only by composition roots (`src/index.ts`, `src/server.ts`, `src/worker.ts`).
2. It returns only fully-wired use cases (and the logger, since the queue worker needs it for transport-level diagnostics). It never re-exposes individual adapters or repositories.
3. An architectural fitness function (`tests/architecture/composition-root-only.arch.test.ts`) enforces (1).

`AGENTS.md` §2.5 is amended to acknowledge this pattern.

## Consequences

- Easier: adding a use case means updating one file. Wiring graph is studied in one place.
- Harder: the rule that "each composition root is independent" weakens slightly — three composition roots now share a single source of truth for the wiring graph. The architecture test prevents the slippery slope into a DI container.
- Trade-off: composition roots remain runnable as `tsx` entry points, but they're now a few lines each — closer to "main" functions than to the full wiring graph. That's the price of avoiding triplicated wiring.
