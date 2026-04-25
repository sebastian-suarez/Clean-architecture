import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type Logger } from "#application/ports/output/logger.js";

// Saga (§6.6) — subscribes to a domain event and reacts. Real sagas
// would persist their own state and dispatch compensating use cases on
// partial failure; this one demonstrates the wiring by logging
// receipt. Subscribers are idempotent (§4.4) — handling the same
// event twice is a no-op for this saga.
export class OrderConfirmationSaga {
	constructor(
		private readonly events: EventPublisher,
		private readonly logger: Logger,
	) {}

	start(): void {
		this.events.subscribe("OrderPlaced", async (event) => {
			this.logger.info("saga.order_confirmation.received", {
				aggregateId: event.aggregateId,
				occurredAt: event.occurredAt,
			});
		});
	}
}
