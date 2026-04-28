# 🧱 Clean Architecture

An educational TypeScript + Node.js (ESM) reference for **Clean Architecture** / **Ports & Adapters** / **DDD**. It is study material — the goal is to show every pattern in working code, not to ship a starter you fork.

> **Read [`AGENTS.md`](./AGENTS.md) before contributing.** It is the binding contract for layer boundaries, naming, forbidden patterns, and testing conventions.

---

## 🎯 What this repository demonstrates

The repository is intentionally larger than a "Hello World" because the goal is to demonstrate **every** Clean Architecture / DDD / Hexagonal pattern in working code:

- **Two bounded contexts** (`User`, `Order`) with their own ubiquitous languages.
- **Rich entities** with private constructors, `static create` (creation invariants) + `static reconstruct` (hydration), behavior methods, domain events.
- **Aggregates** with inner entities, optimistic concurrency (`version`), and Vernon's four design rules.
- **Value objects** with closure of operations (`Money.add`), self-validation, equality semantics.
- **Domain primitives** in two flavors: VO classes (`UserId`) and TS branded types (`CustomerId`).
- **Domain services**, **factories**, **specifications**, **events**, errors with stable codes.
- **Use cases** (one per business operation) implementing **input ports**, depending on **driven output ports**.
- **Use-case decorators** for every cross-cutting concern: logging, tracing, metrics, audit, authorization, retry, idempotency, rate-limiting, caching.
- **Output Boundary** (Presenter port) on `PlaceOrder` — the inverted alternative to returning a DTO.
- **Saga / process manager** subscribing to a domain event.
- **Anti-Corruption Layer** between contexts (`InProcessCustomerLookup` translates `User` → `CustomerSummaryDto`).
- **Three delivery mechanisms**: CLI, HTTP, and a stdin-driven queue worker — each with its own composition root.
- **In-memory adapter** for every output port (mandatory — §5.3).
- **Contract tests** so two adapters (in-memory + JSON-file) are runtime-substitutable.
- **Architectural fitness function** tests that fail when the dependency rule, no-cross-context rule, composition-root rule, no-barrels rule, or `process.env`-isolation rule is violated.
- **Test data builders** (`aUser()`, `anOrder()`) so invariants live in one place.
- **Property-based tests** for `Money` algebraic laws.
- **ADRs** (`docs/adr/`) and a **context map** (`docs/context-map.md`).

---

## 🧩 Project tree

```
src/
├── domain/                                  ← Pure business rules
│   ├── shared/
│   │   ├── domain-error.ts
│   │   ├── domain-event.ts
│   │   ├── concurrency-error.ts
│   │   └── forbidden-error.ts
│   ├── user/                                ← Bounded context #1
│   │   ├── user.ts                          (rich entity, create + reconstruct)
│   │   ├── user-id.ts, user-name.ts, email.ts
│   │   ├── errors.ts
│   │   └── events/                          (UserRegistered, UserRenamed, …)
│   └── order/                               ← Bounded context #2
│       ├── order.ts                         (aggregate root, version, events)
│       ├── line-item.ts                     (inner entity)
│       ├── order-id.ts, customer-id.ts (branded), money.ts, quantity.ts, sku.ts
│       ├── order-status.ts                  (discriminated union)
│       ├── errors.ts
│       ├── events/                          (OrderPlaced, OrderCancelled, …)
│       ├── services/pricing.ts              (domain service)
│       └── specifications/expensive-order-spec.ts
├── application/                             ← Use-case orchestration
│   ├── dtos/                                (UserDto, OrderDto, CustomerSummaryDto, …)
│   ├── mappers/                             (entity ↔ DTO)
│   ├── ports/
│   │   ├── input/                           (driving ports — one per use case)
│   │   └── output/                          (driven ports — Logger, Metrics, Tracer,
│   │                                         EventPublisher, IdempotencyStore, Cache,
│   │                                         RateLimiter, AuditLog, FeatureFlags,
│   │                                         UnitOfWork, repositories, read models,
│   │                                         CustomerLookup, PlaceOrderOutput, …)
│   ├── use-cases/                           (CreateUser, PlaceOrder, … + 8 decorators)
│   ├── factories/order-factory.ts           (application factory)
│   ├── sagas/order-confirmation-saga.ts
│   └── security/principal.ts
├── infrastructure/                          ← Adapters (one folder per concern)
│   ├── audit/, cache/, clock/, customer/, feature-flags/, id/, logging/,
│   ├── messaging/, metrics/, persistence/, rate-limiter/, tracing/, transaction/
│   └── (every output port has an in-memory adapter; persistence has JSON-file too)
├── presentation/                            ← Delivery mechanisms (driving adapters)
│   ├── cli/                                 (commands/ + dispatcher)
│   ├── http/                                (Hono routes/ + server)
│   └── queue/                               (stdin JSONL worker + handlers)
├── composition.ts                           ← Shared compose() — only consumed by:
├── index.ts                                 ← CLI composition root
├── server.ts                                ← HTTP composition root
└── worker.ts                                ← Queue composition root

tests/
├── architecture/                            ← Fitness function tests
├── domain/, application/, infrastructure/, presentation/
├── support/fakes.ts                         (FixedClock, SequentialIdGenerator, …)
├── user/builders/user-builder.ts            (Test Data Builders)
└── order/builders/order-builder.ts

docs/
├── adr/0001..0003-*.md                      (Architecture Decision Records)
└── context-map.md                           (Bounded-context relationships)
```

