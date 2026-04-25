export type RateLimitDecision =
	| { readonly allowed: true; readonly remaining: number }
	| { readonly allowed: false; readonly retryAfterMs: number };

// Rate-limiter port (§6.9). Used as a decorator on commands or at the
// presentation boundary.
export type RateLimiter = {
	check(key: string): Promise<RateLimitDecision>;
};
