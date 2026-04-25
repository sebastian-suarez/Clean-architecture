# AGENTS.md — Clean Architecture Compliance Contract

This file is a **hard contract** for any contributor (human or AI) working in this repository. The architecture is the product. If a change violates the rules below, it is wrong, regardless of how convenient it is.

The rules here are derived from Robert C. Martin's _Clean Architecture_ and the Hexagonal / Ports & Adapters pattern.

---

## 1. Layers and dependency direction

```
presentation ──┐                ┌── infrastructure
               ▼                ▼
              application ───► domain
```

| Layer            | Path                            | May import from                                                | Must NOT import from                                     |
| ---------------- | ------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| `domain`         | `src/domain/`                   | itself, Node std-lib (rare), TS only                           | application, infrastructure, presentation, any framework |
| `application`    | `src/application/`              | `domain`, itself, TS only                                      | infrastructure, presentation, any framework              |
| `infrastructure` | `src/infrastructure/`           | `domain`, `application`, Node std-lib, framework SDKs          | presentation                                             |
| `presentation`   | `src/presentation/`             | `domain` (only error contracts), `application`, framework SDKs | infrastructure (use the composition root instead)        |
| composition root | `src/index.ts`, `src/server.ts` | every layer                                                    | n/a — this is the only place wiring happens              |

**The dependency rule:** source-code dependencies point inward. Outer layers know about inner layers; inner layers know nothing about outer layers. **No exceptions.**

If you feel an inner layer needs something from an outer layer, that's the signal to define a **port** (interface) in the inner layer and have the outer layer **implement** it (Dependency Inversion).

---

## 2. Layer responsibilities

### 2.1 Domain (`src/domain/`)

Enterprise business rules. Pure TypeScript. Zero I/O, zero framework, zero `Date.now()` / `Math.random()` / `process.env`.

Lives here:

- **Entities** — objects with identity (`User`).
- **Value objects** — immutable, compared by value, self-validating (`Email`).
- **Domain errors** — extend `DomainError`; expose a stable `code` string.
- **Domain services** — only when behavior involves multiple entities and doesn't belong on either.

Forbidden:

- `import` from `#application/*`, `#infrastructure/*`, `#presentation/*`.
- Any third-party package import (`hono`, `vitest`, framework SDKs, etc.).
- Mutable global state.
- Direct calls to `Date`, `crypto.randomUUID`, `fetch`, `fs`, `process` (use a port, injected).

### 2.2 Application (`src/application/`)

Use-case orchestration. Knows the domain; defines what the system does.

Lives here:

- **Use cases** (`use-cases/`) — one class per business operation. Implements an input port. Returns a DTO.
- **Input ports** (`ports/input/`) — TypeScript types describing what each use case accepts and returns. Presentation depends on these.
- **Output ports** (`ports/output/`) — TypeScript types describing the side-effects a use case needs (repositories, clocks, id generators, …). Infrastructure implements these.
- **DTOs** (`dtos/`) — plain data shapes that cross outward boundaries. Primitive fields only (`string`, `number`, `boolean`, ISO-8601 strings — **never `Date`, `Email`, or any domain object**).
- **Mappers** (`mappers/`) — functions that turn a domain entity into a DTO.

Forbidden:

- `import` from `#infrastructure/*`, `#presentation/*`.
- Returning a domain entity from a use case (always map to a DTO).
- Calling `Date`, `crypto`, `fs`, `fetch`, `process` directly — inject a port.
- Importing any framework (`hono`, an ORM, etc.).

### 2.3 Infrastructure (`src/infrastructure/`)

Adapters. Implements **output ports** with concrete technology (DB, fs, HTTP clients, queues, clocks, id generators).

Rules:

- Every class here `implements` an output port from `#application/ports/output/*`.
- File names should reflect the technology: `json-file-user-repository.ts`, `postgres-user-repository.ts`, `redis-cache.ts`.
- Persistence adapters must use a **mapper** to translate between the persistence record type (private to the adapter) and the domain entity. Do not let persistence-shaped types leak out.
- One folder per concern (`persistence/`, `clock/`, `id/`, `http-clients/`, …).

Forbidden:

- `import` from `#presentation/*`.
- Implementing more than one port per file (split adapters).
- Letting persistence record types escape this layer.

### 2.4 Presentation (`src/presentation/`)

Delivery mechanisms. Translates a transport (CLI argv, HTTP request, message-queue payload) into an input-port call, and a DTO / domain error back into a transport response.

Rules:

- Depend on **input ports** (`#application/ports/input/*`), never on use-case **classes**.
- Consume **DTOs** in responses; do not import domain entities or value objects for data.
- May import `DomainError` from `#domain/shared/domain-error.js` to translate `code` → status / exit code. This is the only domain symbol presentation may use.
- One folder per delivery mechanism (`cli/`, `http/`, `queue/`, …). Adding a new one must not require any change in `application/` or `domain/`.

Forbidden:

- Calling `infrastructure/` directly. The composition root injects use cases.
- Containing business rules. If a check is interesting, it belongs in a use case or the domain.

### 2.5 Composition root (`src/index.ts`, `src/server.ts`)

The **only** place where concrete classes are instantiated and wired together. Each delivery mechanism gets its own composition root file at `src/`.

Rules:

