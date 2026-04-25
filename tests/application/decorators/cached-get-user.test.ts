import { describe, expect, it, vi } from "vitest";
import { type UserDto } from "#application/dtos/user-dto.js";
import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";
import { CachedGetUser } from "#application/use-cases/cached-get-user.js";
import { InMemoryCache } from "#infrastructure/cache/in-memory-cache.js";

const sample: UserDto = {
	id: "u-1",
	name: "Alice",
	email: "a@b.co",
	status: "active",
	createdAt: "2026-01-01T00:00:00.000Z",
	version: 0,
};

describe("CachedGetUser", () => {
	it("calls the inner only on cache miss, then serves from cache", async () => {
		const inner = vi.fn(async () => sample);
		const useCase: GetUserUseCase = { execute: inner };
		const cached = new CachedGetUser(useCase, new InMemoryCache<UserDto>());

		const a = await cached.execute("u-1");
		const b = await cached.execute("u-1");

		expect(a).toStrictEqual(sample);
		expect(b).toStrictEqual(sample);
		expect(inner).toHaveBeenCalledTimes(1);
	});

	it("treats different ids as different cache entries", async () => {
		const inner = vi.fn(async (id: string) => ({ ...sample, id }));
		const cached = new CachedGetUser(
			{ execute: inner },
			new InMemoryCache<UserDto>(),
		);

		await cached.execute("u-1");
		await cached.execute("u-2");

		expect(inner).toHaveBeenCalledTimes(2);
	});
});
