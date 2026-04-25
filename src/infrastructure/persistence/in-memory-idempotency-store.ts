import { type IdempotencyStore } from "#application/ports/output/idempotency-store.js";

type Entry = {
	value: unknown;
	expiresAt: number;
};

export class InMemoryIdempotencyStore implements IdempotencyStore {
	private readonly store = new Map<string, Entry>();
	private readonly inFlight = new Map<string, Promise<unknown>>();

	async remember<T>(
		key: string,
		ttlMs: number,
		produce: () => Promise<T>,
	): Promise<T> {
		const existing = this.store.get(key);
		if (existing && existing.expiresAt > Date.now()) {
			return existing.value as T;
		}

		const inFlight = this.inFlight.get(key);
		if (inFlight) return inFlight as Promise<T>;

		const promise = produce();
		this.inFlight.set(key, promise);
		try {
			const value = await promise;
			this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
			return value;
		} finally {
			this.inFlight.delete(key);
		}
	}
}
