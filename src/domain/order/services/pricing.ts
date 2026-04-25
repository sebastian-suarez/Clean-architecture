import { LineItem } from "#domain/order/line-item.js";

const BULK_THRESHOLD = 10;
const BULK_DISCOUNT = 0.9;

// Domain service (§3.4) — stateless, pure, no I/O. Crosses multiple
// LineItems but doesn't naturally belong on any single one. Called by
// the application's PlaceOrder use case before constructing the Order.
export const pricing = {
	applyBulkDiscount(items: readonly LineItem[]): readonly LineItem[] {
		const totalQuantity = items.reduce(
			(sum, item) => sum + item.quantity.value,
			0,
		);
		if (totalQuantity < BULK_THRESHOLD) return items;

		return items.map((item) =>
			LineItem.create({
				sku: item.sku,
				quantity: item.quantity,
				unitPrice: item.unitPrice.multiply(BULK_DISCOUNT),
			}),
		);
	},
};
