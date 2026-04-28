import { type OrderSummaryDto } from "#application/dtos/order-summary-dto.js";

export type ListOrderSummariesInput = {
	readonly customerId: string;
	readonly cursor?: string;
	readonly limit: number;
};

export type ListOrderSummariesOutput = {
	readonly items: readonly OrderSummaryDto[];
	readonly nextCursor: string | undefined;
};

// CQRS-side query (§4.1). Backed by the `OrderSummaryReadModel`
// projection — independent of `OrderRepository`. Exists alongside
// `ListOrders` (the CQS / aggregate-backed query) so both styles are
// visible side-by-side.
export type ListOrderSummariesUseCase = {
	execute(input: ListOrderSummariesInput): Promise<ListOrderSummariesOutput>;
};
