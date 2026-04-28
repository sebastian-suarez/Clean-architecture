# ADR 0004 — Ship saga and CQRS read-model as worked examples

- **Status:** accepted
- **Date:** 2026-04-28

## Context

`AGENTS.md` §3.6 (domain events), §6.6 (sagas / process managers), and §4.1 (CQRS) used to describe these patterns as "out of scope by default — adopt only when conditions A/B/C apply." That stance kept the template lean but left the rules abstract: a contributor adopting one of these patterns had no in-repo example to mirror, so the inevitable first attempt would re-derive the conventions from prose and miss details (e.g., the saga's optimistic-concurrency reload, the read-model's read/write port split).

## Decision

Ship one worked example for each pattern in the Order context. Domain events were already wired through the Order aggregate; this ADR documents the saga and projection additions and the small Order-aggregate extension (`Order.confirm` + `OrderConfirmed`) that the saga emits.

### Domain events — extended

- New event: `OrderConfirmed` in `src/domain/order/events/order-confirmed.ts`.
- New aggregate transition: `Order.confirm(reservationId, when)` (placed → confirmed).
- New status variant: `OrderStatus.confirmed`.

### Saga / process manager

- `src/application/sagas/order-confirmation-saga.ts` subscribes to `OrderPlaced`, drives reserve-inventory → confirm-order, with cancel-order as the compensation branch.
- State aggregate: `OrderProcess` in `src/domain/order/order-process.ts` (status: `started` | `confirmed` | `compensated`), persisted via `OrderProcessRepository`.
- Compensation is its own input port (`CompensateOrderConfirmationUseCase`) so the auth check protecting the user-driven `CancelOrder` (§6.4) doesn't block the system-initiated rollback.
- Idempotent: re-receiving `OrderPlaced` finds an existing process and returns without acting.
- Side-effect ports: `InventoryReservation` (with `InMemoryInventoryReservation` adapter under `src/infrastructure/inventory/`).

### CQRS read-side projection

- `OrderSummaryDto` (`src/application/dtos/order-summary-dto.ts`) — denormalized read shape, decoupled from `OrderDto`.
- Two narrow ports: `OrderSummaryReadModel` (read) and `OrderSummaryProjection` (write). `InMemoryOrderSummaryReadModel` implements both. Splitting the surfaces prevents a query use case from reaching for `upsert`.
- `OrderSummaryProjector` (`src/application/projections/order-summary-projector.ts`) subscribes to `OrderPlaced` / `LineItemAdded` / `OrderConfirmed` / `OrderCancelled` and rebuilds the projection. Idempotent (replay-safe).
- `ListOrderSummaries` use case backs the new `list-order-summaries` CLI command and reads from the projection. The original `ListOrders` (CQS, aggregate-backed) remains so both styles are visible side-by-side.

### File-naming additions

- `<name>-process.ts` for saga state aggregates (`order-process.ts`).
- `projections/<name>-projector.ts` for projection writers (`order-summary-projector.ts`).
- The naming table in §7 was updated.

## Consequences

- Easier: a contributor adopting any of these patterns now has a concrete reference, including the non-obvious wiring decisions (read/write port split, optimistic-concurrency reload between saga saves, saga-only use cases skipping presentation).
- Harder: the wiring graph in `compose()` grows by ~25 lines and one more file (the inventory adapter) lives in `src/infrastructure/`. The added surface area is on the same code path as `PlaceOrder`, so existing tests cover the regression risk.
- Out of scope: full event sourcing (domain reconstructed from an event log) — still defer per §4.1. Adopting it would require renaming `OrderRepository` → `OrderEventStore` and adding `Order.reconstruct(events: DomainEvent[])`. Not a path this ADR opens.
