import { describe, expect, it, vi } from "vitest";
import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { AuthorizedPlaceOrder } from "#application/use-cases/authorized-place-order.js";
import { ForbiddenError } from "#domain/shared/forbidden-error.js";

const baseInput: PlaceOrderInput = {
	principal: { id: "user-1", roles: ["customer"] },
	customerId: "user-1",
	items: [{ sku: "X", quantity: 1, unitPrice: 1, currency: "USD" }],
	idempotencyKey: "k1",
};

const noopOutput = {
	placed() {},
	customerNotFound() {},
	customerInactive() {},
};

describe("AuthorizedPlaceOrder", () => {
	it("delegates when the principal is a customer placing for themselves", async () => {
		const inner = vi.fn(async () => undefined);
		const useCase: PlaceOrderUseCase = { execute: inner };
		await new AuthorizedPlaceOrder(useCase).execute(baseInput, noopOutput);
		expect(inner).toHaveBeenCalledTimes(1);
	});

	it("throws ForbiddenError when the principal lacks the customer role", async () => {
		const inner = vi.fn();
		const useCase: PlaceOrderUseCase = { execute: inner };
		await expect(
			new AuthorizedPlaceOrder(useCase).execute(
				{ ...baseInput, principal: { id: "user-1", roles: [] } },
				noopOutput,
			),
		).rejects.toBeInstanceOf(ForbiddenError);
		expect(inner).not.toHaveBeenCalled();
	});

	it("rejects placing an order on behalf of another customer (without admin)", async () => {
		const inner = vi.fn();
		const useCase: PlaceOrderUseCase = { execute: inner };
		await expect(
			new AuthorizedPlaceOrder(useCase).execute(
				{
					...baseInput,
					principal: { id: "user-1", roles: ["customer"] },
					customerId: "user-2",
				},
				noopOutput,
			),
		).rejects.toBeInstanceOf(ForbiddenError);
		expect(inner).not.toHaveBeenCalled();
	});

	it("allows admins to place orders for any customer", async () => {
		const inner = vi.fn(async () => undefined);
		const useCase: PlaceOrderUseCase = { execute: inner };
		await new AuthorizedPlaceOrder(useCase).execute(
			{
				...baseInput,
				principal: { id: "admin-1", roles: ["admin", "customer"] },
				customerId: "user-2",
			},
			noopOutput,
		);
		expect(inner).toHaveBeenCalledTimes(1);
	});
});