---

## ⚙️ Configuration

All env vars are read in **one place**: `src/config.ts`. Composition roots call `loadConfig()` and pass the result inward.

| Variable                | Default               | Notes                                                     |
| ----------------------- | --------------------- | --------------------------------------------------------- |
| `USERS_DATA_FILE`       | `./.data/users.json`  | Path used by `JsonFileUserRepository`.                    |
| `ORDERS_DATA_FILE`      | `./.data/orders.json` | Path used by `JsonFileOrderRepository`.                   |
| `PORT`                  | `3000`                | HTTP server port. Validated to be an integer in 1..65535. |
| `NODE_ENV`              | `development`         | One of `development` \| `production` \| `test`.           |
| `RATE_LIMIT_PER_MINUTE` | `60`                  | Per-key fixed-window limit for `RateLimitedCreateUser`.   |
| `ENABLED_FEATURES`      | _(empty)_             | Comma-separated. Recognized: `cache-users`.               |

---

## ▶️ Scripts

| Script           | What it does                                                            |
| ---------------- | ----------------------------------------------------------------------- |
| `npm start`      | Run the CLI composition root (`src/index.ts`)                           |
| `npm run serve`  | Run the HTTP composition root on `PORT`                                 |
| `npm run worker` | Run the queue worker (reads JSONL from stdin)                           |
| `npm test`       | Run Vitest (domain + application + infra + presentation + architecture) |
| `npm run lint`   | Lint with XO (autofix)                                                  |
| `npm run format` | Format with Prettier                                                    |

---

## 💻 CLI usage

```bash
npm start -- create-user --name "Alice" --email "alice@example.com"
npm start -- list-users
npm start -- get-user <id>
npm start -- rename-user --id <id> --name "Alicia"
npm start -- deactivate-user --id <id> --reason "spam"

npm start -- place-order \
  --customer-id <user-id> \
  --idempotency-key <key> \
  --item BOOK-1:2:9.99:USD \
  --item BOOK-2:1:14.50:USD

npm start -- list-orders --customer-id <user-id> --limit 20
npm start -- get-order <id>
npm start -- cancel-order --id <order-id> --customer-id <user-id> --reason "changed mind"
```

Domain errors map to non-zero exit codes; the centralized error mapping table lives in `src/presentation/cli/cli.ts` (CLI) and `src/presentation/http/server.ts` (HTTP).

---

## 🌐 HTTP usage