- Reads configuration (`process.env`, argv) and constructs adapters → use cases → presentation.
- `process.exit` and other "edge of world" calls live here, not deeper.
- Adding a new delivery mechanism = new file at `src/<name>.ts` + new npm script.

---

## 3. Naming and file conventions

| Concept            | File suffix / pattern                       | Example                                                   |
| ------------------ | ------------------------------------------- | --------------------------------------------------------- |
| Entity             | `<name>.ts`                                 | `domain/user/user.ts`                                     |
| Value object       | `<name>.ts`                                 | `domain/user/email.ts`                                    |
| Domain error       | grouped in `errors.ts` per aggregate        | `domain/user/errors.ts`                                   |
| Use case           | `<verb>-<noun>.ts`                          | `application/use-cases/create-user.ts`                    |
| Input port         | `<verb>-<noun>-use-case.ts`                 | `application/ports/input/create-user-use-case.ts`         |
| Output port        | `<noun>.ts`                                 | `application/ports/output/user-repository.ts`             |
| DTO                | `<noun>-dto.ts`                             | `application/dtos/user-dto.ts`                            |
| Mapper             | `<noun>-mapper.ts` (camelCase const export) | `application/mappers/user-mapper.ts`                      |
| Adapter            | `<tech>-<port>.ts`                          | `infrastructure/persistence/json-file-user-repository.ts` |
| Persistence record | `<noun>-record.ts`                          | `infrastructure/persistence/user-record.ts`               |
| HTTP route file    | grouped per resource                        | `presentation/http/routes/users.ts`                       |
| CLI command        | `<verb>-<noun>.ts`                          | `presentation/cli/commands/create-user.ts`                |

Other conventions:

- Use `.js` import specifiers in TS sources (Node ESM resolution).
- Use the `#layer/*` aliases — never `../../../`.
- Use `kebab-case` filenames; `PascalCase` classes; `camelCase` consts and functions.
- Use **tabs** for indentation (matches XO/Prettier config).

---

## 4. How to add things (recipes)

### 4.1 Add a new use case to an existing aggregate

1. **Define the input port** at `src/application/ports/input/<verb>-<noun>-use-case.ts`.
2. **Implement the use case** at `src/application/use-cases/<verb>-<noun>.ts` — `implements` the input port, returns a DTO.
3. **Wire it** in every composition root that should expose it (`src/index.ts`, `src/server.ts`).
4. **Add a presentation entrypoint** (CLI command and/or HTTP route) that depends on the input port.
5. **Test**: unit-test the use case with `InMemoryUserRepository` and hand-rolled port doubles.

### 4.2 Add a new entity / aggregate

1. Create `src/domain/<aggregate>/` with the entity, value objects, and `errors.ts`.
2. Define an output port `src/application/ports/output/<aggregate>-repository.ts`.
3. Add at least one infrastructure adapter (`InMemory…` is the minimum).
4. Add a DTO and a mapper.
5. Add use cases as in 4.1.

### 4.3 Add a new infrastructure adapter (e.g. Postgres)

1. Implement the relevant output port in `src/infrastructure/<concern>/<tech>-<port>.ts`.
2. If persistence: define a private record type + mapper.
3. Swap it in at the composition root. The application and domain layers do not change.

### 4.4 Add a new delivery mechanism

1. Add `src/presentation/<mechanism>/…` depending only on input ports + DTOs + (optional) `DomainError`.
2. Add a new composition root `src/<mechanism>.ts` that wires adapters → use cases → mechanism.
3. Add an npm script.

---

## 5. Forbidden patterns (PR will be rejected)

- ❌ `import` of `#infrastructure/*` from `#application/*` or `#domain/*`.
- ❌ `import` of `#presentation/*` from anywhere except a composition root.
- ❌ `import` of a use-case **class** from `#presentation/*` (depend on the input port instead).
- ❌ A use case returning a domain entity or value object.
- ❌ Direct `new Date()`, `randomUUID()`, `fetch(...)`, `fs.*`, `process.env` inside a use case or domain object.
- ❌ Business logic in an HTTP route, CLI command, or repository.
- ❌ A repository that returns a persistence-shaped record (always return entities).
- ❌ `if`/`switch` on `error.constructor.name` — match on `error instanceof DomainError` and dispatch on `error.code`.
- ❌ A "shared utils" bag of mixed-layer code. Every helper belongs to exactly one layer.

---

## 6. Testing rules

- **Domain tests**: pure, synchronous, no doubles needed.
- **Application tests**: drive the use case via its input port; substitute output ports with `InMemoryUserRepository` and hand-rolled `Clock` / `IdGenerator`.
- **Infrastructure tests**: integration tests against the real adapter where feasible (real fs, real DB in a container).
- **Presentation tests**: drive the route/command with a fake use case implementing the input port.
- Tests may import domain entities to construct test fixtures — that's fine, tests are outer-layer.
- Tests must **not** import a use-case class to satisfy a presentation-layer test; mock the input port.

---

## 7. Verification

Before declaring a change complete:

```bash
npm run lint
npm test -- --run
npm start -- list-users        # CLI smoke
PORT=3000 npm run serve        # HTTP smoke (separately)
```

When in doubt about a boundary, re-read §1. If you still have doubt, write a test that fails when the boundary is crossed.
