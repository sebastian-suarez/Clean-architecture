import {
	type ListOrderSummariesInput,
	type ListOrderSummariesOutput,
	type ListOrderSummariesUseCase,
} from "#application/ports/input/list-order-summaries-use-case.js";
import { type OrderSummaryReadModel } from "#application/ports/output/order-summary-read-model.js";

const MAX_LIMIT = 100;

// CQRS query (§4.1). Reads from the projection store updated by
// `OrderSummaryProjector` — never touches `OrderRepository`. The shape
// of `OrderSummaryDto` is decoupled from the `Order` aggregate, which
// is the whole point of full CQRS.
export class ListOrderSummaries implements ListOrderSummariesUseCase {
	constructor(private readonly summaries: OrderSummaryReadModel) {}

	async execute(
		input: ListOrderSummariesInput,
	): Promise<ListOrderSummariesOutput> {
		if (input.limit < 1 || input.limit > MAX_LIMIT) {
			throw new Error(`limit must be in 1..${MAX_LIMIT}`);
		}

		const page = await this.summaries.listByCustomer(input.customerId, {
			cursor: input.cursor,
			limit: input.limit,
		});

		return { items: page.items, nextCursor: page.nextCursor };
	}
}