```bash
npm run serve
# HTTP server listening on http://localhost:3000
```

| Method | Path                 | Body                                                 | Success         | Notable errors                                                     |
| ------ | -------------------- | ---------------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| POST   | `/users`             | `{ name, email }`                                    | `201 UserDto`   | `400 INVALID_EMAIL`, `409 EMAIL_ALREADY_EXISTS`                    |
| GET    | `/users`             | —                                                    | `200 UserDto[]` | —                                                                  |
| GET    | `/users/:id`         | —                                                    | `200 UserDto`   | `404 USER_NOT_FOUND`                                               |
| POST   | `/orders`            | `{ customerId, items[] }` + `Idempotency-Key` header | `201 OrderDto`  | `403 FORBIDDEN`, `404 CUSTOMER_NOT_FOUND`, `409 CUSTOMER_INACTIVE` |
| GET    | `/orders`            | `?customerId&cursor&limit`                           | `200 OrderPage` | —                                                                  |
| GET    | `/orders/:id`        | —                                                    | `200 OrderDto`  | `404 ORDER_NOT_FOUND`                                              |
| POST   | `/orders/:id/cancel` | `{ reason }`                                         | `200 OrderDto`  | `403 FORBIDDEN`, `409 ORDER_ALREADY_CANCELLED`                     |

Authentication: HTTP routes read `X-Principal-Id` and `X-Principal-Roles` headers (dev-mode trust; replace with a real auth adapter for production — §6.4).

---

## 📨 Queue worker

The third delivery mechanism reads JSONL messages from stdin and dispatches them to use cases:

```bash
echo '{"kind":"place-order","input":{
  "principal":{"id":"<user-id>","roles":["customer"]},
  "customerId":"<user-id>",
  "items":[{"sku":"BOOK-1","quantity":1,"unitPrice":9.99,"currency":"USD"}],
  "idempotencyKey":"queue-1"
}}' | npm run worker
```

Adding a fourth delivery mechanism (gRPC, WebSocket, scheduled batch, …) means a new folder under `src/presentation/<name>/` and a new composition root at `src/<name>.ts`. No change in `application/` or `domain/`.

---

## 🧪 Testing

Tests live under `tests/` mirroring `src/`. The breakdown:

| Layer / kind   | What's tested                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain         | VO validation + invariants, entity behavior, aggregates, services, specs, property-based tests on `Money`                                                                        |
| Application    | Use cases through input ports with in-memory adapters; decorator behavior; saga subscription                                                                                     |
| Infrastructure | Contract tests (`runUserRepositoryContract`, `runOrderRepositoryContract`) — every adapter passes the same suite, including the `JsonFileXxxRepository` against a real tmp file  |
| Presentation   | CLI commands and HTTP routes driven through fake input ports; queue worker through stdin                                                                                         |
| Architecture   | Dependency rule, no cross-context imports, composition-root-only access to `composition.ts` and `new <ConcreteAdapter>(...)`, no barrel files, `process.env` only in `config.ts` |

Run all of it: `npm test -- --run`.

---

## 📂 Documentation

- [`AGENTS.md`](./AGENTS.md) — the binding architecture contract.
- [`docs/context-map.md`](./docs/context-map.md) — bounded-context relationships and integration patterns.
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records.
  - `0001-clean-architecture-baseline.md`
  - `0002-add-order-context.md`
  - `0003-shared-composition-module.md`

---

## 🚀 How to use this repository

This repo is structured as study material, not as a starter to fork. To get the most out of it:

1. Read [`AGENTS.md`](./AGENTS.md) end-to-end — it states the rules and the *why* behind each one.
2. Walk the code in dependency order: `domain/` → `application/` → `infrastructure/` → `presentation/`.
3. Run `npm test -- --run` to see the architectural fitness functions enforce the rules.
4. Use the recipes in [`AGENTS.md`](./AGENTS.md) §8 (add a use case, add an aggregate, add an adapter, add a delivery mechanism) as exercises in your own scratch project.
