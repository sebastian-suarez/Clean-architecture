import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type Logger } from "#application/ports/output/logger.js";
import { type OrderSummaryProjection } from "#application/ports/output/order-summary-projection.js";
import { type LineItemAdded } from "#domain/order/events/line-item-added.js";
import { type OrderCancelled } from "#domain/order/events/order-cancelled.js";
import { type OrderConfirmed } from "#domain/order/events/order-confirmed.js";
import { type OrderPlaced } from "#domain/order/events/order-placed.js";

// Read-model projector (§4.1, full CQRS). Subscribes to the Order
// aggregate's domain events (§3.6) and rebuilds the denormalized
// `OrderSummary` projection. Lives in `application/projections/`
// because it knows the event shape and the read DTO; infrastructure
// only owns the storage adapter.
//
// Idempotent: replaying the same event produces the same row.
// At-least-once delivery (§3.6) is therefore safe.
export class OrderSummaryProjector {
	constructor(
		private readonly events: EventPublisher,
		private readonly projection: OrderSummaryProjection,
		private readonly logger: Logger,
	) {}

	start(): void {
		this.events.subscribe("OrderPlaced", async (event) => {
			const placed = event as OrderPlaced;
			await this.projection.upsert({
				id: placed.aggregateId,
				customerId: placed.customerId,
				status: "placed",
				totalAmount: placed.totalAmount,
				currency: placed.currency,
				itemCount: placed.itemCount,
				placedAt: placed.occurredAt,
				lastActivityAt: placed.occurredAt,
			});
			this.logger.info("projection.order_summary.placed", {
				orderId: placed.aggregateId,
			});
		});

		this.events.subscribe("LineItemAdded", async (event) => {
			const added = event as LineItemAdded;
			// `LineItemAdded` only updates lastActivityAt — totals are
			// recomputed from the next `OrderPlaced`/`OrderConfirmed` event
			// in this template's simplified projector. A real projector
			// might re-fetch the aggregate to recompute the total.
			await this.projection.patchStatus({
				id: added.aggregateId,
				status: "placed",
				lastActivityAt: added.occurredAt,
			});
		});

		this.events.subscribe("OrderConfirmed", async (event) => {
			const confirmed = event as OrderConfirmed;
			await this.projection.patchStatus({
				id: confirmed.aggregateId,
				status: "confirmed",
				lastActivityAt: confirmed.occurredAt,
			});
		});

		this.events.subscribe("OrderCancelled", async (event) => {
			const cancelled = event as OrderCancelled;
			await this.projection.patchStatus({
				id: cancelled.aggregateId,
				status: "cancelled",
				lastActivityAt: cancelled.occurredAt,
			});
		});
	}
}
