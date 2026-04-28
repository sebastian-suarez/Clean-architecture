# AGENTS.md — Clean Architecture Compliance Contract

This file is a **hard contract** for any contributor (human or AI) working in this repository. The architecture is the product. If a change violates the rules below, it is wrong, regardless of how convenient it is.

The rules here are derived from Robert C. Martin's _Clean Architecture_, Eric Evans's _Domain-Driven Design_, Vaughn Vernon's _Implementing DDD_, the Hexagonal / Ports & Adapters pattern by Alistair Cockburn, Jeffrey Palermo's Onion Architecture, and Gerard Meszaros's _xUnit Test Patterns_. Where these traditions disagree, the choice this repo makes is stated explicitly.

---

## 0. Glossary

Use these terms with these meanings. If a contributor uses a term differently, point them here.

### Tactical (in-the-code) terms

- **Entity** — A domain object with stable identity (`id`). Two entities with the same fields but different ids are different entities.
- **Value Object (VO)** — An immutable domain object compared by structural equality, not identity. Self-validating in its factory. Example: `Email`, `Money`, `DateRange`.
- **Domain Primitive** — A VO that wraps a single primitive to give it meaning and validation (`UserId(string)`, `Quantity(number)`). Synonym: "tiny type."
- **Branded Type** — TypeScript implementation technique for a domain primitive when a class is overkill: `type UserId = string & { readonly __brand: "UserId" }`. Equivalent semantically to a VO; loses runtime validation, so use only when the value is opaque and validated at one boundary.
- **Aggregate** — A cluster of entities and value objects treated as one consistency boundary.
- **Aggregate Root** — The single entity in an aggregate that external code may reference. Inner members are reached only through the root.
- **Factory** — A construction object (function or class) that produces an entity / aggregate when the construction needs collaborators (clock, id-gen, cross-aggregate lookup) that don't belong as fields. Use when `static create(props)` would force the caller to wire too much.
- **Repository** — An output port whose contract is "store/retrieve aggregates of type X". One repository per aggregate root.
- **Read Model** — An output port returning a query DTO directly, bypassing the aggregate, for queries the aggregate cannot serve cheaply.
- **Domain Service** — A stateless function/class in `domain/` that orchestrates behavior across multiple entities when the behavior doesn't naturally belong on any one of them.
- **Domain Event** — An immutable past-tense fact (`OrderCancelled`) emitted by an aggregate to notify other parts of the system. See §3.6.
- **Domain Error** — A subclass of `DomainError` thrown by domain or application code to signal a business-rule violation. Carries a stable `code`.
- **Use Case (Interactor)** — An application-layer class implementing a single business operation. Stateless. Implements an input port. Returns a DTO (or invokes an Output Boundary — §4.8).
- **Input Port (Driving Port)** — A TypeScript interface describing a use case's signature. Presentation depends on input ports, never on use case classes.
- **Output Port (Driven Port, Gateway)** — A TypeScript interface describing a side-effect a use case needs (repository, clock, id generator, …). Defined in `application/`, implemented by `infrastructure/`.
- **Output Boundary (Presenter Port)** — A specialized output port the use case writes results into, instead of returning them. Lets presentation own the rendering format without the use case knowing. See §4.8.
- **Adapter** — A class in `infrastructure/` (driven) or `presentation/` (driving) implementing a port using a concrete technology.
- **DTO (Data Transfer Object)** — A plain primitives-only data shape returned by a use case or written into an Output Boundary. Crosses outward boundaries.
- **Mapper** — A pure function (or const-object of functions) that translates between two representations: domain↔DTO (in `application/mappers/`) or domain↔persistence-record (in `infrastructure/persistence/`).
- **Composition Root** — The single file per delivery mechanism that wires concrete classes (`src/index.ts`, `src/server.ts`).
- **Use-Case Decorator** — A class implementing the same input port as an inner use case, wrapping it to add a cross-cutting concern (logging, tracing, auth, transactions, retries).
- **Test Data Builder** — A fluent fixture constructor used in tests (`aUser().withEmail("…").build()`) so invariants are owned in one place.
- **Saga / Process Manager** — A long-lived coordinator that reacts to domain events and drives multi-step workflows across aggregates (§6.6).
- **Unit of Work** — An output port that brackets a set of repository operations into one transaction (§5.5).
- **Specification** — A reusable predicate object representing a domain rule (`UserIsActive`). Used to compose repository queries or in-domain checks. Out of scope by default (§5.5).

### Strategic (between-bounded-contexts) terms

- **Bounded Context** — A self-contained piece of the domain with its own ubiquitous language. Each direct subfolder of `src/domain/` is one bounded context.
- **Ubiquitous Language** — The vocabulary used by domain experts; mirrored exactly by the code in that bounded context.
- **Subdomain** — A slice of the business problem space. Three flavors: **Core** (the differentiator — invest the most), **Supporting** (custom but not differentiating), **Generic** (commodity, prefer buying / off-the-shelf). Code investment scales with subdomain type — see §6.5.
- **Distillation** — The DDD activity of identifying and protecting the Core domain by extracting supporting/generic concepts out of it.
- **Context Map** — The diagram + written record of how bounded contexts relate. Lives in `docs/context-map.md` once a second context exists. Updated when the relationships change.
- **Anti-Corruption Layer (ACL)** — An adapter that translates between the domain model and a foreign system whose model would otherwise contaminate the domain. Used when the foreign model is hostile.
- **Shared Kernel** — A small subset of the model two bounded contexts agree to share and co-own. High coupling cost — use sparingly (§6.5).
- **Customer/Supplier** — Asymmetric relationship: downstream context (customer) gets a voice in upstream's (supplier) priorities.
- **Conformist** — Downstream silently adopts the upstream model without translation. Cheap; risky; appropriate only when the upstream model is benign.
- **Open Host Service** — A bounded context that exposes a stable, public protocol for many downstream consumers (its API is its product surface).
- **Published Language** — The well-documented data format the Open Host Service speaks. JSON schemas, protobufs, OpenAPI documents.
- **Separate Ways** — Explicit decision that two contexts will not integrate. Each goes its own way. Cheaper than forcing a bad integration.
- **Partnership** — Two contexts succeed or fail together; coordinated planning required.
- **Big Ball of Mud** — The anti-pattern where no boundaries exist and everything depends on everything. Treat any drift toward it as a P0 architectural bug.
- **Strangler Fig** — Migration pattern: a new implementation grows around the old, gradually replacing it from the edges in. Often paired with an ACL.
- **Branch by Abstraction** — Migration pattern: introduce a port, route traffic through it, swap the implementation, retire the old one. The day-to-day version of the Strangler Fig.

### Test terms (Meszaros)

- **Test Double** — Umbrella term for a stand-in. Sub-types:
  - **Dummy** — Passed to satisfy a parameter, never used.
  - **Fake** — Working implementation simplified for tests (the in-memory repo is a Fake, not a Mock).
  - **Stub** — Returns canned answers to calls.
  - **Spy** — A Stub that also records its calls.
  - **Mock** — Pre-programmed with expectations; fails the test if called wrong.
    Use the right word — `mockUserRepository` is wrong if it's actually a Fake. Misnaming hides what the test is really asserting.
- **Architectural Fitness Function** — An automated test that fails when a stated architectural rule is violated (e.g., "no `application/` file imports from `infrastructure/`"). Lives next to the test suite.

---

## 1. The dependency rule and architectural principles

### 1.1 The dependency rule

**Source-code dependencies always point inward.** Outer layers know about inner layers; inner layers know nothing about outer layers. **No exceptions.**

```
presentation ──┐                ┌── infrastructure
               ▼                ▼
              application ───► domain
```

| Layer            | Path                            | May import from                                              | Must NOT import from                                     |
| ---------------- | ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| `domain`         | `src/domain/`                   | itself, Node std-lib (rare), TS only                         | application, infrastructure, presentation, any framework |
| `application`    | `src/application/`              | `domain`, itself, TS only                                    | infrastructure, presentation, any framework              |
| `infrastructure` | `src/infrastructure/`           | `domain`, `application`, Node std-lib, framework SDKs        | presentation                                             |
| `presentation`   | `src/presentation/`             | `domain` (only `DomainError`), `application`, framework SDKs | infrastructure (use the composition root instead)        |
| composition root | `src/index.ts`, `src/server.ts` | every layer                                                  | n/a — this is the only place wiring happens              |

The dependency rule is a direct application of the **Dependency Inversion Principle (DIP)**: high-level policy (use cases, entities) does not depend on low-level detail (HTTP frameworks, file systems). When you feel an inner layer needs something from an outer layer, define a **port** (interface) in the inner layer and have the outer layer **implement** it.

### 1.2 SOLID

- **SRP (Single Responsibility)** — One concept per file. One port per adapter file. "Reason to change" is defined by the actor: code changes for the actor that owns it. If two actors push changes into the same class, split it.
- **OCP (Open/Closed)** — Extend behavior by adding a new use case / adapter / decorator, not by modifying existing ones. Wrap, don't edit.
- **LSP (Liskov Substitution)** — Adapters and fakes implementing a port are fully substitutable. Contract tests (§10.4) enforce this at runtime.
- **ISP (Interface Segregation)** — Ports are narrow. `Clock` exposes only `now()`, not unrelated time helpers. Consumers depend on the smallest port that does the job.
- **DIP (Dependency Inversion)** — Depend on abstractions, never on concretions. Inner layers own the abstraction; outer layers implement it.

### 1.3 Component principles (Uncle Bob, Part IV)

Components in this codebase = top-level layers and bounded contexts. The cohesion/coupling principles operate at that scale.

**Cohesion — what belongs together in one component:**

- **REP (Reuse-Release Equivalence)** — The unit of reuse is the unit of release. A component is versioned and released as a whole.
- **CCP (Common Closure)** — Group classes that change for the same reasons. Things that change together belong together. (This is SRP at component scale.)
- **CRP (Common Reuse)** — Don't force consumers to depend on things they don't use. Group classes that are reused together. (This is ISP at component scale.)

These three are in tension: maximizing one hurts the others. This repo trades CRP for CCP inside a bounded context (one folder per context, fine-grained reuse not a goal) and trades CCP for CRP across contexts (no shared kernel by default — see §6.5).

**Coupling — how components depend on each other:**

