import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type Logger } from "#application/ports/output/logger.js";

export type HandlerOutcome = "placed" | "rejected";

// Queue handler — translates a queue message into an input-port call,
// captures the Output Boundary outcome, and reports back. Acts as the
// transport boundary for the queue delivery mechanism (§2.4).
export async function handlePlaceOrderMessage(
	input: PlaceOrderInput,
	deps: { placeOrder: PlaceOrderUseCase; logger: Logger },
): Promise<HandlerOutcome> {
	let outcome: HandlerOutcome = "rejected";

	await deps.placeOrder.execute(input, {
		placed(order) {
			outcome = "placed";
			deps.logger.info("queue.place_order.ok", { orderId: order.id });
		},
		customerNotFound(customerId) {
			deps.logger.warn("queue.place_order.customer_not_found", { customerId });
		},
		customerInactive(customerId) {
			deps.logger.warn("queue.place_order.customer_inactive", { customerId });
		},
	});

	return outcome;
}
