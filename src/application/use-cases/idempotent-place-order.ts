import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type IdempotencyStore } from "#application/ports/output/idempotency-store.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { type OrderDto } from "#application/dtos/order-dto.js";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

type Outcome =
	| { readonly kind: "placed"; readonly order: OrderDto }
	| { readonly kind: "customerNotFound"; readonly customerId: string }
	| { readonly kind: "customerInactive"; readonly customerId: string };

// Idempotency decorator (§4.4). Memoizes the outcome of a PlaceOrder
// call by `idempotencyKey` for `TTL_MS`. Replays the cached outcome to
// the output boundary on subsequent calls with the same key.
export class IdempotentPlaceOrder implements PlaceOrderUseCase {
	constructor(
		private readonly inner: PlaceOrderUseCase,
		private readonly store: IdempotencyStore,
	) {}

	async execute(
		input: PlaceOrderInput,
		output: PlaceOrderOutput,
	): Promise<void> {
		const outcome = await this.store.remember<Outcome>(
			`place-order:${input.idempotencyKey}`,
			TTL_MS,
			async () => this.runInner(input),
		);

		this.replay(outcome, output);
	}

	private async runInner(input: PlaceOrderInput): Promise<Outcome> {
		let outcome: Outcome | undefined;
		const capture: PlaceOrderOutput = {
			placed(order) {
				outcome = { kind: "placed", order };
			},
			customerNotFound(customerId) {
				outcome = { kind: "customerNotFound", customerId };
			},
			customerInactive(customerId) {
				outcome = { kind: "customerInactive", customerId };
			},
		};

		await this.inner.execute(input, capture);

		if (!outcome) {
			throw new Error("PlaceOrder did not invoke any output method");
		}

		return outcome;
	}

	private replay(outcome: Outcome, output: PlaceOrderOutput): void {
		switch (outcome.kind) {
			case "placed": {
				output.placed(outcome.order);
				return;
			}

			case "customerNotFound": {
				output.customerNotFound(outcome.customerId);
				return;
			}

			case "customerInactive": {
				output.customerInactive(outcome.customerId);
			}
		}
	}
}