- **ADP (Acyclic Dependencies Principle)** — **No cycles between components.** No bounded context may import from a bounded context that imports it back, directly or transitively. The composition root is the only allowed point of cycle resolution. Enforce with an architectural fitness function (§10.5).
- **SDP (Stable-Dependencies)** — Depend in the direction of stability. `domain/` is the most stable; `presentation/` and `infrastructure/` are the least. Stability = how hard the component is to change without breaking dependents.
- **SAP (Stable-Abstractions)** — Stable components must also be abstract. `domain/` is stable _and_ abstract (mostly types and pure logic). An adapter is unstable _and_ concrete. A stable concrete component is a smell — it can't bend without breaking everyone.

### 1.4 Other named principles applied throughout

- **Screaming Architecture** — The directory layout reflects the domain (`src/domain/<context>/`), not the framework. A reader infers "this is a user-management system" from `src/`, not "this is a Hono app."
- **Plugin Architecture** — Outer layers are plugins to inner layers. Removing or replacing infrastructure / presentation must require zero changes in `application/` or `domain/`.
- **Persistence Ignorance** — Domain types know nothing about how they are stored. No ORM annotations, no `@Column`, no schema decorators on entities or VOs. If a persistence concern leaks (a `_v` MongoDB version field, a SQL-shaped flag), translate at the mapper.
- **Humble Object** — Presentation routes and CLI commands stay thin, doing only transport translation. All testable logic lives behind input ports so it can be exercised without booting a server. Same idea on the way out: the Output Boundary lets the use case stay testable when rendering is non-trivial (§4.8).
- **Hollywood Principle ("don't call us, we'll call you")** — Inner layers don't pull from outer layers; outer layers register/inject themselves. The composition root is where the calling happens.
- **Tell, Don't Ask** — Send messages to objects that own the data; don't pull data out and decide elsewhere. `order.cancel(reason)` over `if (order.status === "open") order.status = "cancelled"`. Asks-then-decides logic in a use case is a sign that behavior should move into the entity.
- **Law of Demeter** — A method talks only to its immediate collaborators (params, fields, locals, things it constructs). `user.address.city.zip` is a smell; expose `user.zip()` if zip is a meaningful concept, otherwise keep the chain inside the aggregate.
- **YAGNI ("You Aren't Gonna Need It")** — Don't add a port, abstraction, decorator, or "hook" because you might need it. Wait for the second concrete use.
- **DRY (and its limits)** — Don't duplicate knowledge _within a bounded context_. **Do duplicate across bounded contexts** when the two concepts merely happen to share a name. Coupling two contexts to a shared model is more expensive than two slightly-different `User` types.
- **Boy Scout Rule** — Leave the campsite cleaner than you found it. Acceptable to fix a small unrelated nit while you're in a file; not acceptable to expand a small change into a refactor that obscures the diff.
- **Volatility-based decomposition** — Where possible, draw component boundaries between things that change at different rates. The dependency rule already does this (rules > use cases > adapters > UI), but it applies inside layers too: split a use case file when half of it churns weekly and half is stable.

### 1.5 Boundary anatomy

When data crosses an architectural boundary:

- **Outward** (use case → presentation): pass a **DTO** (§4.6). Never an entity, VO, or class instance.
- **Inward** (presentation → use case): pass a primitives-only **input DTO** (`CreateUserInput`). Validation of business meaning happens inside.
- **Across** (one context to another): pass through a port owned by the consumer (§6.5). Never a direct entity reference.

Boundaries are crossed by **data**, not by **objects with behavior**. If a value crossing a boundary has methods that the other side might call, the boundary is leaking.

### 1.6 What "Clean Architecture" inherits from related styles

This repo is the intersection of three traditions; all are honored:

- **Clean Architecture (Martin)** — concentric circles, dependency rule, use cases at the center.
- **Hexagonal / Ports & Adapters (Cockburn)** — ports as the symmetric boundary; driving (input) and driven (output) sides; adapters as plugins.
- **Onion Architecture (Palermo)** — domain at the center; application services around it; infrastructure on the outside; explicit invertion via interfaces in inner layers.

When this repo picks a side, it picks Hexagonal vocabulary (port/adapter), Clean's concentric model, and DDD's tactical patterns inside the domain.

---

## 2. Layer responsibilities

### 2.1 Domain (`src/domain/`)

Enterprise business rules. Pure TypeScript. Zero I/O, zero framework, zero `Date.now()` / `Math.random()` / `process.env`.

Lives here:

- **Entities** — see §3.1.
- **Value objects** — see §3.2.
- **Aggregate roots** — see §3.3.
- **Domain services** — see §3.4.
- **Domain errors** — see §3.5.
- **Domain events** (if used) — see §3.6.
- **Factories** (if used) — see §3.8.
- **Specifications** (if used) — see §5.5.

Forbidden:

- `import` from `#application/*`, `#infrastructure/*`, `#presentation/*`.
- Any third-party package import (`hono`, `vitest`, framework SDKs, etc.).
- Mutable global state.
- Direct calls to `Date`, `crypto.randomUUID`, `fetch`, `fs`, `process`, `console.*` (use a port, injected — see §6).
- Public mutable fields. Use `readonly` everywhere.

Permitted from `node:` / JS std-lib (pure, deterministic types only):

- Type-only usage of `Date` (as a parameter or field type — see §6.2 for _constructing_ dates).
- `URL`, `URLSearchParams`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`.
- `Intl.*` formatters, only if constructed from explicit inputs (no implicit host locale).

Anything else from `node:` (`fs`, `crypto`, `process`, `os`, `child_process`, `net`, `http`, …) is forbidden and must enter through a port.

### 2.2 Application (`src/application/`)

Use-case orchestration. Knows the domain; defines what the system does.

Lives here:

- **Use cases** (`use-cases/`) — see §4.
- **Use-case decorators** (`use-cases/`) — see §4.5.
- **Input ports** (`ports/input/`) — TypeScript types describing each use case's signature.
- **Output ports** (`ports/output/`) — TypeScript types describing side-effects.
- **Read-model ports** (`ports/output/`) — TypeScript types returning query DTOs directly (§4.1).
- **Output boundary ports** (`ports/output/`) — when use cases push results instead of returning them (§4.8).
- **DTOs** (`dtos/`) — plain primitives-only data shapes.
- **Mappers** (`mappers/`) — pure functions that turn domain entities into DTOs.
- **Sagas** (`sagas/`) — long-lived coordinators (§6.6), only if the project uses them.

Forbidden:

- `import` from `#infrastructure/*`, `#presentation/*`.
- Returning a domain entity from a use case (always map to a DTO).
- Calling `Date`, `crypto`, `fs`, `fetch`, `process`, `console.*` directly — inject a port.
- Importing any framework (`hono`, an ORM, etc.).
- Stateful use cases. A use case must hold no mutable state across calls; per-call data lives in locals.

### 2.3 Infrastructure (`src/infrastructure/`)

Adapters. Implements **driven (output) ports** with concrete technology.

Rules:

- Every class here `implements` an output port from `#application/ports/output/*`.
- File names reflect the technology: `json-file-user-repository.ts`, `postgres-user-repository.ts`, `redis-cache.ts`.
- One folder per concern (`persistence/`, `clock/`, `id/`, `http-clients/`, `messaging/`, `logging/`, `cache/`, …).
- Persistence adapters use a **mapper** (§5.2) to translate between the persistence record type (scoped to the persistence directory) and the domain entity. Persistence record types do not escape this layer.
- For every output port, an in-memory adapter must exist alongside any production adapter (§5.3).
- Resilience wrappers (timeout, retry, circuit breaker — §6.8) live as adapter decorators in this layer, not inside use cases.

Forbidden:

- `import` from `#presentation/*`.
- Implementing more than one port per file.
- Letting persistence record types escape this layer.

### 2.4 Presentation (`src/presentation/`)

Delivery mechanisms (driving adapters). Translates a transport (CLI argv, HTTP request, message-queue payload) into an input-port call, and a DTO / domain error back into a transport response.

Rules:

- Depend on **input ports** (`#application/ports/input/*`), never on use-case **classes**.
- Consume **DTOs** in responses; do not import domain entities or value objects for data.
- May import `DomainError` from `#domain/shared/domain-error.js` to translate `code` → status / exit code. **This is the only domain symbol presentation may use in production code.**
- One folder per delivery mechanism (`cli/`, `http/`, `queue/`, `grpc/`, `ws/`, …). Adding a new one must not require any change in `application/` or `domain/`.
- May call `console.*` directly for transport-level diagnostics. Use cases and domain may not.
- Validates **transport shape only** (e.g., "is `email` a string?"). Business validation lives in the use case or domain (§4.2).
- Transport-level errors thrown to indicate "the request is malformed before we even reach the use case" use a plain `Error` (or a transport-specific subclass). Only `DomainError` carries a stable `code`.

Forbidden:

- Calling `infrastructure/` directly. The composition root injects use cases.
- Containing business rules. If a check is interesting, it belongs in a use case or the domain.

### 2.5 Composition root (`src/index.ts`, `src/server.ts`) and config (`src/config.ts`)

The **only** place where concrete classes are instantiated and wired together. Each delivery mechanism gets its own composition root file at `src/`.

Rules:

- Composition roots call `loadConfig()` from `#src/config.js`, then construct adapters → use cases → presentation.
- `process.exit`, `process.argv`, and other "edge of world" calls live here, not deeper.
- Adding a new delivery mechanism = new file at `src/<name>.ts` + new npm script.
- The composition root is the **only** place in the codebase where `new <ConcreteAdapter>(...)` may appear. Anywhere else, depend on the port type. A grep for `new JsonFile…`, `new Postgres…`, `new System…` outside `src/<delivery>.ts` is a red flag.
- Composition roots stay **thin and declarative**. No business logic, no `if`/`switch` on env values beyond what `loadConfig()` already returned. If wiring grows complex, extract a `compose<X>(config)` factory in the same file — never in a separate "container" module that other layers might import.
- A DI/IoC container library is forbidden. Plain `new` calls in the composition root are the standard. Containers obscure the wiring graph and re-introduce the global registry the dependency rule eliminates.

**Configuration (`src/config.ts`) is the _only_ module allowed to read `process.env`.** It exposes a typed `AppConfig` and a `loadConfig()` function. `dotenv` is a `devDependency` and is loaded only when `NODE_ENV !== "production"` via a guarded dynamic import — production must inject env vars via the runtime (Docker, systemd, k8s, …).

If you need a new env var:

1. Add it to `AppConfig` and parse it in `loadConfig()` (with validation).
2. Add a documented entry to `.env.example`.
3. Pass the parsed value down from the composition root — **never** read `process.env` directly elsewhere.

