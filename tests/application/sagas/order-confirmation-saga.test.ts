import { describe, expect, it } from "vitest";
import { OrderConfirmationSaga } from "#application/sagas/order-confirmation-saga.js";
import { orderPlaced } from "#domain/order/events/order-placed.js";
import { InMemoryLogger } from "#infrastructure/logging/in-memory-logger.js";
import { CapturingEventPublisher } from "#tests/support/fakes.js";

describe("OrderConfirmationSaga", () => {
	it("logs receipt of OrderPlaced events after start()", async () => {
		const logger = new InMemoryLogger();
		const events = new CapturingEventPublisher();
		new OrderConfirmationSaga(events, logger).start();

		await events.publish(
			orderPlaced({
				aggregateId: "o-1",
				customerId: "user-1",
				totalAmount: 10,
				currency: "USD",
				itemCount: 1,
				occurredAt: new Date("2026-01-01T00:00:00Z"),
			}),
		);

		expect(logger.entries).toHaveLength(1);
		expect(logger.entries[0]?.event).toBe("saga.order_confirmation.received");
	});

	it("ignores events of other types", async () => {
		const logger = new InMemoryLogger();
		const events = new CapturingEventPublisher();
		new OrderConfirmationSaga(events, logger).start();

		await events.publish({
			name: "OrderShipped",
			aggregateId: "o-1",
			occurredAt: "2026-01-01T00:00:00Z",
		});

		expect(logger.entries).toHaveLength(0);
	});
});
