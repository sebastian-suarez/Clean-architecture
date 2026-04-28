import {
	type InventoryItemRequest,
	type InventoryReservation,
	type ReservationOutcome,
} from "#application/ports/output/inventory-reservation.js";
import { type IdGenerator } from "#application/ports/output/id-generator.js";

// In-memory inventory adapter (§5.3). Holds per-SKU stock; `reserve`
// decrements atomically and returns a reservation id, `release` adds
// the items back. Sufficient for tests and local development; a
// production adapter would talk to a warehouse system.
export class InMemoryInventoryReservation implements InventoryReservation {
	private readonly stock = new Map<string, number>();
	private readonly reservations = new Map<string, InventoryItemRequest[]>();

	constructor(
		private readonly ids: IdGenerator,
		initialStock: Readonly<Record<string, number>> = {},
	) {
		for (const [sku, quantity] of Object.entries(initialStock)) {
			this.stock.set(sku, quantity);
		}
	}

	async reserve(parameters: {
		orderId: string;
		items: readonly InventoryItemRequest[];
	}): Promise<ReservationOutcome> {
		for (const item of parameters.items) {
			const onHand = this.stock.get(item.sku) ?? 0;
			if (onHand < item.quantity) {
				return { kind: "out_of_stock", sku: item.sku };
			}
		}

		for (const item of parameters.items) {
			this.stock.set(item.sku, (this.stock.get(item.sku) ?? 0) - item.quantity);
		}

		const reservationId = this.ids.next();
		this.reservations.set(reservationId, [...parameters.items]);
		return { kind: "reserved", reservationId };
	}

	async release(reservationId: string): Promise<void> {
		const items = this.reservations.get(reservationId);
		if (!items) return;

		for (const item of items) {
			this.stock.set(item.sku, (this.stock.get(item.sku) ?? 0) + item.quantity);
		}

		this.reservations.delete(reservationId);
	}

	stockOf(sku: string): number {
		return this.stock.get(sku) ?? 0;
	}
}
