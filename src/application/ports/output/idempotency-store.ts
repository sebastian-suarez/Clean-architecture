// Idempotency-key dedupe port (§4.4). The decorator checks
// `remember(key, ttlMs)` — if the key was seen, returns the cached
// result; otherwise stores it for `ttlMs` and returns undefined.
export type IdempotencyStore = {
	remember<T>(
		key: string,
		ttlMs: number,
		produce: () => Promise<T>,
	): Promise<T>;
};
