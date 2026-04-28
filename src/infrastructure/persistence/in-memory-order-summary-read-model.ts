import { type OrderSummaryDto } from "#application/dtos/order-summary-dto.js";
import { type OrderSummaryProjection } from "#application/ports/output/order-summary-projection.js";
import {
	type OrderSummaryPage,
	type OrderSummaryPagination,
	type OrderSummaryReadModel,
} from "#application/ports/output/order-summary-read-model.js";

// Implements both the read port (`OrderSummaryReadModel`) and the
// writer port (`OrderSummaryProjection`). Single store, two narrow
// surfaces — query use cases inject the read port; the projector
// injects the writer port.
//
// In a production deployment the same adapter would persist to a
// dedicated denormalized table (or a separate read-replica store).
// The in-memory variant is sufficient for tests (§5.3) and local dev.
export class InMemoryOrderSummaryReadModel
	implements OrderSummaryReadModel, OrderSummaryProjection
{
	private readonly summaries = new Map<string, OrderSummaryDto>();

	async findById(id: string): Promise<OrderSummaryDto | undefined> {
		return this.summaries.get(id);
	}

	async listByCustomer(
		customerId: string,
		pagination: OrderSummaryPagination,
	): Promise<OrderSummaryPage> {
		const matching = [...this.summaries.values()]
			.filter((s) => s.customerId === customerId)
			.sort((a, b) => a.placedAt.localeCompare(b.placedAt));

		const offset = pagination.cursor ? Number(pagination.cursor) : 0;
		if (!Number.isInteger(offset) || offset < 0) {
			throw new Error(`Invalid cursor: ${pagination.cursor}`);
		}

		const items = matching.slice(offset, offset + pagination.limit);
		const nextOffset = offset + items.length;
		const nextCursor =
			nextOffset < matching.length ? String(nextOffset) : undefined;
		return { items, nextCursor };
	}

	async upsert(summary: OrderSummaryDto): Promise<void> {
		this.summaries.set(summary.id, summary);
	}

	async patchStatus(parameters: {
		id: string;
		status: OrderSummaryDto["status"];
		lastActivityAt: string;
	}): Promise<void> {
		const existing = this.summaries.get(parameters.id);
		if (!existing) return;
		this.summaries.set(parameters.id, {
			...existing,
			status: parameters.status,
			lastActivityAt: parameters.lastActivityAt,
		});
	}
}
