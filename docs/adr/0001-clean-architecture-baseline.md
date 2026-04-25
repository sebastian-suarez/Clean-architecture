# ADR 0001 — Clean Architecture baseline

- **Status:** accepted
- **Date:** 2026-04-25

## Context

This repository is a template for new TypeScript / Node.js services. It must demonstrate Clean Architecture / Hexagonal / DDD patterns concretely enough that a reader can copy it and start building.

## Decision

Adopt the layout and rules in `AGENTS.md`:

- Four layers: `domain/`, `application/`, `infrastructure/`, `presentation/` (with `src/<name>.ts` composition roots per delivery mechanism).
- Dependency rule: source-code dependencies always point inward.
- Tactical DDD inside the domain (entities with `create` + `reconstruct`, VOs, aggregates, factories, services, events, errors with stable codes).
- Hexagonal vocabulary at the application boundary (input ports / driven output ports).
- One bounded context per direct subfolder of `src/domain/`.
- In-memory adapter is mandatory for every output port (§5.3).
- Architectural fitness function tests (`tests/architecture/`) enforce the dependency rule, the no-cross-context-imports rule, the composition-module rule, the no-barrels rule, and the `process.env`-isolation rule.

## Consequences

- Easier: swapping infrastructure (DB, framework, message bus), evolving delivery mechanisms (CLI, HTTP, queue), reasoning about each layer in isolation.
- Harder: writing one-off scripts that "just work" — every side effect goes through a port; every entity goes through `create`/`reconstruct`. The ceremony is intentional.
- Trade-off: the in-memory adapters and contract tests duplicate type-checking the production adapter would catch. We accept that cost for the test coverage and substitutability guarantees.
