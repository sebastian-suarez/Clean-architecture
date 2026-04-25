import { beforeEach, describe, expect, it } from "vitest";
import { OrderFactory } from "#application/factories/order-factory.js";
import { type CustomerLookup } from "#application/ports/output/customer-lookup.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { PlaceOrder } from "#application/use-cases/place-order.js";
import { InMemoryOrderRepository } from "#infrastructure/persistence/in-memory-order-repository.js";
import { InMemoryUnitOfWork } from "#infrastructure/transaction/in-memory-unit-of-work.js";
import {
	CapturingEventPublisher,
	FixedClock,
	SequentialIdGenerator,
} from "#tests/support/fakes.js";

class FakeCustomerLookup implements CustomerLookup {
	constructor(
		private readonly known: Record<
			string,
			{ id: string; displayName: string; status: "active" | "deactivated" }
		>,
	) {}

	async find(id: string) {
		return this.known[id];
	}
}

function makeOutputSpy() {
	const calls: Array<{ method: string; arg: unknown }> = [];
	const spy: PlaceOrderOutput = {
		placed(order) {
			calls.push({ method: "placed", arg: order });
		},
		customerNotFound(customerId) {
			calls.push({ method: "customerNotFound", arg: customerId });
		},
		customerInactive(customerId) {
			calls.push({ method: "customerInactive", arg: customerId });
		},
	};

	return { spy, calls };
}

describe("PlaceOrder", () => {
	let useCase: PlaceOrder;
	let events: CapturingEventPublisher;
	let orders: InMemoryOrderRepository;

	beforeEach(() => {
		orders = new InMemoryOrderRepository();
		events = new CapturingEventPublisher();
		const ids = new SequentialIdGenerator("order");
		const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
		const customers = new FakeCustomerLookup({
			"user-1": { id: "user-1", displayName: "Alice", status: "active" },
			"user-2": { id: "user-2", displayName: "Bob", status: "deactivated" },
		});

		useCase = new PlaceOrder(
			orders,
			customers,
			new OrderFactory(ids, clock),
			events,
			new InMemoryUnitOfWork(),
		);
	});

	it("places the order and writes to PlaceOrderOutput.placed", async () => {
		const { spy, calls } = makeOutputSpy();
		await useCase.execute(
			{
				principal: { id: "user-1", roles: ["customer"] },
				customerId: "user-1",
				items: [
					{ sku: "BOOK-1", quantity: 2, unitPrice: 9.99, currency: "USD" },
				],
				idempotencyKey: "key-1",
			},
			spy,
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.method).toBe("placed");
		expect(events.published.map((e) => e.name)).toStrictEqual(["OrderPlaced"]);
	});

	it("calls customerNotFound when the customer doesn't exist", async () => {
		const { spy, calls } = makeOutputSpy();
		await useCase.execute(
			{
				principal: { id: "user-x", roles: ["customer"] },
				customerId: "user-x",
				items: [
					{ sku: "BOOK-1", quantity: 2, unitPrice: 9.99, currency: "USD" },
				],
				idempotencyKey: "key-2",
			},
			spy,
		);

		expect(calls).toStrictEqual([
			{ method: "customerNotFound", arg: "user-x" },
		]);
		expect(events.published).toHaveLength(0);
	});

	it("calls customerInactive when the customer is deactivated", async () => {
		const { spy, calls } = makeOutputSpy();
		await useCase.execute(
			{
				principal: { id: "user-2", roles: ["customer"] },
				customerId: "user-2",
				items: [
					{ sku: "BOOK-1", quantity: 2, unitPrice: 9.99, currency: "USD" },
				],
				idempotencyKey: "key-3",
			},
			spy,
		);

		expect(calls).toStrictEqual([
			{ method: "customerInactive", arg: "user-2" },
		]);
	});
});
