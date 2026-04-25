import { CustomerId } from "#domain/order/customer-id.js";
import { LineItem } from "#domain/order/line-item.js";
import { Money } from "#domain/order/money.js";
import { OrderId } from "#domain/order/order-id.js";
import { type OrderStatus } from "#domain/order/order-status.js";
import { Order } from "#domain/order/order.js";
import { Quantity } from "#domain/order/quantity.js";
import { Sku } from "#domain/order/sku.js";

export function anOrder(): OrderBuilder {
	return new OrderBuilder();
}

export function aLineItem(): LineItemBuilder {
	return new LineItemBuilder();
}

class OrderBuilder {
	private id = "order-1";
	private customerId = "user-1";
	private placedAt = new Date("2026-01-01T00:00:00Z");
	private items: LineItem[] = [
		aLineItem().withSku("BOOK-1").withQuantity(2).withUnitPrice(9.99).build(),
	];

	private status: OrderStatus = { kind: "placed" };
	private version = 0;

	withId(id: string): this {
		this.id = id;
		return this;
	}

	withCustomerId(id: string): this {
		this.customerId = id;
		return this;
	}

	withPlacedAt(date: Date): this {
		this.placedAt = date;
		return this;
	}

	withItems(items: LineItem[]): this {
		this.items = items;
		return this;
	}

	withStatus(status: OrderStatus): this {
		this.status = status;
		return this;
	}

	withVersion(v: number): this {
		this.version = v;
		return this;
	}

	build(): Order {
		return Order.reconstruct({
			id: OrderId.create(this.id),
			customerId: CustomerId.create(this.customerId),
			placedAt: this.placedAt,
			items: this.items,
			status: this.status,
			version: this.version,
		});
	}

	buildNew(): Order {
		return Order.create({
			id: OrderId.create(this.id),
			customerId: CustomerId.create(this.customerId),
			placedAt: this.placedAt,
			items: this.items,
		});
	}
}

class LineItemBuilder {
	private sku = "BOOK-1";
	private quantity = 1;
	private unitPriceAmount = 9.99;
	private currency = "USD";

	withSku(sku: string): this {
		this.sku = sku;
		return this;
	}

	withQuantity(qty: number): this {
		this.quantity = qty;
		return this;
	}

	withUnitPrice(amount: number, currency = "USD"): this {
		this.unitPriceAmount = amount;
		this.currency = currency;
		return this;
	}

	build(): LineItem {
		return LineItem.create({
			sku: Sku.create(this.sku),
			quantity: Quantity.create(this.quantity),
			unitPrice: Money.create(this.unitPriceAmount, this.currency),
		});
	}
}
