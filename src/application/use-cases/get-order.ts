import { type OrderDto } from "#application/dtos/order-dto.js";
import { orderMapper } from "#application/mappers/order-mapper.js";
import { type GetOrderUseCase } from "#application/ports/input/get-order-use-case.js";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { OrderNotFoundError } from "#domain/order/errors.js";
import { OrderId } from "#domain/order/order-id.js";

export class GetOrder implements GetOrderUseCase {
	constructor(private readonly orders: OrderRepository) {}

	async execute(id: string): Promise<OrderDto> {
		const order = await this.orders.findById(OrderId.create(id));
		if (!order) {
			throw new OrderNotFoundError(id);
		}

		return orderMapper.toDto(order);
	}
}
