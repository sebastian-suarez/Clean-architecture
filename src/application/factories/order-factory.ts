import { type Clock } from "#application/ports/output/clock.js";
import { type IdGenerator } from "#application/ports/output/id-generator.js";
import { type CustomerId } from "#domain/order/customer-id.js";
import { LineItem } from "#domain/order/line-item.js";
import { Money } from "#domain/order/money.js";
import { OrderId } from "#domain/order/order-id.js";
import { Order } from "#domain/order/order.js";
import { Quantity } from "#domain/order/quantity.js";
import { pricing } from "#domain/order/services/pricing.js";
import { Sku } from "#domain/order/sku.js";

export type OrderItemInput = {
	readonly sku: string;
	readonly quantity: number;
	readonly unitPrice: number;
	readonly currency: string;
};

export type OrderFactoryInput = {
	readonly customerId: CustomerId;
	readonly items: readonly OrderItemInput[];
};

// Application factory (§3.8) — wraps `Order.create` with the
// collaborators (id-gen, clock) and the pricing domain service that
// don't belong as Order fields. Used by PlaceOrder.
export class OrderFactory {
	constructor(
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	build(input: OrderFactoryInput): Order {
		const items = input.items.map((item) =>
			LineItem.create({
				sku: Sku.create(item.sku),
				quantity: Quantity.create(item.quantity),
				unitPrice: Money.create(item.unitPrice, item.currency),
			}),
		);

		const discounted = pricing.applyBulkDiscount(items);

		return Order.create({
			id: OrderId.create(this.ids.next()),
			customerId: input.customerId,
			placedAt: this.clock.now(),
			items: discounted,
		});
	}
}