---

## 3. Domain modeling rules

### 3.1 Entities

- Have a stable identity. Use a **typed id value object** (`UserId`, `OrderId`) rather than a bare `string`. Typed ids prevent silent argument swaps (`get(orderId, userId)` vs `get(userId, orderId)`) and document intent at call sites. The id VO wraps a `string` (or UUID/ULID) and is generated via the `IdGenerator` port (§6.2). This repo's `User` uses a bare `string` for brevity — production bounded contexts should upgrade to a typed id (recipe in §8.4).
- All fields `readonly`. State changes either produce a new instance or are applied through behavior methods that validate invariants before reconstruction.
- Use a **private constructor** plus a **static `create(props): Entity`** factory. A separate `reconstruct(props)` static must exist for hydration from persistence. The `constructor` is never `public`.
- **`create` vs `reconstruct`.** `create(props)` runs all creation invariants ("a new order must have at least one line item"). `reconstruct(props)` rehydrates from persistence and must **not** re-run creation-only invariants — past data may have been valid under older rules, and refusing to load it would brick the system. `reconstruct` still validates structural shape (types, non-null fields). Persistence adapters always go through `reconstruct`, never `create`.
- Behavior methods are named in business terms (`order.cancel()`, not `order.setStatusCancelled()`).
- **Rich, not anemic.** Entities encapsulate state _and_ behavior. If an entity is a bag of getters/setters with all logic living in a use case or "service", that's a transaction-script smell — push the logic onto the entity. Behavior that mutates the entity validates invariants before producing the new state.
- Equality is by `id`; the language doesn't enforce this, so compare ids (or id VOs via `.equals`) explicitly.
- **Tell, don't ask** (§1.4) — methods on the entity should _do_ the work, not expose state for the caller to inspect-and-decide.

### 3.2 Value objects

- Fully immutable: `readonly` fields, no setters, no mutating methods.
- Equality is by structural value, exposed via an `equals(other)` method.
- **Self-validating**: invalid input throws a `DomainError` from the static factory. Public constructor is forbidden.
- One concept per VO. `Email`, `Money`, `DateRange` are VOs; "an object that holds five unrelated primitives" is not.
- Implement `toString()` when serialization to a single string is meaningful.
- **Closure of operations** (Evans): when a VO operation returns the same type (`money.add(other) → Money`, `dateRange.intersect(other) → DateRange`), prefer that signature. It composes cleanly and keeps the operation inside the model.
- **Side-effect-free functions** (Evans): VO methods that compute new VOs must not mutate `this` and must not perform I/O. They are pure.
- For typed primitives (`UserId(string)`), prefer a full VO when the value has invariants to enforce (length, format, charset). Use a **branded type** (§0) only when the value is opaque, validated once at the boundary, and never compared structurally past that point.

### 3.3 Aggregates and aggregate roots

- An aggregate is a cluster of entities + VOs treated as a single consistency unit.
- Exactly one entity is the **aggregate root**. External code references the root by id; the root grants access to inner members through methods.
- One **repository** per aggregate root (§5.2). Inner entities have no repository of their own.
- All invariants of the aggregate are enforced by the root: changes to inner entities go through methods on the root.

**Vernon's four aggregate design rules** (apply in this order):

1. **Model true invariants in consistency boundaries.** An aggregate exists to enforce a rule that _must_ be true after every operation ("an order's total equals the sum of its line items"). If there is no such rule, you don't need an aggregate — you have two independent entities.
2. **Design small aggregates.** Prefer many small aggregates over one big one. Large aggregates lock more rows, fail more concurrent writes, and tempt cross-cutting reads. If your `save` writes thousands of rows, split the aggregate.
3. **Reference other aggregates by identity only.** Never hold an `OtherAggregate` reference inside an aggregate; hold an `OtherAggregateId`. The use case loads the other aggregate (or its read model) explicitly when needed. This keeps each aggregate a self-contained transactional unit.
4. **Use eventual consistency outside the boundary.** Cross-aggregate effects happen through domain events or an explicit `UnitOfWork`, not through one transaction that touches both. A use case mutates **at most one aggregate per call** (§3.7).

### 3.4 Domain services

- **Stateless.** No fields, only methods (or just exported pure functions).
- Live in `src/domain/<context>/services/<name>.ts`.
- Take entities/VOs as arguments, return entities/VOs or domain primitives.
- Use a domain service only when the behavior crosses multiple entities and doesn't naturally belong on any one of them. Reaching for a service for single-entity logic is a smell — put it on the entity.
- Distinct from a use case: a domain service is a pure domain operation; a use case is a transaction/orchestration. Domain services may be called by use cases or by other domain code; use cases are called only from presentation.
- A domain service must not depend on output ports — it stays pure. If it needs I/O, it's a use case in disguise.

### 3.5 Domain errors

- Extend `DomainError` (in `src/domain/shared/domain-error.ts`).
- Expose a stable `code: string` getter. **The `code` is part of the public API.** Renaming a code is a breaking change to every consumer (HTTP status mapping, CLI exit messages, alerts). Only add new codes; never rename or remove.
- Codes are SCREAMING_SNAKE_CASE strings (`USER_NOT_FOUND`, `INVALID_EMAIL`).
- Group errors per aggregate in `errors.ts`.
- Throw domain errors directly from VO factories, entity methods, and use cases. Catch only at the presentation boundary.
- Error messages describe the **business outcome**, never the underlying credential, secret, or technical detail. "Invalid email" — not "regex /^…$/ failed against value 'abc'".
- User-supplied input may appear in error messages (so the user can see what they typed); internal identifiers, query strings, and stack frames may not.

### 3.6 Domain events

This repo ships a worked example. The Order aggregate buffers events in `src/domain/order/events/` (`OrderPlaced`, `OrderConfirmed`, `OrderCancelled`, `LineItemAdded`); use cases (`PlaceOrder`, `ConfirmOrder`, `CancelOrder`) dispatch them via the `EventPublisher` port (`src/application/ports/output/event-publisher.ts`) after `repository.save`. The `InMemoryEventPublisher` adapter delivers to in-process subscribers (the saga and the projector — §6.6, §4.1).

- Events are **past-tense facts**: `OrderCancelled`, `UserRegistered`. Never `OrderCancelling` or `RegisterUser`.
- Events live in `src/domain/<context>/events/<name>.ts` as plain immutable types — same rules as DTOs (primitives only, `readonly`, serializable).
- An aggregate's mutating method records an event in a private buffer (`this.events.push(...)`); the use case dispatches the buffered events at the end of its execution via an injected `EventPublisher` output port. **Entities never publish events directly.**
- Event delivery is **at-least-once** by default. Subscribers are idempotent (§4.4).
- Subscribers are registered in the composition root.
- Events are part of the bounded context's published language when consumed across contexts (§6.5). Renaming or restructuring an externally-consumed event is a breaking change.

### 3.7 Aggregate transactional rules

- **Atomic load–mutate–save.** A use case loads an aggregate, mutates it, and persists it as one transactional unit. Partial saves of an aggregate are forbidden — repositories take and return the whole root.
- **One aggregate, one transaction.** A single use case touches at most one aggregate transactionally (§3.3). Cross-aggregate effects happen via eventual consistency (domain events) or an explicit `UnitOfWork` port (§5.5). Reaching for a multi-aggregate transaction is almost always a sign that the aggregate boundaries are wrong.
- **Optimistic concurrency.** When an aggregate may be edited concurrently, give the root a `version: number` and have the repository's `save` reject stale writes by throwing `ConcurrencyError extends DomainError` (`code: "CONCURRENT_UPDATE"`). The in-memory adapter must implement this check too — otherwise tests pass against a model production cannot satisfy.
- **Keep aggregates small** (Vernon Rule 2 — §3.3). Aggregates exist to enforce invariants, not to model "everything related to a noun."
- **No leaking inner state.** External code mutates the aggregate only through methods on the root (§3.3). Returning a mutable inner-entity reference is a bug; return copies, immutable views, or expose query methods (`order.lineItem(id): LineItemView`).

### 3.8 Factories

- Use a **factory** when entity construction needs collaborators that don't belong as fields — e.g., a clock, an id generator, or a lookup against another aggregate to validate a foreign-key invariant.
- A factory is preferred over an enormous `static create(props)` whose `props` smuggle in services. Concretely: when `create` would need 5+ unrelated arguments, extract a factory.
- Two flavors:
  - **Domain factory** — pure; no I/O. Lives at `src/domain/<context>/factories/<name>-factory.ts`. Used when construction needs domain logic but no side effects.
  - **Application factory** — depends on output ports. Lives at `src/application/factories/<name>-factory.ts`. Injected into use cases the same way ports are.
- A factory still produces aggregates via the entity's `static create` (§3.1). It does not bypass invariants.
- Don't introduce a factory speculatively. Default to `static create(props)`; promote to a factory when the construction signature gets noisy (YAGNI — §1.4).

### 3.9 Supple Design (Evans, Part III)

Patterns to apply when refactoring the domain toward expressive, low-friction code:

- **Intention-Revealing Interfaces** — Method names describe _what_ and _why_ in domain terms, not _how_. `order.cancel(reason)` over `order.updateStatus(3)`.
- **Side-Effect-Free Functions** — Operations that return new values (especially on VOs) must not mutate; commands that mutate must not return derived values. Don't combine.
- **Assertions** — Invariants are checked at the point they apply (in entity methods, in VO factories) and stated in tests. The code says what's true after each operation.
- **Conceptual Contours** — Carve modules along the natural fault lines of the domain. If a change consistently touches two files, they're miscarved.
- **Standalone Classes** — A class with no dependencies on other domain classes is the easiest to reason about. Prefer self-contained VOs where you can.
- **Closure of Operations** — When `f(T) → T` is possible, prefer it. It composes (`a.add(b).add(c)`).
- **Declarative Design** — Express _what_ should be true, not _how_ to make it true. Specifications (§5.5) are an example; rule DSLs are another. Don't invent a DSL prematurely (YAGNI).

---

## 4. Application layer rules

### 4.1 Use case granularity, naming, CQS, CQRS

