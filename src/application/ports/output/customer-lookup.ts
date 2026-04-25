import { type CustomerSummaryDto } from "#application/dtos/customer-summary-dto.js";
import { type CustomerId } from "#domain/order/customer-id.js";

// Cross-context lookup (§6.5). Owned by the Order context's application
// layer; populated by an adapter that translates from the User context.
// The adapter is the Anti-Corruption Layer between contexts (§5.4).
export type CustomerLookup = {
	find(id: CustomerId): Promise<CustomerSummaryDto | undefined>;
};
