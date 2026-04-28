import { describe, expect, it } from "vitest";
import { ConfirmOrder } from "#application/use-cases/confirm-order.js";
import { OrderNotFoundError } from "#domain/order/errors.js";
import { InMemoryOrderRepository } from "#infrastructure/persistence/in-memory-order-repository.js";
import { anOrder } from "#tests/order/builders/order-builder.js";
import { CapturingEventPublisher, FixedClock } from "#tests/support/fakes.js";

describe("ConfirmOrder", () => {
	it("transitions a placed order to confirmed and publishes OrderConfirmed", async () => {
		const orders = new InMemoryOrderRepository();
		const events = new CapturingEventPublisher();
		const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
		const order = anOrder().withId("o-1").build();
		await orders.save(order);

		const useCase = new ConfirmOrder(orders, clock, events);
		const dto = await useCase.execute({
			orderId: "o-1",
			reservationId: "res-1",
		});

		expect(dto.status).toStrictEqual({
			kind: "confirmed",
			reservationId: "res-1",
			at: "2026-01-01T00:00:00.000Z",
		});
		expect(events.published.map((e) => e.name)).toStrictEqual([
			"OrderConfirmed",
		]);
	});

	it("throws OrderNotFoundError if the order is missing", async () => {
		const useCase = new ConfirmOrder(
			new InMemoryOrderRepository(),
			new FixedClock(new Date()),
			new CapturingEventPublisher(),
		);
		await expect(
			useCase.execute({ orderId: "missing", reservationId: "res-1" }),
		).rejects.toThrow(OrderNotFoundError);
	});
});
