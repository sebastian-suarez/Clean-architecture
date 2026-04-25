import { orderMapper } from "#application/mappers/order-mapper.js";
import { type OrderFactory } from "#application/factories/order-factory.js";
import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type CustomerLookup } from "#application/ports/output/customer-lookup.js";
import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { type UnitOfWork } from "#application/ports/output/unit-of-work.js";
import { CustomerId } from "#domain/order/customer-id.js";

// PlaceOrder uses an Output Boundary instead of returning a DTO (§4.8).
// Demonstrates the inverted pattern: presentation owns the rendering of
// success / customer-not-found / customer-inactive.
export class PlaceOrder implements PlaceOrderUseCase {
	constructor(
		private readonly orders: OrderRepository,
		private readonly customers: CustomerLookup,
		private readonly factory: OrderFactory,
		private readonly events: EventPublisher,
		private readonly unitOfWork: UnitOfWork,
	) {}

	async execute(
		input: PlaceOrderInput,
		output: PlaceOrderOutput,
	): Promise<void> {
		const customerId = CustomerId.create(input.customerId);

		const customer = await this.customers.find(customerId);
		if (!customer) {
			output.customerNotFound(input.customerId);
			return;
		}

		if (customer.status !== "active") {
			output.customerInactive(input.customerId);
			return;
		}

		const order = this.factory.build({
			customerId,
			items: input.items,
		});

		// Atomic load–mutate–save (§3.7) wrapped in the unit of work so
		// the save and any future side-effect persistence are committed
		// together.
		await this.unitOfWork.run(async () => {
			await this.orders.save(order);
		});

		for (const event of order.events) {
			await this.events.publish(event);
		}

		output.placed(orderMapper.toDto(order));
	}
}
