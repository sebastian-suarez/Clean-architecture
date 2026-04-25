import { type UserDto } from "#application/dtos/user-dto.js";
import {
	type CreateUserInput,
	type CreateUserUseCase,
} from "#application/ports/input/create-user-use-case.js";
import { type RateLimiter } from "#application/ports/output/rate-limiter.js";
import { DomainError } from "#domain/shared/domain-error.js";

class RateLimitExceededError extends DomainError {
	get code(): string {
		return "RATE_LIMIT_EXCEEDED";
	}

	constructor(public readonly retryAfterMs: number) {
		super(`Rate limit exceeded; retry after ${retryAfterMs}ms`);
	}
}

export class RateLimitedCreateUser implements CreateUserUseCase {
	constructor(
		private readonly inner: CreateUserUseCase,
		private readonly limiter: RateLimiter,
	) {}

	async execute(input: CreateUserInput): Promise<UserDto> {
		const decision = await this.limiter.check(`create-user:${input.email}`);
		if (!decision.allowed) {
			throw new RateLimitExceededError(decision.retryAfterMs);
		}

		return this.inner.execute(input);
	}
}