- **One class per business operation.** No `UserService.doEverything()` — split into `CreateUser`, `UpdateUser`, `DeleteUser`.
- Use cases are named in **imperative verb + noun**: `CreateUser`, `CancelOrder`, `RebuildIndex`. A class named after a noun (`UserService`) is a code smell.
- Follow **Command / Query Separation (CQS)**:
  - **Commands** mutate state, named with mutating verbs: `create-`, `update-`, `delete-`, `cancel-`, `approve-`. May return a single DTO confirming the result.
  - **Queries** are pure reads, named with read verbs: `get-`, `list-`, `find-`, `count-`. Never mutate state — including via output ports.
- A single use case mutates **at most one aggregate** (§3.3).
- Use cases use **constructor injection** for all dependencies. No service-locator, no global registries, no `import` of concrete adapters.
- Use cases are **stateless**: no instance fields except the injected ports.
- **CQS, not full CQRS by default.** Queries and commands share the same domain model and repositories. If a query needs a denormalized projection that the aggregate cannot serve cheaply, define a separate **read-model port** (`UserReadModel`) returning a query DTO directly, instead of contorting the repository or the aggregate. This is the sanctioned step toward CQRS.
- **Full CQRS** (separate write model, read model, and persistence stores; reads served from a projection updated by events) is shipped as a worked example for the Order context: `ListOrders` (CQS, aggregate-backed) and `ListOrderSummaries` (CQRS, projection-backed) sit side-by-side. The read side uses two narrow ports — `OrderSummaryReadModel` for queries (`src/application/ports/output/order-summary-read-model.ts`), `OrderSummaryProjection` for writes (`src/application/ports/output/order-summary-projection.ts`) — both implemented by `InMemoryOrderSummaryReadModel`. The projection is rebuilt by `OrderSummaryProjector` (`src/application/projections/order-summary-projector.ts`), which subscribes to the Order events. Adopt this style when (a) read scale dwarfs write scale by an order of magnitude, (b) read shapes diverge meaningfully from the aggregate, or (c) you already have a reliable event stream. Don't adopt it for "future-proofing."
- **Event Sourcing** (storing events as the source of truth, deriving aggregate state by replay) is out of scope by default. It's a deep commitment — schema migration becomes event-version migration. If adopted, the aggregate replays events in `reconstruct(events: DomainEvent[])`; the repository is renamed to `EventStore`; snapshots become a performance concern.

### 4.2 Validation tiers

There are three places where validation happens. Put each kind in its own tier:

| Tier            | What it validates             | Where                         | Failure                                    |
| --------------- | ----------------------------- | ----------------------------- | ------------------------------------------ |
| Transport shape | "Is `email` a string?"        | Presentation (route, command) | Transport-level error (HTTP 400, CLI exit) |
| Domain format   | "Is this a valid email?"      | VO factory (`Email.create`)   | `DomainError` (`INVALID_EMAIL`)            |
| Business rule   | "Is the email already taken?" | Use case                      | `DomainError` (`EMAIL_ALREADY_EXISTS`)     |

A check exists in only one tier. Don't validate the email format in three places; trust the inner tier.

### 4.3 Error handling philosophy

- **Throw, don't return.** Use cases throw `DomainError` subclasses on business-rule violations; they don't return `Result<T, E>` / `Either` types. The control-flow stack is the channel.
- Presentation catches `DomainError` once at the boundary and translates `code` → HTTP status / CLI exit code via a centralized table (e.g. `statusByCode` in `src/presentation/http/server.ts`).
- Unexpected errors (not `DomainError`) are mapped to a generic 500 / exit 1 by the boundary handler. The original error is logged for diagnostics; the message must not leak to the client.
- Transport-level errors (malformed payload, missing CLI flag) are **not** `DomainError` — throw a plain `Error` (or a transport-specific subclass) so they don't acquire a `code` that callers might programmatically depend on.

### 4.4 Idempotency and retries

- Commands that may be retried by the caller (HTTP client retries, queue redeliveries, user double-clicks) must be **idempotent by design**. Either:
  - The operation is naturally idempotent (`SetUserEmail` to the same email twice is a no-op), or
  - The use case accepts a caller-supplied `idempotencyKey: string` and a dedicated `IdempotencyStore` output port deduplicates within a window.
- Never make idempotency the caller's problem ("just don't retry"). The system tolerates at-least-once delivery from any transport that supports retries.
- Queries are idempotent by definition (§4.1) — this rule applies to commands.
- Domain-event subscribers (§3.6) are idempotent for the same reason: events are at-least-once.

### 4.5 Use-case decorators (cross-cutting concerns)

When you need logging, tracing, metrics, authorization, transactions, retries, caching, or rate-limiting around a use case, **wrap it** rather than inlining the concern. Each concern is a class implementing the same input port:

```ts
class LoggedCreateUser implements CreateUserUseCase {
	constructor(
		private readonly inner: CreateUserUseCase,
		private readonly logger: Logger,
	) {}

	async execute(input: CreateUserInput): Promise<UserDto> {
		this.logger.info("create_user.start", { email: input.email });
		try {
			const result = await this.inner.execute(input);
			this.logger.info("create_user.ok", { id: result.id });
			return result;
		} catch (error) {
			this.logger.warn("create_user.fail", { error });
			throw error;
		}
	}
}
```

Wiring happens in the composition root: `new LoggedCreateUser(new CreateUser(...), logger)`. Use cases stay focused on the business operation; decorators are independently testable and stackable.

**Decorator order matters.** Build outward from the use case: `Auth(Tx(Retry(Logged(Traced(Inner)))))`. Authorization fails fast (no point retrying a forbidden call); transactions wrap retries (a retry must be inside the transaction, or each retry needs its own); logging captures the result the caller actually sees.

### 4.6 DTO contract

DTOs are the data shape that crosses the application↔presentation boundary. They are not domain types in disguise.

- **Primitives only.** `string`, `number`, `boolean`, `null`, arrays of these, and nested DTO objects of these. **No** `Date`, `Map`, `Set`, `BigInt`, class instances, or VO objects on a DTO. Convert at the mapper edge (`createdAt.toISOString()`, `email.value`).
- **`readonly` everywhere.** All fields and array members are `readonly`. Presentation must not mutate a DTO before serializing it.
- **No methods, no behavior.** A DTO is a `type`/`interface`, not a class. Equality is structural.
- **Additive evolution only.** Once a DTO field is exposed by a delivery mechanism, treat it as a public contract. Add new optional fields freely; renaming or removing a field is a breaking change to clients (HTTP API consumers, CLI scripters). Removing requires a deprecation cycle: ship the new field, mark the old as deprecated, remove only after consumers migrate.
- **Serializable.** A DTO must round-trip through `JSON.stringify` / `JSON.parse` losslessly. If you can't `JSON.stringify` it, it isn't a DTO.
- **Postel's Law** at the boundary: be liberal in what you accept (presentation may coerce `"42"` → `42` on input), conservative in what you emit (DTOs out have exact shapes). Coercion happens in presentation, not in the use case.

### 4.7 Mapper rules

- **Pure functions.** Mappers take inputs and return outputs. No I/O, no `new Date()` (use the ports if you need _now_), no logging, no state.
- **Total.** A mapper either succeeds for the entire input domain or throws a `DomainError`. Don't return `undefined` to mean "couldn't map this" — the caller can't reason about it.
- **Two flavors:**
  - `application/mappers/<noun>-mapper.ts` — domain entity ↔ DTO (outward boundary).
  - `infrastructure/persistence/<noun>-record.ts` — domain entity ↔ persistence record (downward boundary). The record type stays inside `infrastructure/persistence/` (§5.2).
- **Direction-explicit names.** `toDto` / `toDomain` / `toRecord`. Don't use ambiguous names like `map` or `transform`.

### 4.8 Output Boundary (Presenter port)

Sometimes returning a DTO is the wrong shape — the use case needs to push results progressively (streaming), or render multiple formats (HTML + JSON + CSV) without knowing which, or signal multi-step outcomes (success / partial / failure). For these cases, invert the dependency on presentation by giving the use case an **Output Boundary**:

```ts
type CreateUserOutput = {
	ok(user: UserDto): void;
	conflict(email: string): void;
};

class CreateUser implements CreateUserUseCase {
	async execute(input: CreateUserInput, out: CreateUserOutput): Promise<void> {
		// …
		out.ok(userMapper.toDto(user));
	}
}
```

Presentation implements `CreateUserOutput` (the route writes JSON, the CLI writes a line, the queue ack/nacks). The use case never imports presentation.

**Default to returning a DTO** (§4.1) — it's simpler, easier to test, and sufficient for sync request/response. Reach for an Output Boundary only when one of the conditions above genuinely applies. Mixing both styles in the same project is fine; mixing them in the same use case is not.

---

## 5. Ports & adapters rules

### 5.1 Port conventions

- Ports come in two families (Cockburn):
  - **Driving (input) ports** — `application/ports/input/`. The outside world calls _into_ the application through these. The use case `implements` them.
  - **Driven (output) ports** — `application/ports/output/`. The application calls _out_ through these. Adapters in `infrastructure/` `implement` them.
- The architecture is **symmetric**: both sides cross the boundary through ports, and both kinds of adapter are replaceable plug-ins.
- Every output-port method that touches I/O returns `Promise<T>`, even if a particular adapter is sync. This keeps adapters substitutable without rewriting use cases.
- Synchronous-by-nature ports may stay sync (`Clock.now(): Date`, `IdGenerator.next(): string`).
- Ports are **narrow** (ISP): each represents a single concern. Don't bundle unrelated methods on a single port (`UserRepository` is for persistence; don't add `sendEmail()` to it).
- Ports use **domain types** in their signatures, never persistence-shaped records.
- Output ports are TypeScript `type`s (or `interface`s); they are not classes. Adapters use `implements` to satisfy them.
- An input port is a TypeScript `type` describing the use case's `execute` signature. The use case `implements` it.

### 5.2 Repository rules

- One repository per aggregate root.
- Methods are expressed in **domain terms** (`findActiveSubscribersBefore(date)`), not technology terms (`runQuery("SELECT …")`).
- Always return aggregate roots (entities) or arrays thereof — never partial records, never persistence rows, never query-builder objects.
- Read methods may take VO parameters (`findByEmail(email: Email)`).
- Delete methods take the id of the root: `delete(id: UserId)`.
- `save(user)` is upsert by default — creates if absent, updates otherwise. Split into `create` / `update` only when the distinction is part of the domain.
- Persistence adapters use a record type + a mapper (`<noun>-record.ts`). The record type lives in `infrastructure/persistence/` and may be shared within that directory (mappers, adjacent adapters), but **must not** be imported from `application/`, `domain/`, or `presentation/`. If a presentation layer needs persistence-shaped data, it's a missing read-model — not an excuse to leak the record.
- **No unbounded queries on production-scale data.** Repository read methods must either be naturally bounded (`findById`, `findByEmail`) or accept an explicit pagination contract:

  ```ts
  type Page<T> = {
  	readonly items: readonly T[];
  	readonly nextCursor: string | undefined;
  };
  type Pagination = { readonly cursor?: string; readonly limit: number }; // limit ∈ [1, 100]
  ```

  `findAll(): Promise<User[]>` is acceptable in this repo only because the dataset is small and the boundary case is "in-memory test fixture." A production repository must offer a paginated alternative; if both exist, the unbounded one should be commented as test-only.

