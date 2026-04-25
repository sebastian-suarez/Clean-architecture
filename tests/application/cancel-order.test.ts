import { describe, expect, it } from "vitest";
import { CancelOrder } from "#application/use-cases/cancel-order.js";
import { OrderNotFoundError } from "#domain/order/errors.js";
import { ForbiddenError } from "#domain/shared/forbidden-error.js";
import { InMemoryOrderRepository } from "#infrastructure/persistence/in-memory-order-repository.js";
import { anOrder } from "#tests/order/builders/order-builder.js";
import { CapturingEventPublisher, FixedClock } from "#tests/support/fakes.js";

describe("CancelOrder", () => {
	it("cancels the order when the principal is the customer", async () => {
		const repo = new InMemoryOrderRepository();
		await repo.save(
			anOrder().withId("o-1").withCustomerId("user-1").buildNew(),
		);
		const events = new CapturingEventPublisher();

		const dto = await new CancelOrder(
			repo,
			new FixedClock(new Date()),
			events,
		).execute({
			principal: { id: "user-1", roles: ["customer"] },
			id: "o-1",
			reason: "changed mind",
		});

		expect(dto.status.kind).toBe("cancelled");
		expect(events.published.map((e) => e.name)).toContain("OrderCancelled");
	});

	it("allows admins to cancel anyone's order", async () => {
		const repo = new InMemoryOrderRepository();
		await repo.save(
			anOrder().withId("o-1").withCustomerId("user-1").buildNew(),
		);

		const dto = await new CancelOrder(
			repo,
			new FixedClock(new Date()),
			new CapturingEventPublisher(),
		).execute({
			principal: { id: "admin-1", roles: ["admin"] },
			id: "o-1",
			reason: "fraud",
		});

		expect(dto.status.kind).toBe("cancelled");
	});

	it("rejects non-owner non-admin principals", async () => {
		const repo = new InMemoryOrderRepository();
		await repo.save(
			anOrder().withId("o-1").withCustomerId("user-1").buildNew(),
		);
		await expect(
			new CancelOrder(
				repo,
				new FixedClock(new Date()),
				new CapturingEventPublisher(),
			).execute({
				principal: { id: "user-2", roles: ["customer"] },
				id: "o-1",
				reason: "no",
			}),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("throws OrderNotFoundError when the order is missing", async () => {
		const repo = new InMemoryOrderRepository();
		await expect(
			new CancelOrder(
				repo,
				new FixedClock(new Date()),
				new CapturingEventPublisher(),
			).execute({
				principal: { id: "user-1", roles: ["customer"] },
				id: "missing",
				reason: "x",
			}),
		).rejects.toBeInstanceOf(OrderNotFoundError);
	});
});
