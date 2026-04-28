import { type OrderSummaryDto } from "#application/dtos/order-summary-dto.js";

export type OrderSummaryPage = {
	readonly items: readonly OrderSummaryDto[];
	readonly nextCursor: string | undefined;
};

export type OrderSummaryPagination = {
	readonly cursor?: string;
	readonly limit: number; // 1..100
};

// Read-model port (§4.1, full CQRS). Returns query DTOs from a
// projection store kept up to date by `OrderSummaryProjector`. Distinct
// from `OrderRepository` — never bend the repository to serve query
// DTOs (§5.2). Read use cases (`ListOrderSummaries`) depend on this
// port; the projector depends on `OrderSummaryProjection` (the writer
// half) implemented by the same adapter.
export type OrderSummaryReadModel = {
	findById(id: string): Promise<OrderSummaryDto | undefined>;
	listByCustomer(
		customerId: string,
		pagination: OrderSummaryPagination,
	): Promise<OrderSummaryPage>;
};
