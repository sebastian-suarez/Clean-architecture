import { type OrderSummaryDto } from "#application/dtos/order-summary-dto.js";

// Writer half of the read-model store (§4.1, full CQRS). Used by
// `OrderSummaryProjector` — never by query use cases. Splitting reads
// and writes into two ports keeps the query side's surface tight and
// prevents a use case from reaching for `upsert` "just this once".
export type OrderSummaryProjection = {
	upsert(summary: OrderSummaryDto): Promise<void>;
	patchStatus(parameters: {
		id: string;
		status: OrderSummaryDto["status"];
		lastActivityAt: string;
	}): Promise<void>;
};
