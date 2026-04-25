# ADR 0002 — Add Order bounded context

- **Status:** accepted
- **Date:** 2026-04-25
- **Builds on:** ADR 0001

## Context

The User context alone could not demonstrate the full set of patterns in `AGENTS.md`. In particular: aggregates with inner entities, optimistic concurrency, domain factories, specifications, output boundaries, sagas, and inter-context communication via an Anti-Corruption Layer all need a second context to be real, not theoretical.

## Decision

Introduce a second bounded context, **Order**, with its own ubiquitous language:

- `Order` aggregate root with inner `LineItem` entities (Vernon §3.3 rules applied).
- Value objects with closure of operations: `Money`, `Quantity`, `Sku`.
- Branded type for `CustomerId` (cross-aggregate reference by id only — Vernon Rule 3) for contrast with the User context's `UserId` value-object class.
- Discriminated union `OrderStatus` (placed / shipped / cancelled) — TypeScript pattern for state machines.
- Domain service `pricing.applyBulkDiscount` crossing multiple `LineItem`s.
- Application factory `OrderFactory` for construction that needs collaborators (clock, id-gen).
- Specification `ExpensiveOrderSpec` as a token demonstration of the pattern.
- Output Boundary on `PlaceOrder` (instead of returning a DTO) to demonstrate the inverted pattern from `AGENTS.md` §4.8.
- `OrderConfirmationSaga` subscribing to `OrderPlaced`.

The two contexts integrate through:

- An output port `CustomerLookup` owned by the Order context's application layer.
- An adapter `InProcessCustomerLookup` (Anti-Corruption Layer) translating `User` → `CustomerSummaryDto`.

## Context-map relationship

Order ← `Anticorruption Layer` → User (in both directions; today only Order needs to read User). See `docs/context-map.md`.

## Consequences

- Adds ~50 source files but each demonstrates a distinct concept.
- The cross-context integration is in-process today; swapping `InProcessCustomerLookup` for an HTTP/RPC adapter requires no change in `application/` or `domain/` (Branch by Abstraction — §6.12).
