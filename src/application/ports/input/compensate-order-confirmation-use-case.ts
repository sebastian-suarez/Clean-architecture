import { type OrderDto } from "#application/dtos/order-dto.js";

export type CompensateOrderConfirmationInput = {
	readonly orderId: string;
	readonly reason: string;
};

// Saga-only entry point (§6.6). Distinct from `CancelOrder` (which
// enforces principal authorization, §6.4) — compensation is a system
// action, so the auth check would always reject. Naming it as its own
// use case makes the compensation explicit instead of hiding inside
// a try/catch in the saga (§6.6: "compensating actions for partial
// failures are explicit use cases, not buried try/catch cleanup").
export type CompensateOrderConfirmationUseCase = {
	execute(input: CompensateOrderConfirmationInput): Promise<OrderDto>;
};
