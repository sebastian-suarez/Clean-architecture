import { type LineItemDto } from "#application/dtos/line-item-dto.js";
import { type OrderDto } from "#application/dtos/order-dto.js";
import { type LineItem } from "#domain/order/line-item.js";
import { type Order } from "#domain/order/order.js";

export const orderMapper = {
	toDto(order: Order): OrderDto {
		const total = order.total();
		return {
			id: order.id.value,
			customerId: order.customerId,
			placedAt: order.placedAt.toISOString(),
			items: order.items.map((item) => lineItemToDto(item)),
			totalAmount: total.amount,
			currency: total.currency,
			status: order.status,
			version: order.version,
		};
	},
};

function lineItemToDto(item: LineItem): LineItemDto {
	const subtotal = item.subtotal();
	return {
		sku: item.sku.value,
		quantity: item.quantity.value,
		unitPriceAmount: item.unitPrice.amount,
		currency: item.unitPrice.currency,
		subtotalAmount: subtotal.amount,
	};
}
