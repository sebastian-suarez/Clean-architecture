import { type OrderDto } from "#application/dtos/order-dto.js";
import { orderMapper } from "#application/mappers/order-mapper.js";
import {
	type CompensateOrderConfirmationInput,
	type CompensateOrderConfirmationUseCase,
} from "#application/ports/input/compensate-order-confirmation-use-case.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { OrderNotFoundError } from "#domain/order/errors.js";
import { OrderId } from "#domain/order/order-id.js";

export class CompensateOrderConfirmation implements CompensateOrderConfirmationUseCase {
	constructor(
		private readonly orders: OrderRepository,
		private readonly clock: Clock,
		private readonly events: EventPublisher,
	) {}

	async execute(input: CompensateOrderConfirmationInput): Promise<OrderDto> {
		const id = OrderId.create(input.orderId);
		const order = await this.orders.findById(id);
		if (!order) {
			throw new OrderNotFoundError(input.orderId);
		}

		const cancelled = order.cancel(input.reason, this.clock.now());
		await this.orders.save(cancelled);

		for (const event of cancelled.events) {
			await this.events.publish(event);
		}

		return orderMapper.toDto(cancelled);
	}
}
