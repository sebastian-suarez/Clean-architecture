import { type OrderDto } from "#application/dtos/order-dto.js";

export type ConfirmOrderInput = {
	readonly orderId: string;
	readonly reservationId: string;
};

// Driven only by the saga (§6.6). Not exposed at any presentation
// boundary — confirmation is a system-internal step, not a user
// action.
export type ConfirmOrderUseCase = {
	execute(input: ConfirmOrderInput): Promise<OrderDto>;
};
