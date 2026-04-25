import {
	type RateLimitDecision,
	type RateLimiter,
} from "#application/ports/output/rate-limiter.js";

type Window = {
	count: number;
	resetAt: number;
};

// Fixed-window rate limiter — simplest possible scheme.
// Production would use a token bucket or sliding log; the port stays
// the same.
export class InMemoryRateLimiter implements RateLimiter {
	private readonly windows = new Map<string, Window>();

	constructor(
		private readonly limit: number,
		private readonly windowMs: number,
	) {}

	async check(key: string): Promise<RateLimitDecision> {
		const now = Date.now();
		const window = this.windows.get(key);

		if (!window || window.resetAt <= now) {
			this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
			return { allowed: true, remaining: this.limit - 1 };
		}

		if (window.count >= this.limit) {
			return { allowed: false, retryAfterMs: window.resetAt - now };
		}

		window.count += 1;
		return { allowed: true, remaining: this.limit - window.count };
	}
}
