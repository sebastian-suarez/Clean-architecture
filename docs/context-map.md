# Context Map

This document records how the bounded contexts in this repo relate. Update it whenever a relationship changes.

## Contexts

| Context    | Subdomain type  | Path                 | Responsibility                                                          |
| ---------- | --------------- | -------------------- | ----------------------------------------------------------------------- |
| **User**   | Core            | `src/domain/user/`   | Identity, registration, account state                                   |
| **Order**  | Core            | `src/domain/order/`  | Order placement, line items, cancellation                               |
| **shared** | (cross-cutting) | `src/domain/shared/` | `DomainError`, `DomainEvent`, `ConcurrencyError`, `ForbiddenError` only |

Any future context (Billing, Notifications, Inventory) lives at `src/domain/<name>/` and gets its own row in this table.

## Relationships

```
┌──────────┐                 ┌───────────┐
│   User   │ ◄── ACL ──────  │   Order   │
│ context  │                 │  context  │
└──────────┘                 └───────────┘
```

- **Order → User: Anti-Corruption Layer** (§5.4, §6.5)
  - The Order context defines `CustomerLookup` (output port) and `CustomerSummaryDto` (published-language DTO) in its application layer.
  - The User context exposes its `User` aggregate via `UserRepository`.
  - The adapter `InProcessCustomerLookup` (`src/infrastructure/customer/`) translates `User` → `CustomerSummaryDto`. Order code never sees `User`.
  - In-process today; could become an HTTP/RPC adapter (Branch by Abstraction — §6.12) without any change to Order's application or domain layer.

- **User → Order: none.**
  - The User context has no awareness of Order. Adding one would require Order to expose its own ACL surface (e.g., `OrderHistoryLookup`) or a domain event the User context could subscribe to.

- **No Shared Kernel between User and Order** (§6.5).
  - The two contexts could each grow their own `Money`, `Address`, etc. without coordination. Today `Money` lives in Order only because no one else needs it.

- **Shared (`domain/shared/`) is intentionally minimal.**
  - Only `DomainError`, `DomainEvent`, `ConcurrencyError`, `ForbiddenError`. None of these are domain concepts — they're cross-cutting infrastructure for domain code.

## Domain events crossing contexts

None today. If Order ever needs to react to a User event (e.g., `UserDeactivated` should auto-cancel pending orders), the chain is:

1. User publishes `UserDeactivated` via `EventPublisher`.
2. Order's `application/sagas/cancel-orders-on-user-deactivation.ts` subscribes.
3. The saga calls `CancelOrder` for each open order under that customer.

This is the preferred coupling for cross-context reactions (§6.5).

## Anti-patterns to flag in review

- An `import` from `domain/order/` in any `domain/user/` file (or vice versa) — the architecture test `tests/architecture/no-cross-context-imports.arch.test.ts` will fail.
- Adding a "user/billing/order" mega-aggregate to "make a transaction simpler" — split the work across aggregates with events instead.
- Putting an `Address` or `Money` shared by both contexts into `domain/shared/` without an ADR — duplicating across contexts is healthier than coupling them.
