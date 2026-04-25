import { type Money } from "#domain/order/money.js";
import { type Quantity } from "#domain/order/quantity.js";
import { type Sku } from "#domain/order/sku.js";

export type LineItemProps = {
	sku: Sku;
	quantity: Quantity;
	unitPrice: Money;
};

// Inner entity of the Order aggregate (§3.3). External code reaches it
// only through the Order root; LineItem has no repository of its own.
export class LineItem {
	static create(props: LineItemProps): LineItem {
		return new LineItem(props.sku, props.quantity, props.unitPrice);
	}

	static reconstruct(props: LineItemProps): LineItem {
		return new LineItem(props.sku, props.quantity, props.unitPrice);
	}

	private constructor(
		public readonly sku: Sku,
		public readonly quantity: Quantity,
		public readonly unitPrice: Money,
	) {}

	subtotal(): Money {
		return this.unitPrice.multiply(this.quantity.value);
	}

	withQuantity(quantity: Quantity): LineItem {
		return new LineItem(this.sku, quantity, this.unitPrice);
	}

	equals(other: LineItem): boolean {
		return (
			this.sku.equals(other.sku) &&
			this.quantity.equals(other.quantity) &&
			this.unitPrice.equals(other.unitPrice)
		);
	}
}
