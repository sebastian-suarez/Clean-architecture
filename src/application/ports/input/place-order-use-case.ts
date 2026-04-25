import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { type Principal } from "#application/security/principal.js";

export type PlaceOrderItemInput = {
	readonly sku: string;
	readonly quantity: number;
	readonly unitPrice: number;
	readonly currency: string;
};

export type PlaceOrderInput = {
	readonly principal: Principal;
	readonly customerId: string;
	readonly items: readonly PlaceOrderItemInput[];
	// §4.4 — required because PlaceOrder is not naturally idempotent.
	readonly idempotencyKey: string;
};

// Output Boundary (§4.8) — this use case does not return a DTO; it
// writes outcomes into PlaceOrderOutput. Demonstrates the inverted
// pattern.
export type PlaceOrderUseCase = {
	execute(input: PlaceOrderInput, output: PlaceOrderOutput): Promise<void>;
};
