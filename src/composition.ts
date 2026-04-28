import { type UserDto } from "#application/dtos/user-dto.js";
import { OrderFactory } from "#application/factories/order-factory.js";
import { type CancelOrderUseCase } from "#application/ports/input/cancel-order-use-case.js";
import { type CreateUserUseCase } from "#application/ports/input/create-user-use-case.js";
import { type DeactivateUserUseCase } from "#application/ports/input/deactivate-user-use-case.js";
import { type GetOrderUseCase } from "#application/ports/input/get-order-use-case.js";
import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";
import { type ListOrderSummariesUseCase } from "#application/ports/input/list-order-summaries-use-case.js";
import { type ListOrdersUseCase } from "#application/ports/input/list-orders-use-case.js";
import { type ListUsersUseCase } from "#application/ports/input/list-users-use-case.js";
import { type PlaceOrderUseCase } from "#application/ports/input/place-order-use-case.js";
import { type RenameUserUseCase } from "#application/ports/input/rename-user-use-case.js";
import { type Logger } from "#application/ports/output/logger.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { OrderSummaryProjector } from "#application/projections/order-summary-projector.js";
import { OrderConfirmationSaga } from "#application/sagas/order-confirmation-saga.js";
import { AuditedPlaceOrder } from "#application/use-cases/audited-place-order.js";
import { AuthorizedPlaceOrder } from "#application/use-cases/authorized-place-order.js";
import { CachedGetUser } from "#application/use-cases/cached-get-user.js";
import { CancelOrder } from "#application/use-cases/cancel-order.js";
import { CompensateOrderConfirmation } from "#application/use-cases/compensate-order-confirmation.js";
import { ConfirmOrder } from "#application/use-cases/confirm-order.js";
import { CreateUser } from "#application/use-cases/create-user.js";
import { DeactivateUser } from "#application/use-cases/deactivate-user.js";
import { GetOrder } from "#application/use-cases/get-order.js";
import { GetUser } from "#application/use-cases/get-user.js";
import { IdempotentPlaceOrder } from "#application/use-cases/idempotent-place-order.js";
import { ListOrderSummaries } from "#application/use-cases/list-order-summaries.js";
import { ListOrders } from "#application/use-cases/list-orders.js";
import { ListUsers } from "#application/use-cases/list-users.js";
import { LoggedCreateUser } from "#application/use-cases/logged-create-user.js";
import { MeteredCreateUser } from "#application/use-cases/metered-create-user.js";
import { PlaceOrder } from "#application/use-cases/place-order.js";
import { RateLimitedCreateUser } from "#application/use-cases/rate-limited-create-user.js";
import { RenameUser } from "#application/use-cases/rename-user.js";
import { RetriedPlaceOrder } from "#application/use-cases/retried-place-order.js";
import { TracedCreateUser } from "#application/use-cases/traced-create-user.js";
import { InMemoryAuditLog } from "#infrastructure/audit/in-memory-audit-log.js";
import { InMemoryCache } from "#infrastructure/cache/in-memory-cache.js";
import { SystemClock } from "#infrastructure/clock/system-clock.js";
import { InProcessCustomerLookup } from "#infrastructure/customer/in-process-customer-lookup.js";
import { EnvFeatureFlags } from "#infrastructure/feature-flags/env-feature-flags.js";
import { CryptoIdGenerator } from "#infrastructure/id/crypto-id-generator.js";
import { InMemoryInventoryReservation } from "#infrastructure/inventory/in-memory-inventory-reservation.js";
import { ConsoleLogger } from "#infrastructure/logging/console-logger.js";
import { InMemoryEventPublisher } from "#infrastructure/messaging/in-memory-event-publisher.js";
import { InMemoryMetrics } from "#infrastructure/metrics/in-memory-metrics.js";
import { CachedUserRepository } from "#infrastructure/persistence/cached-user-repository.js";
import { InMemoryIdempotencyStore } from "#infrastructure/persistence/in-memory-idempotency-store.js";
import { InMemoryOrderProcessRepository } from "#infrastructure/persistence/in-memory-order-process-repository.js";
import { InMemoryOrderSummaryReadModel } from "#infrastructure/persistence/in-memory-order-summary-read-model.js";
import { JsonFileOrderRepository } from "#infrastructure/persistence/json-file-order-repository.js";
import { JsonFileUserRepository } from "#infrastructure/persistence/json-file-user-repository.js";
import { RetryingOrderRepository } from "#infrastructure/persistence/retrying-order-repository.js";
import { InMemoryRateLimiter } from "#infrastructure/rate-limiter/in-memory-rate-limiter.js";
import { InMemoryTracer } from "#infrastructure/tracing/in-memory-tracer.js";
import { InMemoryUnitOfWork } from "#infrastructure/transaction/in-memory-unit-of-work.js";
import { type User } from "#domain/user/user.js";
import { type AppConfig } from "#src/config.js";

const FEATURE_CACHE_USERS = "cache-users";

