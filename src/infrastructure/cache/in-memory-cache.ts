import { type Cache } from "#application/ports/output/cache.js";

type Entry<T> = {
	value: T;
	expiresAt: number;
};

export class InMemoryCache<T> implements Cache<T> {
	private readonly store = new Map<string, Entry<T>>();

	async get(key: string): Promise<T | undefined> {
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt < Date.now()) {
			this.store.delete(key);
			return undefined;
		}

		return entry.value;
	}

	async set(key: string, value: T, ttlMs: number): Promise<void> {
		this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
	}

	async invalidate(key: string): Promise<void> {
		this.store.delete(key);
	}
}
