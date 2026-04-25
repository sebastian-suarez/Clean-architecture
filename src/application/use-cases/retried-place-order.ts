import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";

export type RetryConfig = {
	readonly attempts: number;
	readonly baseDelayMs: number;
};

// Retry decorator (§6.8). Only retries on transient errors —
// `ConcurrencyError` here. Domain errors (`INVALID_*`, `FORBIDDEN`) are
// rethrown immediately; retrying them would just fail again.
export class RetriedPlaceOrder implements PlaceOrderUseCase {
	constructor(
		private readonly inner: PlaceOrderUseCase,
		private readonly config: RetryConfig,
	) {}

	async execute(
		input: PlaceOrderInput,
		output: PlaceOrderOutput,
	): Promise<void> {
		let lastError: unknown;
		for (let attempt = 0; attempt < this.config.attempts; attempt += 1) {
			try {
				await this.inner.execute(input, output);
				return;
			} catch (error) {
				lastError = error;
				if (!isTransient(error)) throw error;
				if (attempt < this.config.attempts - 1) {
					const delay = this.config.baseDelayMs * 2 ** attempt;
					await sleep(delay);
				}
			}
		}

		throw lastError;
	}
}

function isTransient(error: unknown): boolean {
	return error instanceof ConcurrencyError;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
