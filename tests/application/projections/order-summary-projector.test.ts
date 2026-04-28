import { describe, expect, it } from "vitest";
import { OrderSummaryProjector } from "#application/projections/order-summary-projector.js";
import { orderCancelled } from "#domain/order/events/order-cancelled.js";
import { orderConfirmed } from "#domain/order/events/order-confirmed.js";
import { orderPlaced } from "#domain/order/events/order-placed.js";
import { InMemoryLogger } from "#infrastructure/logging/in-memory-logger.js";
import { InMemoryOrderSummaryReadModel } from "#infrastructure/persistence/in-memory-order-summary-read-model.js";
import { CapturingEventPublisher } from "#tests/support/fakes.js";

function setup() {
	const events = new CapturingEventPublisher();
	const projection = new InMemoryOrderSummaryReadModel();
	new OrderSummaryProjector(events, projection, new InMemoryLogger()).start();
	return { events, projection };
}

describe("OrderSummaryProjector", () => {
	it("upserts a summary on OrderPlaced", async () => {
		const { events, projection } = setup();

		await events.publish(
			orderPlaced({
				aggregateId: "o-1",
				customerId: "user-1",
				totalAmount: 19.98,
				currency: "USD",
				itemCount: 2,
				occurredAt: new Date("2026-01-01T00:00:00Z"),
			}),
		);

		const summary = await projection.findById("o-1");
		expect(summary).toMatchObject({
			id: "o-1",
			customerId: "user-1",
			status: "placed",
			totalAmount: 19.98,
			currency: "USD",
			itemCount: 2,
		});
	});

	it("transitions to 'confirmed' on OrderConfirmed", async () => {
		const { events, projection } = setup();
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
		await events.publish(
			orderConfirmed({
				aggregateId: "o-1",
				reservationId: "res-1",
				occurredAt: new Date("2026-01-01T00:00:05Z"),
			}),
		);

		const summary = await projection.findById("o-1");
		expect(summary?.status).toBe("confirmed");
		expect(summary?.lastActivityAt).toBe("2026-01-01T00:00:05.000Z");
	});

	it("transitions to 'cancelled' on OrderCancelled", async () => {
		const { events, projection } = setup();
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
		await events.publish(
			orderCancelled({
				aggregateId: "o-1",
				reason: "user_request",
				occurredAt: new Date("2026-01-01T00:00:10Z"),
			}),
		);

		const summary = await projection.findById("o-1");
		expect(summary?.status).toBe("cancelled");
	});

	it("lists summaries for a customer in placed-at order", async () => {
		const { events, projection } = setup();
		await events.publish(
			orderPlaced({
				aggregateId: "o-2",
				customerId: "user-1",
				totalAmount: 5,
				currency: "USD",
				itemCount: 1,
				occurredAt: new Date("2026-01-02T00:00:00Z"),
			}),
		);
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

		const page = await projection.listByCustomer("user-1", { limit: 10 });
		expect(page.items.map((i) => i.id)).toStrictEqual(["o-1", "o-2"]);
	});

	it("is idempotent: replaying OrderPlaced overwrites with the same value", async () => {
		const { events, projection } = setup();
		const event = orderPlaced({
			aggregateId: "o-1",
			customerId: "user-1",
			totalAmount: 10,
			currency: "USD",
			itemCount: 1,
			occurredAt: new Date("2026-01-01T00:00:00Z"),
		});
		await events.publish(event);
		await events.publish(event);
		const page = await projection.listByCustomer("user-1", { limit: 10 });
		expect(page.items).toHaveLength(1);
	});
});