- **Optimistic concurrency** (§3.7): if the aggregate carries a `version`, the repository's `save` rejects stale writes with `ConcurrencyError`. Every adapter — including in-memory — implements this consistently.
- **Read model ports** are _not_ repositories — they return DTOs and may be backed by a denormalized projection. Don't bend a repository to serve query DTOs (§4.1).

### 5.3 In-memory adapter is mandatory

For every output port, an in-memory adapter must exist alongside any production adapter. It serves as:

- The default test double for application tests.
- A reference implementation that any other adapter must behave equivalently to (verified by §10.4 contract tests).

When you add a new output port, add the in-memory adapter in the same PR.

### 5.4 Anti-Corruption Layer (ACL)

When integrating a foreign system whose model conflicts with the domain (legacy API, third-party SaaS, vendor SDK):

- Place the integration in `src/infrastructure/<concern>/<vendor>-<port>.ts`.
- Translate the foreign model to the domain model **inside the adapter**. The application and domain layers must never see foreign types.
- If the translation is non-trivial, extract a private mapper. If the integration grows, isolate it in a subfolder (e.g. `infrastructure/billing/stripe/`).
- The ACL is the implementation of the **Anticorruption Layer** context-mapping pattern (§6.5) at the infrastructure boundary.

### 5.5 Out of scope by default

These DDD/CA-adjacent patterns are not used in this repo. If you need one, follow the convention below; don't invent a new one.

- **Specifications** — A `Specification<T>` is a reusable predicate object (`new ActiveUserSpec().and(new SignedUpAfterSpec(date))`). Useful when (a) the same predicate appears in multiple places, (b) predicates compose freely, (c) the persistence layer can translate the spec to a query. **Prefer adding a domain-named repository method (`findActiveBefore`)** over a generic `find(spec)`. Adopt specifications when the predicate matrix grows past ~5 named methods.
- **Unit of Work** — Define a `UnitOfWork` output port; have infrastructure coordinate the transaction; use cases call `unitOfWork.run(async () => …)`. Never leak transaction objects into the application layer. Used when a single use case must update an aggregate _and_ an idempotency record (or similar) atomically.
- **Event Sourcing** — see §4.1.

Patterns that ship as worked examples (no longer "out of scope"):

- **Domain events** — see §3.6 (`Order` aggregate, `EventPublisher` port).
- **Sagas / process managers** — see §6.6 (`OrderConfirmationSaga`, `OrderProcess` aggregate).
- **CQRS read-side projections** — see §4.1 (`OrderSummaryProjector`, `OrderSummaryReadModel`, `ListOrderSummaries`).

---

## 6. Cross-cutting concerns

### 6.1 Logging

- No production code in `domain/` or `application/` may call `console.*`.
- Presentation may call `console.*` for transport-level diagnostics. Composition roots may call `console.*` for boot/shutdown messages.
- If the project grows to need structured logging, add a `Logger` output port (`info`, `warn`, `error`) and inject it into use cases that need it (preferably via a decorator — §4.5). Provide a console / pino / cloud-logging adapter in `infrastructure/logging/`.
- Log fields are **structured** (object) — never f-string log messages with interpolated state. Search/aggregation tools rely on field names.
- Never log secret-bearing fields (§6.10).

### 6.2 Time and identity

- The current time enters the system through the `Clock` output port. Domain and application code never call `new Date()` / `Date.now()`.
- Identifiers enter the system through the `IdGenerator` output port. Domain and application code never call `crypto.randomUUID()` / `Math.random()`.
- This rule exists so use cases are deterministic given their inputs and port doubles — a cornerstone of testability.
- **Clock returns UTC.** `Clock.now(): Date` is always UTC. Time-zone-aware presentation ("your local time is …") happens in the presentation layer, fed by the user's locale / preference, not by the host's `TZ` env var.
- **Monotonic vs wall-clock.** If the domain needs _durations_ (rate-limiting, "expired after N seconds"), prefer a separate `Monotonic.now(): number` (ms-since-arbitrary-epoch) port — wall-clock can jump backwards under NTP correction. Most use cases don't need this; add it only when correctness depends on it.

### 6.3 Configuration

See §2.5. Read by `src/config.ts`, injected from there. Forbidden anywhere else.

### 6.4 Authentication / authorization

If introduced:

- **Authentication** (who is this?) lives at the presentation boundary. The route extracts the principal from the transport (header, cookie, JWT) and passes a `principalId: string` (or richer DTO) into the use case.
- **Authorization** (may they do this?) is enforced inside the use case against the principal. The use case throws a `ForbiddenError extends DomainError` (`code: "FORBIDDEN"`) on denial.
- For coarse, route-level auth ("any signed-in user can hit `/users`"), prefer a **use-case decorator** that checks the principal before delegating (§4.5). For fine-grained, data-aware auth ("can this user see this order?"), the check belongs inside the use case where the data is loaded.
- Never trust transport-level claims that haven't been verified by the auth adapter. Token verification happens in `infrastructure/auth/`, not in the route.

### 6.5 Inter-context communication

When one bounded context needs data or behavior from another bounded context **inside the same repo**, treat the boundary as seriously as a network boundary:

- **Don't import a foreign context's entities or VOs.** `domain/billing/` cannot `import` from `domain/user/`. The two contexts have different ubiquitous languages — a `User` in billing and a `User` in identity are different concepts that happen to share a name.
- **Communicate through published-language DTOs** owned by the consumer's application layer, populated by an adapter. Concretely: define an output port (`BillingCustomerLookup`) in the consumer's `application/ports/output/`; implement the adapter in `infrastructure/` so it calls into the other context (in-process today, RPC tomorrow) and translates to the consumer's DTO. This is the ACL pattern (§5.4) applied internally.
- **Shared Kernel is forbidden by default.** Only the bare minimum (`DomainError`, broadly-applicable VOs like a generic `Money` if and only if both contexts genuinely use the same definition) may live in `domain/shared/`. When in doubt, duplicate — duplication across contexts is healthier than coupling.
- **Domain events are the preferred coupling** when a context needs to _react_ to another context's changes (§3.6). Direct synchronous calls between contexts should be the exception, not the default.
- **No cycles between contexts** (ADP — §1.3). If two contexts need each other, one is misnamed or the boundary is in the wrong place.

**Subdomain investment.** Classify each context by its subdomain type (§0):

- **Core** — invest the most modeling effort. Custom code, deep aggregates, tested heavily. This is where the business wins.
- **Supporting** — custom but not differentiating. Reasonable models, less ceremony than Core.
- **Generic** — buy or use OSS. If you must build, keep it minimal and isolated behind an ACL so you can swap to a vendor later.

Don't pour Core-level effort into a Generic subdomain; don't ship a Generic-quality model for Core.

**Context-map relationship vocabulary.** When you document how two contexts interact (in `docs/context-map.md`), use the names from §0:

| Pattern              | Power dynamic             | When to use                                             |
| -------------------- | ------------------------- | ------------------------------------------------------- |
| Shared Kernel        | Equal, co-owned           | Tiny shared model both teams agree to govern jointly    |
| Customer / Supplier  | Downstream has a voice    | Downstream depends on upstream; planning negotiated     |
| Conformist           | Upstream dictates         | Upstream is benign; translation cost not worth it       |
| Anticorruption Layer | Downstream isolates       | Upstream is hostile / legacy; protect your model        |
| Open Host Service    | Upstream serves many      | Many downstreams; stable public protocol justified      |
| Published Language   | Pairs with Open Host      | Documented, versioned format (JSON schema, protobuf, …) |
| Separate Ways        | No relationship           | Integration cost > integration benefit                  |
| Partnership          | Mutual success or failure | Neither side can ship without the other                 |
| Big Ball of Mud      | (anti-pattern)            | Treat as a bug; don't deepen it                         |

Default for new contexts in this repo: **Anticorruption Layer in both directions**. Loosen only with explicit justification.

### 6.6 Sagas / process managers

A worked example ships in `src/application/sagas/order-confirmation-saga.ts`. The saga subscribes to `OrderPlaced`, drives a two-step workflow (reserve inventory via `InventoryReservation` → confirm the order via the `ConfirmOrder` use case), and compensates by calling `CompensateOrderConfirmation` if the reservation fails. State lives in the `OrderProcess` aggregate (`src/domain/order/order-process.ts`), persisted via `OrderProcessRepository` with optimistic concurrency (§3.7).

- The saga lives in `application/sagas/<name>.ts` and listens to domain events via the `EventPublisher` port (§3.6).
- The saga's state is an aggregate of its own — persisted via its own repository, with the same atomicity rules (§3.7).
- Compensating actions for partial failures are explicit use cases (e.g. `CompensateOrderConfirmation`), not buried `try/catch` cleanup. The compensation is its own input port so the auth check that protects the user-driven `CancelOrder` doesn't apply to the system-initiated rollback.
- Sagas are **idempotent** by construction (§4.4) — the same event delivered twice produces the same final state. The example dedupes on `OrderProcessRepository.findByOrderId(orderId)` before doing work, so at-least-once `OrderPlaced` delivery is safe.

Don't smuggle a saga into a use case as a long `try { … } catch { rollback() }` block — that creates a hidden state machine no one can reason about.

### 6.7 Observability (logs, metrics, traces)

The three observability signals each enter through their own port, never directly:

- **`Logger`** — see §6.1.
- **`Metrics`** — `counter(name, tags)`, `histogram(name, value, tags)`, `gauge(name, value, tags)`. Adapter in `infrastructure/metrics/` for Prometheus / StatsD / vendor.
- **`Tracer`** — `startSpan(name, attributes): Span` with `span.end()` / `span.recordError()`. Adapter in `infrastructure/tracing/` for OpenTelemetry / vendor.