// Shared composition module (§2.5). Imported ONLY by composition roots
// (src/index.ts, src/server.ts, src/worker.ts) — enforced by an
// architecture test (§10.5). Never re-exposes individual adapters; only
// fully-wired use cases.
export type Composed = {
	readonly logger: Logger;
	readonly createUser: CreateUserUseCase;
	readonly getUser: GetUserUseCase;
	readonly listUsers: ListUsersUseCase;
	readonly renameUser: RenameUserUseCase;
	readonly deactivateUser: DeactivateUserUseCase;
	readonly placeOrder: PlaceOrderUseCase;
	readonly placeOrderForHttp: PlaceOrderUseCase;
	readonly cancelOrder: CancelOrderUseCase;
	readonly getOrder: GetOrderUseCase;
	readonly listOrders: ListOrdersUseCase;
	readonly listOrderSummaries: ListOrderSummariesUseCase;
};

export function compose(config: AppConfig): Composed {
	// --- Driven adapters ----------------------------------------------------
	const baseUserRepo = new JsonFileUserRepository(config.usersDataFile);
	const featureFlags = new EnvFeatureFlags(config.enabledFeatures);

	// Branch by Abstraction (§6.12) — the cache is opt-in via feature flag.
	// Demonstrates picking the adapter at composition time without any
	// inner-layer change.
	const userRepo: UserRepository = featureFlags.isEnabled(FEATURE_CACHE_USERS)
		? new CachedUserRepository(baseUserRepo, new InMemoryCache<User>())
		: baseUserRepo;

	const baseOrderRepo = new JsonFileOrderRepository(config.ordersDataFile);
	const orderRepo = new RetryingOrderRepository(baseOrderRepo, 3);

	const ids = new CryptoIdGenerator();
	const clock = new SystemClock();
	const events = new InMemoryEventPublisher();
	const logger = new ConsoleLogger();
	const tracer = new InMemoryTracer();
	const metrics = new InMemoryMetrics();
	const audit = new InMemoryAuditLog();
	const idempotency = new InMemoryIdempotencyStore();
	const unitOfWork = new InMemoryUnitOfWork();
	const rateLimiter = new InMemoryRateLimiter(
		config.rateLimitPerMinute,
		60_000,
	);
	const customers = new InProcessCustomerLookup(userRepo);
	const responseCache = new InMemoryCache<UserDto>();

	// Saga state + workflow side-effects (§6.6).
	const orderProcesses = new InMemoryOrderProcessRepository();
	const inventory = new InMemoryInventoryReservation(ids, {
		"BOOK-1": 100,
		"BOOK-2": 100,
		"WIDGET-1": 100,
	});

	// Read-side projection store (§4.1, full CQRS). Implements both the
	// read port (consumed by `ListOrderSummaries`) and the writer port
	// (consumed by `OrderSummaryProjector`).
	const orderSummaries = new InMemoryOrderSummaryReadModel();

	// --- Application factory ------------------------------------------------
	const orderFactory = new OrderFactory(ids, clock);

	// --- Bare use cases -----------------------------------------------------
	const createUserBare = new CreateUser(userRepo, ids, clock, events);
	const getUserBare = new GetUser(userRepo);
	const listUsers = new ListUsers(userRepo);
	const renameUser = new RenameUser(userRepo, clock, events);
	const deactivateUser = new DeactivateUser(userRepo, clock, events);

	const placeOrderBare = new PlaceOrder(
		orderRepo,
		customers,
		orderFactory,
		events,
		unitOfWork,
	);
	const cancelOrder = new CancelOrder(orderRepo, clock, events);
	const getOrder = new GetOrder(orderRepo);
	const listOrders = new ListOrders(orderRepo);
	const listOrderSummaries = new ListOrderSummaries(orderSummaries);

	// Saga-only entry points — driven by `OrderConfirmationSaga`, never
	// exposed at any presentation boundary.
	const confirmOrder = new ConfirmOrder(orderRepo, clock, events);
	const compensateOrder = new CompensateOrderConfirmation(
		orderRepo,
		clock,
		events,
	);

	// --- Decorator stacks (order matters — §4.5) ---------------------------
	// CreateUser: RateLimited → Metered → Logged → Traced → Inner
	const createUser = new RateLimitedCreateUser(
		new MeteredCreateUser(
			new LoggedCreateUser(
				new TracedCreateUser(createUserBare, tracer),
				logger,
			),
			metrics,
		),
		rateLimiter,
	);

	// GetUser: Cached → Inner
	const getUser = new CachedGetUser(getUserBare, responseCache);

	// PlaceOrder (shared): Idempotent → Audited → Retried → Inner
	const placeOrderShared = new IdempotentPlaceOrder(
		new AuditedPlaceOrder(
			new RetriedPlaceOrder(placeOrderBare, {
				attempts: 3,
				baseDelayMs: 25,
			}),
			audit,
			clock,
		),
		idempotency,
	);

	// HTTP further wraps with Authorized so anonymous principals fail fast.
	const placeOrderForHttp = new AuthorizedPlaceOrder(placeOrderShared);

	// --- Sagas + projections (subscribe before the system serves traffic) --
	new OrderConfirmationSaga(
		events,
		orderRepo,
		orderProcesses,
		inventory,
		confirmOrder,
		compensateOrder,
		clock,
		ids,
		logger,
	).start();
	new OrderSummaryProjector(events, orderSummaries, logger).start();

	return {
		logger,
		createUser,
		getUser,
		listUsers,
		renameUser,
		deactivateUser,
		placeOrder: placeOrderShared,
		placeOrderForHttp,
		cancelOrder,
		getOrder,
		listOrders,
		listOrderSummaries,
	};
}
