import { type OrderDto } from "#application/dtos/order-dto.js";
import { orderMapper } from "#application/mappers/order-mapper.js";
import {
	type CancelOrderInput,
	type CancelOrderUseCase,
} from "#application/ports/input/cancel-order-use-case.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { OrderNotFoundError } from "#domain/order/errors.js";
import { OrderId } from "#domain/order/order-id.js";
import { ForbiddenError } from "#domain/shared/forbidden-error.js";

export class CancelOrder implements CancelOrderUseCase {
	constructor(
		private readonly orders: OrderRepository,
		private readonly clock: Clock,
		private readonly events: EventPublisher,
	) {}

	async execute(input: CancelOrderInput): Promise<OrderDto> {
		const id = OrderId.create(input.id);

		const order = await this.orders.findById(id);
		if (!order) {
			throw new OrderNotFoundError(input.id);
		}

		// Data-aware authorization (§6.4) — must own the order or be admin.
		const isOwner = order.customerId === input.principal.id;
		const isAdmin = input.principal.roles.includes("admin");
		if (!isOwner && !isAdmin) {
			throw new ForbiddenError("cancel order");
		}

		const cancelled = order.cancel(input.reason, this.clock.now());
		await this.orders.save(cancelled);

		for (const event of cancelled.events) {
			await this.events.publish(event);
		}

		return orderMapper.toDto(cancelled);
	}
}
