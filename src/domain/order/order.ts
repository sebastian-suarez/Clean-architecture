import { type CustomerId } from "#domain/order/customer-id.js";
import {
	EmptyOrderError,
	OrderAlreadyCancelledError,
	OrderAlreadyShippedError,
	OrderNotConfirmableError,
	OrderNotMutableError,
} from "#domain/order/errors.js";
import { lineItemAdded } from "#domain/order/events/line-item-added.js";
import { orderCancelled } from "#domain/order/events/order-cancelled.js";
import { orderConfirmed } from "#domain/order/events/order-confirmed.js";
import { orderPlaced } from "#domain/order/events/order-placed.js";
import { type LineItem } from "#domain/order/line-item.js";
import { Money } from "#domain/order/money.js";
import { type OrderId } from "#domain/order/order-id.js";
import { type OrderStatus } from "#domain/order/order-status.js";
import { type Sku } from "#domain/order/sku.js";
import { type DomainEvent } from "#domain/shared/domain-event.js";

export type OrderCreateProps = {
	id: OrderId;
	customerId: CustomerId;
	placedAt: Date;
	items: readonly LineItem[];
};

export type OrderReconstructProps = {
	id: OrderId;
	customerId: CustomerId;
	placedAt: Date;
	items: readonly LineItem[];
	status: OrderStatus;
	version: number;
};

// Aggregate root (§3.3). Inner LineItems are reached only through this
// class. Cross-aggregate references (customerId) are by id only —
// Vernon Rule 3 (§3.3).
export class Order {
	static create(props: OrderCreateProps): Order {
		// Creation invariant — re-checked here, NOT inside reconstruct (§3.1).
		if (props.items.length === 0) {
			throw new EmptyOrderError();
		}

		const total = totalOf(props.items);
		const event = orderPlaced({
			aggregateId: props.id.value,
			customerId: props.customerId,
			totalAmount: total.amount,
			currency: total.currency,
			itemCount: props.items.length,
			occurredAt: props.placedAt,
		});

		return new Order(
			props.id,
			props.customerId,
			props.placedAt,
			[...props.items],
			{ kind: "placed" },
			0,
			[event],
		);
	}

	static reconstruct(props: OrderReconstructProps): Order {
		// No creation invariant re-run (§3.1) — past data may have been
		// valid under older rules. Structural shape is still checked by TS.
		return new Order(
			props.id,
			props.customerId,
			props.placedAt,
			[...props.items],
			props.status,
			props.version,
			[],
		);
	}

	private constructor(
		public readonly id: OrderId,
		public readonly customerId: CustomerId,
		public readonly placedAt: Date,
		private readonly _items: readonly LineItem[],
		public readonly status: OrderStatus,
		public readonly version: number,
		public readonly events: readonly DomainEvent[],
	) {}

	get items(): readonly LineItem[] {
		return this._items;
	}

	total(): Money {
		return totalOf(this._items);
	}

	// Query method on the root — returns the inner entity by sku without
	// granting external mutation rights (§3.7 "no leaking inner state").
	lineItem(sku: Sku): LineItem | undefined {
		return this._items.find((item) => item.sku.equals(sku));
	}

	addItem(item: LineItem, when: Date): Order {
		this.assertMutable();
		const existingIndex = this._items.findIndex((i) => i.sku.equals(item.sku));
		const nextItems =
			existingIndex === -1
				? [...this._items, item]
				: this._items.map((existing, index) =>
						index === existingIndex
							? existing.withQuantity(existing.quantity.add(item.quantity))
							: existing,
					);

		return new Order(
			this.id,
			this.customerId,
			this.placedAt,
			nextItems,
			this.status,
			this.version,
			[
				...this.events,
				lineItemAdded({
					aggregateId: this.id.value,
					sku: item.sku.value,
					quantity: item.quantity.value,
					occurredAt: when,
				}),
			],
		);
	}

	// Saga-driven transition (§6.6) — `OrderConfirmationSaga` calls
	// `ConfirmOrder` once the inventory reservation succeeds. The saga
	// passes its reservation id so the order carries an audit trail of
	// which fulfillment attempt produced this state.
	confirm(reservationId: string, when: Date): Order {
		if (this.status.kind !== "placed") {
			throw new OrderNotConfirmableError(this.id.value, this.status.kind);
		}

		return new Order(
			this.id,
			this.customerId,
			this.placedAt,
			this._items,
			{ kind: "confirmed", reservationId, at: when.toISOString() },
			this.version,
			[
				...this.events,
				orderConfirmed({
					aggregateId: this.id.value,
					reservationId,
					occurredAt: when,
				}),
			],
		);
	}

	cancel(reason: string, when: Date): Order {
		if (this.status.kind === "cancelled") {
			throw new OrderAlreadyCancelledError(this.id.value);
		}

		if (this.status.kind === "shipped") {
			throw new OrderAlreadyShippedError(this.id.value);
		}

		return new Order(
			this.id,
			this.customerId,
			this.placedAt,
			this._items,
			{ kind: "cancelled", reason, at: when.toISOString() },
			this.version,
			[
				...this.events,
				orderCancelled({
					aggregateId: this.id.value,
					reason,
					occurredAt: when,
				}),
			],
		);
	}

	private assertMutable(): void {
		if (this.status.kind !== "placed") {
			throw new OrderNotMutableError(this.id.value, this.status.kind);
		}
	}
}

function totalOf(items: readonly LineItem[]): Money {
	if (items.length === 0) {
		throw new EmptyOrderError();
	}

	const { currency } = items[0].unitPrice;
	return items.reduce<Money>(
		(acc, item) => acc.add(item.subtotal()),
		Money.zero(currency),
	);
}
