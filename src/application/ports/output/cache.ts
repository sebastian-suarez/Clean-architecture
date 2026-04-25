// Generic cache port (§6.9). Wrap a repository with a `Cached…`
// decorator (§4.5). Invalidation is the caller's responsibility — the
// cache adapter never guesses what's stale.
export type Cache<T> = {
	get(key: string): Promise<T | undefined>;
	set(key: string, value: T, ttlMs: number): Promise<void>;
	invalidate(key: string): Promise<void>;
};
