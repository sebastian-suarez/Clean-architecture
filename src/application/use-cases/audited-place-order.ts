import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type AuditLog } from "#application/ports/output/audit-log.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";

// Audit-logging decorator (§6.9). Records every PlaceOrder attempt
// (success or failure) into an append-only audit log.
export class AuditedPlaceOrder implements PlaceOrderUseCase {
	constructor(
		private readonly inner: PlaceOrderUseCase,
		private readonly audit: AuditLog,
		private readonly clock: Clock,
	) {}

	async execute(
		input: PlaceOrderInput,
		output: PlaceOrderOutput,
	): Promise<void> {
		const wrapped: PlaceOrderOutput = {
			placed: (order) => {
				output.placed(order);
				void this.audit.append({
					principalId: input.principal.id,
					action: "place_order",
					targetId: order.id,
					outcome: "ok",
					occurredAt: this.clock.now().toISOString(),
					metadata: { itemCount: input.items.length },
				});
			},
			customerNotFound: (customerId) => {
				output.customerNotFound(customerId);
				void this.audit.append({
					principalId: input.principal.id,
					action: "place_order",
					targetId: customerId,
					outcome: "fail",
					occurredAt: this.clock.now().toISOString(),
					metadata: { reason: "customer_not_found" },
				});
			},
			customerInactive: (customerId) => {
				output.customerInactive(customerId);
				void this.audit.append({
					principalId: input.principal.id,
					action: "place_order",
					targetId: customerId,
					outcome: "fail",
					occurredAt: this.clock.now().toISOString(),
					metadata: { reason: "customer_inactive" },
				});
			},
		};

		try {
			await this.inner.execute(input, wrapped);
		} catch (error) {
			await this.audit.append({
				principalId: input.principal.id,
				action: "place_order",
				targetId: input.customerId,
				outcome: "fail",
				occurredAt: this.clock.now().toISOString(),
				metadata: {
					reason: "exception",
					error: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}
}
