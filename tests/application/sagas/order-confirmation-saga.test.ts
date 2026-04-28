import { beforeEach, describe, expect, it } from "vitest";
import { CompensateOrderConfirmation } from "#application/use-cases/compensate-order-confirmation.js";
import { ConfirmOrder } from "#application/use-cases/confirm-order.js";
import { OrderFactory } from "#application/factories/order-factory.js";
import { OrderConfirmationSaga } from "#application/sagas/order-confirmation-saga.js";
import { type InventoryReservation } from "#application/ports/output/inventory-reservation.js";
import { CustomerId } from "#domain/order/customer-id.js";
import { OrderId } from "#domain/order/order-id.js";
import { orderPlaced } from "#domain/order/events/order-placed.js";
import { InMemoryInventoryReservation } from "#infrastructure/inventory/in-memory-inventory-reservation.js";
import { InMemoryLogger } from "#infrastructure/logging/in-memory-logger.js";
import { InMemoryOrderProcessRepository } from "#infrastructure/persistence/in-memory-order-process-repository.js";
import { InMemoryOrderRepository } from "#infrastructure/persistence/in-memory-order-repository.js";
import {
	CapturingEventPublisher,
	FixedClock,
	SequentialIdGenerator,
} from "#tests/support/fakes.js";

function placedEvent(orderId: string, customerId = "user-1") {
	return orderPlaced({
		aggregateId: orderId,
		customerId,
		totalAmount: 19.98,
		currency: "USD",
		itemCount: 2,
		occurredAt: new Date("2026-01-01T00:00:00Z"),
	});
}

describe("OrderConfirmationSaga", () => {
	let events: CapturingEventPublisher;
	let orders: InMemoryOrderRepository;
	let processes: InMemoryOrderProcessRepository;
	let inventory: InventoryReservation;
	let logger: InMemoryLogger;
	let factory: OrderFactory;
	let clock: FixedClock;

	beforeEach(() => {
		events = new CapturingEventPublisher();
		orders = new InMemoryOrderRepository();
		processes = new InMemoryOrderProcessRepository();
		logger = new InMemoryLogger();
		clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
		const ids = new SequentialIdGenerator("res");
		inventory = new InMemoryInventoryReservation(ids, {
			"BOOK-1": 10,
		});
		factory = new OrderFactory(new SequentialIdGenerator("o"), clock);

		new OrderConfirmationSaga(
			events,
			orders,
			processes,
			inventory,
			new ConfirmOrder(orders, clock, events),
			new CompensateOrderConfirmation(orders, clock, events),
			clock,
			new SequentialIdGenerator("proc"),
			logger,
		).start();
	});

	async function placeAndPublish(): Promise<string> {
		const order = factory.build({
			customerId: CustomerId.create("user-1"),
			items: [{ sku: "BOOK-1", quantity: 2, unitPrice: 9.99, currency: "USD" }],
		});
		await orders.save(order);
		await events.publish(placedEvent(order.id.value));
		return order.id.value;
	}

	it("reserves inventory, confirms the order, and stores the saga state", async () => {
		const orderId = await placeAndPublish();

		const stored = await orders.findById(OrderId.create(orderId));
		expect(stored?.status.kind).toBe("confirmed");

		const process = await processes.findByOrderId(OrderId.create(orderId));
		expect(process?.status.kind).toBe("confirmed");

		expect(events.published.map((e) => e.name)).toContain("OrderConfirmed");
	});

	it("compensates by cancelling the order when inventory is unavailable", async () => {
		const order = factory.build({
			customerId: CustomerId.create("user-1"),
			items: [
				{ sku: "OUT-OF-STOCK", quantity: 1, unitPrice: 5, currency: "USD" },
			],
		});
		await orders.save(order);
		await events.publish(placedEvent(order.id.value));

		const stored = await orders.findById(order.id);
		expect(stored?.status.kind).toBe("cancelled");

		const process = await processes.findByOrderId(order.id);
		expect(process?.status.kind).toBe("compensated");

		expect(events.published.map((e) => e.name)).toContain("OrderCancelled");
	});

	it("is idempotent: re-publishing the same OrderPlaced is a no-op", async () => {
		const orderId = await placeAndPublish();
		const before = events.published.length;
		await events.publish(placedEvent(orderId));

		// No additional OrderConfirmed (or any other side-effect events) emitted.
		expect(events.published.length).toBe(before + 1); // +1 = the duplicate input event itself
		const duplicates = logger.entries.filter(
			(e) => e.event === "saga.order_confirmation.duplicate",
		);
		expect(duplicates).toHaveLength(1);
	});
});
