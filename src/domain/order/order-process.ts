import { type CustomerId } from "#domain/order/customer-id.js";
import { OrderProcessTransitionError } from "#domain/order/errors.js";
import { type OrderId } from "#domain/order/order-id.js";
import { type OrderProcessId } from "#domain/order/order-process-id.js";

export type OrderProcessStatus =
	| { readonly kind: "started" }
	| { readonly kind: "confirmed"; readonly reservationId: string }
	| { readonly kind: "compensated"; readonly reason: string };

// Saga state aggregate (§6.6). The OrderConfirmationSaga (a process
// manager) reacts to `OrderPlaced` events, drives the multi-step
// fulfillment workflow (reserve inventory → confirm order, with cancel
// as compensation) and persists progress here. Persisted via
// `OrderProcessRepository`; same atomicity rules as any aggregate
// (§3.7). Idempotent: re-receiving the same trigger event finds the
// process already past `started` and returns without doing work
// (§4.4).
export class OrderProcess {
	static start(props: {
		id: OrderProcessId;
		orderId: OrderId;
		customerId: CustomerId;
		startedAt: Date;
	}): OrderProcess {
		return new OrderProcess(
			props.id,
			props.orderId,
			props.customerId,
			props.startedAt,
			{ kind: "started" },
			0,
		);
	}

	static reconstruct(props: {
		id: OrderProcessId;
		orderId: OrderId;
		customerId: CustomerId;
		startedAt: Date;
		status: OrderProcessStatus;
		version: number;
	}): OrderProcess {
		return new OrderProcess(
			props.id,
			props.orderId,
			props.customerId,
			props.startedAt,
			props.status,
			props.version,
		);
	}

	private constructor(
		public readonly id: OrderProcessId,
		public readonly orderId: OrderId,
		public readonly customerId: CustomerId,
		public readonly startedAt: Date,
		public readonly status: OrderProcessStatus,
		public readonly version: number,
	) {}

	confirm(reservationId: string): OrderProcess {
		if (this.status.kind !== "started") {
			throw new OrderProcessTransitionError(
				this.id.value,
				this.status.kind,
				"confirmed",
			);
		}

		return new OrderProcess(
			this.id,
			this.orderId,
			this.customerId,
			this.startedAt,
			{ kind: "confirmed", reservationId },
			this.version,
		);
	}

	compensate(reason: string): OrderProcess {
		if (this.status.kind !== "started") {
			throw new OrderProcessTransitionError(
				this.id.value,
				this.status.kind,
				"compensated",
			);
		}

		return new OrderProcess(
			this.id,
			this.orderId,
			this.customerId,
			this.startedAt,
			{ kind: "compensated", reason },
			this.version,
		);
	}

	isTerminal(): boolean {
		return this.status.kind !== "started";
	}
}