Wire them as **decorators** (§4.5) — `TracedCreateUser`, `MeteredCreateUser` — not by littering use cases with `tracer.startSpan` calls. The use case stays focused on the business operation; the decorator owns the cross-cutting concern.

### 6.8 Resilience

When an output port talks to a flaky dependency (network, third party, slow disk), apply resilience patterns at the **adapter** layer, as wrappers, not inside use cases:

- **Timeout** — bound every outbound call. No naked `await fetch(...)`.
- **Retry** with exponential backoff and jitter. Only retry idempotent operations or those guarded by an idempotency key.
- **Circuit breaker** — open after N consecutive failures, half-open after a cooldown.
- **Bulkhead** — cap the concurrent in-flight calls per dependency so one bad backend doesn't starve the rest.
- **Fallback** — explicit, business-meaningful default when the dependency is down (cached value, neutral response). Fallbacks are a domain decision, not a technical one — a fallback that ships wrong data is worse than an error.

Implement as adapter decorators: `RetryingUserRepository`, `TimedOutHttpClient`. Wired in the composition root.

### 6.9 Caching, rate limiting, multi-tenancy, audit, feature flags

All of these are out of scope by default. If introduced, follow the same pattern: a port per concern, an in-memory adapter for tests (§5.3), wired via decorator or composition.

- **Caching** — `Cache<T>` port with `get`/`set`/`invalidate`. Wrap a repository in a `CachedUserRepository` decorator. The cache is invalidated by the same use case that mutates the underlying data; cache invalidation is _never_ the cache adapter's responsibility to figure out.
- **Rate limiting** — `RateLimiter` port with `check(key): Promise<Allowed | Denied>`. Applied as a use-case decorator or at the presentation boundary.
- **Multi-tenancy** — every use case that touches tenant-scoped data takes a `tenantId` (or the principal carries it). Repositories filter by tenant; the in-memory adapter must also enforce isolation, otherwise tests pass against a model production rejects.
- **Audit logging** — define an `AuditLog` output port; emit entries from a decorator on mutating use cases. Audit entries are append-only and carry `principalId`, `action`, `targetId`, `timestamp`, `outcome`.
- **Feature flags** — `FeatureFlags` output port (`isEnabled(flag, principalId): boolean`). Read in the composition root or inside a decorator that selects which inner use case to call. **Never `if (env === "prod")` inside a use case** — that's a feature flag with worse ergonomics.

### 6.10 Secrets handling

- Secrets (DB passwords, API keys, JWT signing keys) enter the process the same way other config does (§2.5): parsed in `src/config.ts`, injected from the composition root. They never appear in source, tests, fixtures, or `.env.example` (use a placeholder like `REPLACE_ME`).
- **Never log a secret.** Mappers, error formatters, and the global `onError` handler must redact known-sensitive fields (`password`, `token`, `authorization`, `cookie`, `apiKey`). When in doubt, redact.
- **Never put a secret in a `DomainError` message** (§3.5). Error messages surface to clients (HTTP body, CLI stderr) — keep them about the _business outcome_, not the underlying credential.
- A leaked secret is **rotated**, not redacted-after-the-fact. Rotation is a runbook step (config change + redeploy), not a code change.
- **Encryption at rest** for sensitive data is handled by the persistence adapter, not the domain. The domain holds plaintext; the adapter encrypts on `save` and decrypts on `findById`. Key material lives in config (§2.5).
- **Encryption in transit** is handled by the transport (TLS at the load balancer / framework). The domain doesn't know about it.

### 6.11 Internationalization

If introduced:

- Domain errors carry **codes** (§3.5), not messages, as their public contract. The presentation layer translates `code` → localized message using the request's locale.
- Domain code never imports a translation table or formats a localized string. If a domain message _must_ embed a value (a quantity, a name), that's done at the presentation layer using the structured fields on the error.
- Locale is a presentation concern: extracted from a header / user preference in presentation, never read from `process.env.LANG`.

### 6.12 Migration patterns (Strangler Fig, Branch by Abstraction)

Use these when replacing a legacy implementation behind a port:

- **Branch by Abstraction** is the day-to-day move:
  1. Define (or already have) the output port.
  2. Adapter A is the existing implementation; adapter B is the replacement.
  3. The composition root chooses one (often via a feature flag — §6.9) per call or per environment.
  4. Migrate traffic gradually; retire A when B is stable.
- **Strangler Fig** is the same idea applied at a coarser scale — a whole new bounded context grows around the old, with an ACL (§5.4) translating between them, until the old context can be deleted. Used for legacy modernization.

Never edit the legacy code path to "improve it" mid-migration — that defeats the point and creates a third state to reason about. Add the new path; route to it; delete the old.

---

## 7. Naming and file conventions

| Concept              | File suffix / pattern                       | Example                                                        |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Entity               | `<name>.ts`                                 | `domain/user/user.ts`                                          |
| Value object         | `<name>.ts`                                 | `domain/user/email.ts`                                         |
| Typed id             | `<name>-id.ts`                              | `domain/user/user-id.ts`                                       |
| Domain error         | grouped in `errors.ts` per aggregate        | `domain/user/errors.ts`                                        |
| Domain service       | `services/<name>.ts`                        | `domain/order/services/pricing.ts`                             |
| Domain event         | `events/<name>.ts`                          | `domain/order/events/order-cancelled.ts`                       |
| Domain factory       | `factories/<name>-factory.ts`               | `domain/order/factories/order-factory.ts`                      |
| Specification        | `specifications/<name>-spec.ts`             | `domain/user/specifications/active-user-spec.ts`               |
| Use case             | `<verb>-<noun>.ts`                          | `application/use-cases/create-user.ts`                         |
| Use-case decorator   | `<adjective>-<verb>-<noun>.ts`              | `application/use-cases/logged-create-user.ts`                  |
| Application factory  | `factories/<name>-factory.ts`               | `application/factories/order-factory.ts`                       |
| Saga                 | `sagas/<name>.ts`                           | `application/sagas/order-confirmation-saga.ts`                 |
| Saga state aggregate | `<name>-process.ts`                         | `domain/order/order-process.ts`                                |
| Projector            | `projections/<name>-projector.ts`           | `application/projections/order-summary-projector.ts`           |
| Input port           | `<verb>-<noun>-use-case.ts`                 | `application/ports/input/create-user-use-case.ts`              |
| Output port          | `<noun>.ts`                                 | `application/ports/output/user-repository.ts`                  |
| Read-model port      | `<noun>-read-model.ts`                      | `application/ports/output/user-read-model.ts`                  |
| Output boundary      | `<verb>-<noun>-output.ts`                   | `application/ports/output/create-user-output.ts`               |
| DTO                  | `<noun>-dto.ts`                             | `application/dtos/user-dto.ts`                                 |
| Mapper               | `<noun>-mapper.ts` (camelCase const export) | `application/mappers/user-mapper.ts`                           |
| Adapter              | `<tech>-<port>.ts`                          | `infrastructure/persistence/json-file-user-repository.ts`      |
| Adapter decorator    | `<adjective>-<port>.ts`                     | `infrastructure/persistence/cached-user-repository.ts`         |
| Persistence record   | `<noun>-record.ts`                          | `infrastructure/persistence/user-record.ts`                    |
| HTTP route file      | grouped per resource                        | `presentation/http/routes/users.ts`                            |
| CLI command          | `<verb>-<noun>.ts`                          | `presentation/cli/commands/create-user.ts`                     |
| Test data builder    | `<noun>-builder.ts`                         | `tests/user/builders/user-builder.ts`                          |
| Contract test        | `<port>-contract.ts`                        | `tests/infrastructure/persistence/user-repository-contract.ts` |
| Architecture test    | `<rule>.arch.test.ts`                       | `tests/architecture/dependency-rule.arch.test.ts`              |

### 7.1 TypeScript-specific conventions

- Use `.js` import specifiers in TS sources (Node ESM resolution).
- Use the `#layer/*` aliases — never `../../../`.
- `kebab-case` filenames; `PascalCase` classes; `camelCase` consts and functions.
- Domain error codes: `SCREAMING_SNAKE_CASE` strings.
- **`import type`** for type-only imports — keeps the runtime import graph minimal and prevents accidental value imports across layer boundaries.
- **Branded types** for opaque domain primitives (`type UserId = string & { readonly __brand: "UserId" }`) when a full VO class is overkill — see §3.2.
- **Discriminated unions** for sum types (`type OrderStatus = { kind: "open" } | { kind: "cancelled"; reason: string }`). Prefer over enums + optional fields.
- **No barrel files** (`index.ts` re-exporting from a folder). Barrels obscure the dependency graph, defeat tree-shaking, and make architectural fitness tests harder to write. Import from the source file directly.
- **One concept per file** (SRP at file level). Multiple closely-related types in one file is acceptable when they form a single concept (e.g., `CreateUserInput` + `CreateUserUseCase` together). Unrelated concepts go in separate files.
- **No default exports.** Named exports only — they grep cleanly, rename safely, and keep import names consistent across the codebase.
- **Use `readonly` on every field**, every array (`readonly T[]`), every tuple position. Mutability is opt-in, not opt-out.
- **No `any`.** Use `unknown` at boundaries, narrow with `instanceof` / type guards.

### 7.2 Other conventions

- Each direct subfolder of `src/domain/` is a **bounded context** with its own ubiquitous language. Don't reuse a name (`User`, `Order`) across two contexts; if you need both, prefix or namespace.
- Use **tabs** for indentation (matches XO/Prettier config).
- Code is formatted by Prettier; lint is enforced by XO. Local exceptions in `xo.config.ts` must be scoped to the smallest possible file glob and justified inline.
- Pre-commit hooks (Husky + lint-staged) run `xo --fix` and `prettier --write` on staged files. Don't bypass them.

---

## 8. Recipes

### 8.1 Add a new use case to an existing aggregate

1. Define the input port at `src/application/ports/input/<verb>-<noun>-use-case.ts`.
2. Implement the use case at `src/application/use-cases/<verb>-<noun>.ts` — `implements` the input port, returns a DTO (or accepts an Output Boundary — §4.8), no shared state.
3. Wire it in every composition root that should expose it (wrap in decorators where needed — §4.5).
4. Add a presentation entrypoint depending on the input port.
5. Test the use case with the in-memory adapter and hand-rolled port doubles.

### 8.2 Add a new entity / aggregate

