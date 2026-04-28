import { type OrderDto } from "#application/dtos/order-dto.js";
import { orderMapper } from "#application/mappers/order-mapper.js";
import {
	type ConfirmOrderInput,
	type ConfirmOrderUseCase,
} from "#application/ports/input/confirm-order-use-case.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { OrderNotFoundError } from "#domain/order/errors.js";
import { OrderId } from "#domain/order/order-id.js";

// Saga-driven command. Loads the order, applies `confirm`, persists,
// dispatches buffered events. Stays a normal use case — the saga calls
// it like any other caller; injection makes both the saga and tests
// trivial.
export class ConfirmOrder implements ConfirmOrderUseCase {
	constructor(
		private readonly orders: OrderRepository,
		private readonly clock: Clock,
		private readonly events: EventPublisher,
	) {}

	async execute(input: ConfirmOrderInput): Promise<OrderDto> {
		const id = OrderId.create(input.orderId);
		const order = await this.orders.findById(id);
		if (!order) {
			throw new OrderNotFoundError(input.orderId);
		}

		const confirmed = order.confirm(input.reservationId, this.clock.now());
		await this.orders.save(confirmed);

		for (const event of confirmed.events) {
			await this.events.publish(event);
		}

		return orderMapper.toDto(confirmed);
	}
}
