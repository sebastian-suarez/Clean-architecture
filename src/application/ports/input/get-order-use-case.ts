import { type OrderDto } from "#application/dtos/order-dto.js";

export type GetOrderUseCase = {
	execute(id: string): Promise<OrderDto>;
};
