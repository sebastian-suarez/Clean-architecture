import { CustomerId } from "#domain/order/customer-id.js";
import { LineItem } from "#domain/order/line-item.js";
import { Money } from "#domain/order/money.js";
import { OrderId } from "#domain/order/order-id.js";
import { type OrderStatus } from "#domain/order/order-status.js";
import { Order } from "#domain/order/order.js";
import { Quantity } from "#domain/order/quantity.js";
import { Sku } from "#domain/order/sku.js";

type LineItemRecord = {
	sku: string;
	quantity: number;
	unitPriceAmount: number;
	currency: string;
};

export type OrderRecord = {
	id: string;
	customerId: string;
	placedAt: string;
	items: LineItemRecord[];
	status: OrderStatus;
	version: number;
};

export const orderRecordMapper = {
	toRecord(order: Order): OrderRecord {
		return {
			id: order.id.value,
			customerId: order.customerId,
			placedAt: order.placedAt.toISOString(),
			items: order.items.map((item) => ({
				sku: item.sku.value,
				quantity: item.quantity.value,
				unitPriceAmount: item.unitPrice.amount,
				currency: item.unitPrice.currency,
			})),
			status: order.status,
			version: order.version,
		};
	},

	toDomain(record: OrderRecord): Order {
		return Order.reconstruct({
			id: OrderId.create(record.id),
			customerId: CustomerId.create(record.customerId),
			placedAt: new Date(record.placedAt),
			items: record.items.map((item) =>
				LineItem.reconstruct({
					sku: Sku.create(item.sku),
					quantity: Quantity.create(item.quantity),
					unitPrice: Money.create(item.unitPriceAmount, item.currency),
				}),
			),
			status: record.status,
			version: record.version,
		});
	},
};
