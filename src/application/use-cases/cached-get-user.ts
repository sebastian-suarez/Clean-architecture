import { type UserDto } from "#application/dtos/user-dto.js";
import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";
import { type Cache } from "#application/ports/output/cache.js";

const TTL_MS = 60_000;

// Caches GetUser results for `TTL_MS`. The decorator OWNS the cache key
// shape; invalidation on writes is the responsibility of the writer
// (§6.9 — cache invalidation is never the cache adapter's job).
export class CachedGetUser implements GetUserUseCase {
	constructor(
		private readonly inner: GetUserUseCase,
		private readonly cache: Cache<UserDto>,
	) {}

	async execute(id: string): Promise<UserDto> {
		const key = `user:${id}`;
		const cached = await this.cache.get(key);
		if (cached) return cached;

		const result = await this.inner.execute(id);
		await this.cache.set(key, result, TTL_MS);
		return result;
	}
}
