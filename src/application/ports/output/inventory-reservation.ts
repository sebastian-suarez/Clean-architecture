// Output port consumed by `OrderConfirmationSaga` (§6.6). The adapter
// reaches whatever inventory system actually holds stock (in-memory for
// tests; warehouse API in production). The saga treats reservation as
// the step that may genuinely fail (out of stock, network error) and
// drives the compensation branch when it does.
export type ReservationOutcome =
	| { readonly kind: "reserved"; readonly reservationId: string }
	| { readonly kind: "out_of_stock"; readonly sku: string };

export type InventoryItemRequest = {
	readonly sku: string;
	readonly quantity: number;
};

export type InventoryReservation = {
	reserve(parameters: {
		orderId: string;
		items: readonly InventoryItemRequest[];
	}): Promise<ReservationOutcome>;
	release(reservationId: string): Promise<void>;
};
