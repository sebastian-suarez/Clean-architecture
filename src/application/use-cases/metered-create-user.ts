import { type UserDto } from "#application/dtos/user-dto.js";
import {
	type CreateUserInput,
	type CreateUserUseCase,
} from "#application/ports/input/create-user-use-case.js";
import { type Metrics } from "#application/ports/output/metrics.js";

// Metrics decorator (§6.7). Counts attempts, successes, and failures.
export class MeteredCreateUser implements CreateUserUseCase {
	constructor(
		private readonly inner: CreateUserUseCase,
		private readonly metrics: Metrics,
	) {}

	async execute(input: CreateUserInput): Promise<UserDto> {
		const start = performance.now();
		this.metrics.counter("create_user.attempts");
		try {
			const result = await this.inner.execute(input);
			this.metrics.counter("create_user.ok");
			this.metrics.histogram(
				"create_user.duration_ms",
				performance.now() - start,
			);
			return result;
		} catch (error) {
			this.metrics.counter("create_user.fail");
			throw error;
		}
	}
}