1. Create `src/domain/<aggregate>/` with the entity (private ctor + static `create` + static `reconstruct`), value objects, typed id (§3.1), and `errors.ts`.
2. Define an output port `src/application/ports/output/<aggregate>-repository.ts`.
3. Add the **in-memory** adapter (mandatory) plus any production adapter (with a mapper).
4. Add a DTO and a mapper.
5. Add use cases as in 8.1.

### 8.3 Add a new value object

1. Create `src/domain/<context>/<name>.ts`.
2. Private constructor, `static create(raw): Name` factory that throws a `DomainError` on invalid input.
3. `equals(other: Name): boolean` for structural equality.
4. `toString()` if a single-string serialization is meaningful.
5. Add a domain error to `errors.ts` (e.g. `InvalidEmailError`).
6. Test the VO directly: valid input round-trips, every invalid shape throws, equality is structural.

### 8.4 Add a typed id (upgrade from `string`)

1. Create `src/domain/<context>/<noun>-id.ts` as either a VO (preferred when there's format validation) or a branded type (`type UserId = string & { readonly __brand: "UserId" }`).
2. Update the entity's `id` field type and any port methods (`findById(id: UserId)`).
3. Update the `IdGenerator` adapter to return the branded type (a small cast at the adapter boundary is fine — that's where the brand is applied).
4. Update DTOs to keep emitting `string` (DTOs are primitives only — §4.6); the brand stays inside the domain.
5. Update tests / builders.

### 8.5 Add a domain service

1. Create `src/domain/<context>/services/<name>.ts` as exported pure functions (preferred) or a stateless class.
2. The service takes entities/VOs as args, returns entities/VOs or domain primitives. No I/O, no ports.
3. Test it directly with in-memory fixtures (built via §10.3 builders).

### 8.6 Add a domain factory

1. Decide: domain factory (no I/O) or application factory (depends on output ports).
2. Domain: `src/domain/<context>/factories/<name>-factory.ts`. Application: `src/application/factories/<name>-factory.ts`.
3. The factory still produces aggregates via the entity's `static create` — invariants stay on the entity.
4. Inject the factory the same way ports are injected: constructor parameter on the use case.

### 8.7 Add a new infrastructure adapter (e.g. Postgres)

1. Implement the relevant output port in `src/infrastructure/<concern>/<tech>-<port>.ts`.
2. If persistence: define a record type + mapper inside `infrastructure/persistence/`.
3. Add the adapter to the contract test (§10.4) so it passes the same suite as the in-memory one.
4. Swap it in at the composition root. Application and domain do not change.

### 8.8 Add a new delivery mechanism

1. Add `src/presentation/<mechanism>/…` depending only on input ports + DTOs + (optional) `DomainError`.
2. Add a new composition root `src/<mechanism>.ts` that wires adapters → use cases → mechanism.
3. Add an npm script.

### 8.9 Add a new env var

See §2.5 step list.

### 8.10 Add a new domain error code

1. Add the class to `errors.ts` with a `SCREAMING_SNAKE_CASE` `code`.
2. Add the code → status mapping in every presentation `statusByCode` table that should expose it.
3. Once shipped, **never rename the code** — it's a public contract. Only add new codes.

### 8.11 Add a use-case decorator

1. Create the decorator at `src/application/use-cases/<adjective>-<verb>-<noun>.ts` implementing the same input port as the inner use case.
2. Wire it in each composition root: `new LoggedCreateUser(new CreateUser(...), logger)`.
3. Test the decorator with a fake inner use case implementing the input port — don't depend on the real inner.
4. Mind the decorator order (§4.5).

### 8.12 Add a read-model port

1. Define the port at `src/application/ports/output/<noun>-read-model.ts` returning a query DTO directly.
2. Add an in-memory adapter (mandatory — §5.3) and any production adapter.
3. Inject it into the relevant query use case. The aggregate and its repository are unaffected.

### 8.13 Add an Output Boundary

1. Define the output type at `src/application/ports/output/<verb>-<noun>-output.ts` — a small interface with one method per outcome (`ok`, `conflict`, `notFound`).
2. Change the use case's `execute` signature to take the output as a second argument (and return `void`).
3. Update each presentation entrypoint to implement the output and pass it in.
4. Use cases that already return DTOs stay that way — only adopt this for use cases whose outcomes don't fit a single return type.

### 8.14 Add a domain event

1. Create the event type at `src/domain/<context>/events/<name>.ts` — past-tense, immutable, primitives only.
2. Have the aggregate's mutating method buffer the event in a private field (`this.events.push(...)`).
3. The use case dispatches buffered events via the `EventPublisher` output port at the end of `execute`.
4. Subscribers live in `application/` (handler classes) or other contexts (via their own adapter).
5. Subscribers are idempotent (§4.4).

### 8.15 Add a saga / process manager

1. Create `src/application/sagas/<name>.ts`.
2. The saga subscribes to one or more domain events via the `EventPublisher` port.
3. The saga's state is its own aggregate, persisted via its own repository (§3.7).
4. Compensating steps are explicit use cases the saga calls — not buried `try/catch`.
5. The saga is idempotent.

### 8.16 Split an aggregate

When an aggregate has grown past Vernon's "small aggregates" rule (§3.3):

1. Identify the true invariant that requires the consistency boundary. Anything outside that invariant is a candidate for extraction.
2. Extract the candidate into its own aggregate with its own root, repository, and id.
3. Replace inner references with id references (Vernon Rule 3).
4. Where the old aggregate enforced cross-boundary consistency, introduce a domain event + saga (§3.6, §6.6) or accept eventual consistency.
5. Ship the change behind Branch by Abstraction (§6.12) if the old shape is widely used.

### 8.17 Retire a use case

1. Mark the input port `@deprecated` with a JSDoc note pointing to the replacement.
2. Add a deprecation log at the start of `execute` so usage is observable.
3. Remove presentation entrypoints once telemetry shows no traffic for a full release cycle.
4. Remove the use case class and input port.
5. Update the changelog / release notes — input ports are part of the public surface for any in-tree consumer.

### 8.18 Migrate an adapter (Branch by Abstraction)

1. Confirm the port already exists; if not, extract it from the legacy adapter first.
2. Implement the new adapter in `infrastructure/`.
3. Add the new adapter to the contract test (§10.4) — it must pass the same suite.
4. Add a config flag (§6.9) to choose the adapter at composition time.
5. Roll the flag forward; monitor; remove the legacy adapter and the flag.

### 8.19 Add a resilience decorator (timeout / retry / circuit breaker)

1. Wrap the adapter, not the use case: `new RetryingUserRepository(new PostgresUserRepository(...), { attempts: 3, backoff: ... })`.
2. The wrapper is itself an adapter implementing the same output port.
3. Only retry when the operation is idempotent (§4.4) or guarded by an idempotency key.
4. Add the wrapper to the contract test if its behavior diverges meaningfully from the inner adapter (e.g., it should still satisfy round-trip identity even with retries).

### 8.20 Add a feature flag

1. Add a `FeatureFlags` output port if one doesn't exist.
2. Read the flag in the composition root (to choose between adapters / decorator stacks) or inside a small decorator (to choose between behaviors per call).
3. **Never** read flags inside a use case directly — flags are wiring, not business logic.
4. Plan for flag removal at flag creation — every flag has a retirement criterion.

---

## 9. Forbidden patterns (PR will be rejected)

### Layer boundaries

- ❌ `import` of `#infrastructure/*` from `#application/*` or `#domain/*`.
- ❌ `import` of `#presentation/*` from anywhere except a composition root.
- ❌ `import` of a use-case **class** from `#presentation/*` (depend on the input port instead).
- ❌ `import` of a domain entity / VO from `#presentation/*` (DTOs only; `DomainError` is the sole exception).
- ❌ A "shared utils" bag of mixed-layer code. Every helper belongs to exactly one layer.
- ❌ Cross-bounded-context import (`domain/billing/*` from `domain/user/*` or vice versa) — see §6.5.
- ❌ A cycle between bounded contexts (ADP — §1.3).
- ❌ Barrel files (`index.ts` re-exports). Import from the source file (§7.1).
- ❌ A DI/IoC container library wiring concrete classes outside the composition root.

### Domain modeling

- ❌ A `public` constructor on an entity or value object (use a static factory).
- ❌ A non-`readonly` field on an entity or value object.
- ❌ A setter or mutating method that bypasses the entity's invariant checks.
- ❌ Equality of value objects via `===` instead of `.equals()`.
- ❌ Reaching into a non-root entity of an aggregate from outside the aggregate.
- ❌ An anemic entity: a class with only `readonly` fields and no behavior, where every state change happens in a use case via `User.create({...oldUser, status: "X"})`.
- ❌ Returning a mutable inner-entity reference from an aggregate root.
- ❌ Re-running creation invariants inside `reconstruct()` (§3.1).
- ❌ A repository / use case that touches more than one aggregate transactionally (§3.7).
- ❌ An aggregate holding a direct reference to another aggregate (hold an id — Vernon Rule 3).
- ❌ A domain service that depends on an output port (§3.4).
- ❌ A domain event whose name is present-tense (`OrderCancelling`) or imperative (`CancelOrder`). Events are past-tense facts (§3.6).
- ❌ An aggregate publishing a domain event directly. The use case dispatches buffered events (§3.6).
- ❌ Side-effecting code inside a VO method (Evans's side-effect-free functions — §3.9).

### Application

- ❌ A use case returning a domain entity or value object.
- ❌ A use case holding state across calls (no mutable instance fields).
- ❌ A use case named after a noun (`UserService`) rather than an imperative (`CreateUser`).
- ❌ A query use case (`Get…` / `List…` / `Find…` / `Count…`) that mutates state.
- ❌ Direct `new Date()`, `randomUUID()`, `fetch(...)`, `fs.*`, `console.*` inside a use case or domain object.
- ❌ Service-locator or global registry lookup of dependencies inside a use case (constructor injection only).
- ❌ `Result<T, E>` / `Either` return types from use cases (we throw `DomainError`).
- ❌ A DTO containing a `Date`, `Map`, `Set`, `BigInt`, class instance, or VO field.
- ❌ A non-`readonly` field on a DTO, or a method on a DTO.
- ❌ Renaming or removing a published DTO field without a deprecation cycle.
- ❌ A mapper that performs I/O, calls `new Date()` / `randomUUID()`, or returns `undefined` to mean "couldn't map".
- ❌ Inlining cross-cutting concerns (logging, tracing, auth, transactions, retries, caching) inside a use case instead of a decorator (§4.5).
- ❌ A command that is not idempotent and provides no idempotency key (§4.4).
- ❌ A use case that reads a feature flag directly to choose between behaviors (§6.9). Flags are wiring.
- ❌ A use case that reads `process.env` (§2.5).
- ❌ Mixing return-DTO and Output Boundary styles within the same use case (§4.8).

### Configuration

- ❌ Reading `process.env` from anywhere other than `src/config.ts`.
- ❌ A secret, password, or API key checked into source, fixtures, or `.env.example`.
- ❌ Logging a secret-bearing field anywhere (use cases, mappers, error handlers, route logs).

### Infrastructure

- ❌ A repository method named in tech-speak (`runQuery`, `selectAll`).
- ❌ A repository that returns a persistence-shaped record (always return entities).
- ❌ Letting a persistence record type escape the `infrastructure/persistence/` directory (no imports from `application/`, `domain/`, or `presentation/`).
- ❌ Adding a new output port without a paired in-memory adapter.
- ❌ Adapter logging via `console.*` directly when a `Logger` port exists in the codebase.
- ❌ A repository read method that returns an unbounded list on a production-scale dataset, with no paginated alternative.
- ❌ A `save` that silently overwrites a stale version when the aggregate carries a `version` field (§3.7).
- ❌ A naked outbound network call without timeout, retry, or circuit-breaker policy (§6.8).
- ❌ Mixing two technologies in one adapter file (§2.3 — one port per file, one technology per file).

### Presentation

- ❌ Business logic in an HTTP route, CLI command, or repository.
- ❌ `if`/`switch` on `error.constructor.name` — match on `error instanceof DomainError` and dispatch on `error.code`.
- ❌ Renaming or removing a `DomainError` `code` (only new codes may be added).
- ❌ A presentation file importing a use-case **class** instead of its input port.
- ❌ A presentation file importing a domain entity or VO for response shaping (DTOs only).
- ❌ Trusting a transport-level claim (e.g., a JWT) without verifying it via an auth adapter (§6.4).

### Composition root

- ❌ `new <ConcreteAdapter>(...)` outside `src/<delivery>.ts`.
- ❌ Business logic in a composition root (§2.5).
- ❌ A separate "DI container" module that other layers import.
- ❌ `if (process.env.X)` switches in the composition root that go beyond what `loadConfig()` returned.

### Testing

- ❌ A `domain/` test that imports infrastructure or boots a server (§10.1).
- ❌ A test calling itself a "Mock" when it's actually a Fake/Stub (Meszaros — §0).
- ❌ A test that relies on real time (`new Date()`) or real randomness inside the unit under test — inject port doubles.
- ❌ A test that doesn't isolate state between cases (shared module-level mutable state across `it` blocks).
- ❌ A presentation-layer test importing a real use-case class (mock the input port).
- ❌ Adding a second adapter for an existing output port without extending the contract test (§10.4).

---

## 10. Testing rules

### 10.1 Layer-specific test strategies

- **Domain tests** — pure, synchronous, no doubles. Test VO validation, entity invariants, domain service algorithms.
- **Application (use case) tests** — drive the use case through its input port; substitute output ports with the in-memory adapter and hand-rolled `Clock` / `IdGenerator`. Assertions are on the returned DTO (or the calls captured by an Output Boundary spy).
- **Infrastructure tests** — integration tests against the real adapter where feasible (real fs, real DB in a container). Plus the contract test (§10.4).
- **Presentation tests** — drive the route/command with a fake use case implementing the input port. Assertions are on the transport (HTTP status, CLI stdout/exit code).
- **Architecture tests** (§10.5) — automated checks that the dependency rule and other invariants hold.

### 10.2 The test pyramid

Many fast, isolated **domain + application** tests at the base. Fewer **infrastructure** integration tests in the middle. A small handful of **end-to-end** tests at the top (driving the composition root). The pyramid bends to a "test trophy" if integration tests give better confidence-per-second than units do — but never invert it. A codebase whose only safety net is end-to-end tests is brittle and slow.

### 10.3 Conventions

- Tests live in `tests/` mirroring `src/` exactly.
- Test files end in `.test.ts` and are named after the unit under test (`create-user.test.ts`).
- Use `describe(SubjectName, …)` + `it("does something when …")` — one `it` per behavior.
- **AAA / Given-When-Then** structure inside each `it`. A blank line separates Arrange from Act and Act from Assert. If you can't tell the three apart at a glance, the test is doing too much.
- Tests may import domain entities to construct fixtures — that's fine, tests are outer-layer.
- Tests **must not** import a use-case class to satisfy a presentation-layer test; mock the input port.
- **Domain tests must not import infrastructure.** A failing `domain/` test should never require Postgres, fs, or a clock. If you reach for an adapter to test a domain rule, the test is in the wrong layer.
- **Test Data Builders.** Construct fixtures via builders (`aUser().withEmail("…").build()`) rather than ad-hoc literals scattered across tests. Builders live in `tests/<context>/builders/<noun>-builder.ts` and call the entity's `static create` (or `reconstruct` for hydration scenarios). When invariants change, you fix one builder, not fifty tests.
- **Deterministic.** No `new Date()` or `Math.random()` inside the unit under test — pass port doubles. A test that fails at midnight is a bug in the test, not the code.
- **Isolated.** No shared mutable state between `it` blocks. Each test constructs its own fixtures. A test that requires a sibling test to have run first is broken.
- **Use the right Test Double name** (Meszaros — §0). `mockUserRepository = new InMemoryUserRepository()` is wrong — that's a Fake.
- **Property-based tests** are appropriate for VOs with rich invariants (e.g., `Money.add` is associative + commutative; round-trip serialization). Use sparingly — they're slow and hard to debug. Don't reach for them when a few example tests would do.
- **Snapshot tests** are forbidden in domain/application code. They're tolerable in presentation for rendered output if they're small and reviewed, but they encode "what is" rather than "what should be" — easy to commit a regression as the new truth.

### 10.4 Contract tests for adapters

When more than one adapter implements the same output port, share a behavior suite that all adapters must satisfy. Place it at `tests/infrastructure/<concern>/<port>-contract.ts` exporting a `runContract(makeRepo: () => Repo)` function; each adapter's test file calls it with its own factory.

The contract suite covers, at minimum:

- **Round-trip identity.** Save an entity, load it, and assert structural equality (id, all VOs, all timestamps).
- **Upsert semantics.** Save an entity with id `X`, then save a _different_ entity with the same id — load returns the second one, not a duplicate.
- **Absence.** `findById` / `findByEmail` for a non-existent value returns `undefined`, never throws.
- **Independence between instances.** Two repository instances built by `makeRepo()` do not share state (or, if they intentionally do — e.g., backed by the same DB — the test asserts and documents that).
- **Optimistic concurrency** (if the aggregate has a `version` field): saving a stale version throws `ConcurrencyError`.
- **Pagination contract** (if the repository exposes one): `limit` is honored, `nextCursor` is `undefined` on the last page, an unknown cursor throws.
- **Multi-tenant isolation** (if the repository is tenant-scoped — §6.9): an entity saved under tenant A is not visible under tenant B.

This guarantees substitutability (LSP) at runtime, not just at the type level.

### 10.5 Architectural fitness function tests

Architecture rules that can be checked statically must be checked statically. Add tests in `tests/architecture/` that fail when:

- An `application/*` file imports from `infrastructure/*`.
- A `domain/*` file imports from `application/*`, `infrastructure/*`, or `presentation/*`.
- A `presentation/*` file imports a use-case class (vs. its input port).
- A bounded context (`domain/<a>/`) imports from another bounded context (`domain/<b>/`).
- Any file outside a composition root contains `new <ConcreteAdapter>(`.
- A `tests/domain/*` file imports from `infrastructure/*`.

Implement with a directory walk + import parse, or a tool like `dependency-cruiser` or `eslint-plugin-import` with custom rules. The exact tool is a detail; the rules above are not.

---

## 11. Verification

Before declaring a change complete:

```bash
npm run lint                   # XO + Prettier
npm test -- --run              # Vitest, including architecture tests
npm start -- list-users        # CLI smoke
PORT=3000 npm run serve        # HTTP smoke (separately)
```

When in doubt about a boundary, re-read §1. If you still have doubt, write an architecture test (§10.5) that fails when the boundary is crossed.

---

## 12. Architecture Decision Records

When this contract changes, the change is recorded in `docs/adr/<NNNN>-<slug>.md` using the standard ADR format:

- **Status** — proposed / accepted / superseded by ADR-XXXX
- **Context** — what forced the change
- **Decision** — what we agreed to
- **Consequences** — what becomes easier and what becomes harder

ADRs are append-only. A reversal is a new ADR that supersedes the old; the old stays in the file. AGENTS.md is updated to match the latest accepted ADRs — the ADR is the _why_, AGENTS.md is the _what_.

Use an ADR for anything that:

- Adds, removes, or changes a layer / port convention.
- Adopts an out-of-scope pattern (CQRS, event sourcing, sagas, specifications, UoW, shared kernel).
- Changes a context-map relationship (§6.5).
- Introduces a new cross-cutting concern (caching, multi-tenancy, audit, …).

Don't write an ADR for a single bug fix or a normal feature — only for decisions that future contributors need the _reasoning_ behind to revisit.

---

## 13. Reading list

The vocabulary in this document is borrowed; the rules are enforced. If a concept here is unfamiliar, the canonical sources are:

- Robert C. Martin, _Clean Architecture_ (2017) — the dependency rule, SOLID, component principles, boundary anatomy, humble object.
- Eric Evans, _Domain-Driven Design_ (2003) — entities, VOs, aggregates, repositories, domain services, ubiquitous language, bounded context, context map, supple design.
- Vaughn Vernon, _Implementing Domain-Driven Design_ (2013) — the four aggregate design rules, modern tactical patterns, integration patterns.
- Alistair Cockburn, _Hexagonal Architecture_ (2005, paper) — ports and adapters, driving vs driven sides.
- Jeffrey Palermo, _The Onion Architecture_ (2008, blog series) — concentric layering with domain at the center.
- Gerard Meszaros, _xUnit Test Patterns_ (2007) — the test double taxonomy.
- Neal Ford / Rebecca Parsons / Patrick Kua, _Building Evolutionary Architectures_ (2017) — architectural fitness functions.
- Sam Newman, _Building Microservices_ (2nd ed., 2021) — strangler fig, branch by abstraction, integration patterns at scale.

When this document and a source disagree, **this document wins** for code in this repository. Open an ADR (§12) to change it.
