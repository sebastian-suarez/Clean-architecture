import { type CompensateOrderConfirmationUseCase } from "#application/ports/input/compensate-order-confirmation-use-case.js";
import { type ConfirmOrderUseCase } from "#application/ports/input/confirm-order-use-case.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type IdGenerator } from "#application/ports/output/id-generator.js";
import { type InventoryReservation } from "#application/ports/output/inventory-reservation.js";
import { type Logger } from "#application/ports/output/logger.js";
import { type OrderProcessRepository } from "#application/ports/output/order-process-repository.js";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { CustomerId } from "#domain/order/customer-id.js";
import { OrderId } from "#domain/order/order-id.js";
import { OrderProcessId } from "#domain/order/order-process-id.js";
import { OrderProcess } from "#domain/order/order-process.js";
import { type OrderPlaced } from "#domain/order/events/order-placed.js";
import { type DomainEvent } from "#domain/shared/domain-event.js";

// Process Manager (§6.6). Drives the multi-step order-confirmation
// workflow:
//
//   OrderPlaced → reserve inventory ─┬─► confirm order   (happy path)
//                                    └─► cancel order    (compensation)
//
// State lives in `OrderProcess` (its own aggregate, persisted via
// `OrderProcessRepository`). Idempotent by construction (§4.4):
// re-receiving the same `OrderPlaced` finds an existing process past
// `started` and returns without doing work — at-least-once event
// delivery (§3.6) is safe.
//
// Compensations are explicit use cases
// (`CompensateOrderConfirmation`), not buried `try/catch` blocks
// (§6.6).
export class OrderConfirmationSaga {
	constructor(
		private readonly events: EventPublisher,
		private readonly orders: OrderRepository,
		private readonly processes: OrderProcessRepository,
		private readonly inventory: InventoryReservation,
		private readonly confirmOrder: ConfirmOrderUseCase,
		private readonly compensate: CompensateOrderConfirmationUseCase,
		private readonly clock: Clock,
		private readonly ids: IdGenerator,
		private readonly logger: Logger,
	) {}

	start(): void {
		this.events.subscribe("OrderPlaced", async (event) => {
			await this.handleOrderPlaced(event as DomainEvent & OrderPlaced);
		});
	}

	private async handleOrderPlaced(event: OrderPlaced): Promise<void> {
		const orderId = OrderId.create(event.aggregateId);

		// Idempotency guard (§4.4) — same event delivered twice is a no-op.
		const existing = await this.processes.findByOrderId(orderId);
		if (existing) {
			this.logger.info("saga.order_confirmation.duplicate", {
				orderId: event.aggregateId,
				status: existing.status.kind,
			});
			return;
		}

		const order = await this.orders.findById(orderId);
		if (!order) {
			// Aggregate was cancelled or pruned between event publish and
			// saga handling. Drop the event — there is nothing to drive.
			this.logger.warn("saga.order_confirmation.order_missing", {
				orderId: event.aggregateId,
			});
			return;
		}

		const started = OrderProcess.start({
			id: OrderProcessId.create(this.ids.next()),
			orderId,
			customerId: CustomerId.create(event.customerId),
			startedAt: this.clock.now(),
		});
		await this.processes.save(started);
		// Reload so the next save sees the post-save version (optimistic
		// concurrency, §3.7) — same load-mutate-save discipline as any
		// other use case.
		const persisted = await this.processes.findByOrderId(orderId);
		if (!persisted) return;

		const outcome = await this.inventory.reserve({
			orderId: orderId.value,
			items: order.items.map((item) => ({
				sku: item.sku.value,
				quantity: item.quantity.value,
			})),
		});

		if (outcome.kind === "out_of_stock") {
			await this.compensate.execute({
				orderId: orderId.value,
				reason: `inventory_unavailable:${outcome.sku}`,
			});
			await this.processes.save(persisted.compensate(outcome.sku));
			this.logger.info("saga.order_confirmation.compensated", {
				orderId: event.aggregateId,
				sku: outcome.sku,
			});
			return;
		}

		await this.confirmOrder.execute({
			orderId: orderId.value,
			reservationId: outcome.reservationId,
		});
		await this.processes.save(persisted.confirm(outcome.reservationId));
		this.logger.info("saga.order_confirmation.confirmed", {
			orderId: event.aggregateId,
			reservationId: outcome.reservationId,
		});
	}
}
