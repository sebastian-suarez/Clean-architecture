import { describe, expect, it, vi } from "vitest";
import { type OrderDto } from "#application/dtos/order-dto.js";
import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { IdempotentPlaceOrder } from "#application/use-cases/idempotent-place-order.js";
import { InMemoryIdempotencyStore } from "#infrastructure/persistence/in-memory-idempotency-store.js";

const sampleOrder: OrderDto = {
	id: "o-1",
	customerId: "user-1",
	placedAt: "2026-01-01T00:00:00.000Z",
	items: [],
	totalAmount: 0,
	currency: "USD",
	status: { kind: "placed" },
	version: 0,
};

const sampleInput: PlaceOrderInput = {
	principal: { id: "user-1", roles: ["customer"] },
	customerId: "user-1",
	items: [{ sku: "X", quantity: 1, unitPrice: 1, currency: "USD" }],
	idempotencyKey: "key-1",
};

describe("IdempotentPlaceOrder", () => {
	it("calls the inner use case once for the same key, replays on subsequent calls", async () => {
		const inner = vi.fn(
			async (_input: PlaceOrderInput, out: PlaceOrderOutput) => {
				out.placed(sampleOrder);
			},
		);
		const useCase: PlaceOrderUseCase = { execute: inner };
		const decorated = new IdempotentPlaceOrder(
			useCase,
			new InMemoryIdempotencyStore(),
		);

		const calls1: string[] = [];
		await decorated.execute(sampleInput, {
			placed(o) {
				calls1.push(`placed:${o.id}`);
			},
			customerNotFound() {},
			customerInactive() {},
		});

		const calls2: string[] = [];
		await decorated.execute(sampleInput, {
			placed(o) {
				calls2.push(`placed:${o.id}`);
			},
			customerNotFound() {},
			customerInactive() {},
		});

		expect(inner).toHaveBeenCalledTimes(1);
		expect(calls1).toStrictEqual(["placed:o-1"]);
		expect(calls2).toStrictEqual(["placed:o-1"]);
	});

	it("replays a cached customerNotFound outcome", async () => {
		const inner: PlaceOrderUseCase = {
			async execute(_input, out) {
				out.customerNotFound("user-x");
			},
		};
		const decorated = new IdempotentPlaceOrder(
			inner,
			new InMemoryIdempotencyStore(),
		);

		const seen: string[] = [];
		await decorated.execute(sampleInput, {
			placed() {},
			customerNotFound(id) {
				seen.push(`first:${id}`);
			},
			customerInactive() {},
		});
		await decorated.execute(sampleInput, {
			placed() {},
			customerNotFound(id) {
				seen.push(`second:${id}`);
			},
			customerInactive() {},
		});

		expect(seen).toStrictEqual(["first:user-x", "second:user-x"]);
	});
});
