import { type OrderDto } from "#application/dtos/order-dto.js";
import { type Principal } from "#application/security/principal.js";

export type CancelOrderInput = {
	readonly principal: Principal;
	readonly id: string;
	readonly reason: string;
};

export type CancelOrderUseCase = {
	execute(input: CancelOrderInput): Promise<OrderDto>;
};
