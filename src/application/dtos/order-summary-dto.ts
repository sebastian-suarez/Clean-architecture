// Read-side DTO (§4.1, full CQRS). Denormalized projection of the
// Order aggregate optimized for list/detail views — flat shape, no
// LineItem array, includes derived `itemCount` and a single
// `lastActivityAt` timestamp pulled forward by the projector. Distinct
// from `OrderDto` which mirrors the write-side aggregate.
export type OrderSummaryStatus =
	| "placed"
	| "confirmed"
	| "shipped"
	| "cancelled";

export type OrderSummaryDto = {
	readonly id: string;
	readonly customerId: string;
	readonly status: OrderSummaryStatus;
	readonly totalAmount: number;
	readonly currency: string;
	readonly itemCount: number;
	readonly placedAt: string;
	readonly lastActivityAt: string;
};
