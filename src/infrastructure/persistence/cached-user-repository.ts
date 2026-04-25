import { type Cache } from "#application/ports/output/cache.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { type Email } from "#domain/user/email.js";
import { type UserId } from "#domain/user/user-id.js";
import { type User } from "#domain/user/user.js";

const TTL_MS = 60_000;

// Adapter-level decorator (§5.1, §6.9). Wraps another UserRepository
// with read-through caching. Writes invalidate the cache key — the
// cache adapter never guesses what's stale (§6.9).
export class CachedUserRepository implements UserRepository {
	constructor(
		private readonly inner: UserRepository,
		private readonly cache: Cache<User>,
	) {}

	async findById(id: UserId): Promise<User | undefined> {
		const key = `user:${id.value}`;
		const cached = await this.cache.get(key);
		if (cached) return cached;

		const user = await this.inner.findById(id);
		if (user) await this.cache.set(key, user, TTL_MS);
		return user;
	}

	async findByEmail(email: Email): Promise<User | undefined> {
		return this.inner.findByEmail(email);
	}

	async findAll(): Promise<readonly User[]> {
		return this.inner.findAll();
	}

	async save(user: User): Promise<void> {
		await this.inner.save(user);
		await this.cache.invalidate(`user:${user.id.value}`);
	}
}
