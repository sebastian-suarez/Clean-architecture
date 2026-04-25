import { orderMapper } from "#application/mappers/order-mapper.js";
import {
	type ListOrdersInput,
	type ListOrdersOutput,
	type ListOrdersUseCase,
} from "#application/ports/input/list-orders-use-case.js";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { CustomerId } from "#domain/order/customer-id.js";

const MAX_LIMIT = 100;

export class ListOrders implements ListOrdersUseCase {
	constructor(private readonly orders: OrderRepository) {}

	async execute(input: ListOrdersInput): Promise<ListOrdersOutput> {
		if (input.limit < 1 || input.limit > MAX_LIMIT) {
			throw new Error(`limit must be in 1..${MAX_LIMIT}`);
		}

		const page = await this.orders.findByCustomer(
			CustomerId.create(input.customerId),
			{ cursor: input.cursor, limit: input.limit },
		);

		return {
			items: page.items.map((order) => orderMapper.toDto(order)),
			nextCursor: page.nextCursor,
		};
	}
}
