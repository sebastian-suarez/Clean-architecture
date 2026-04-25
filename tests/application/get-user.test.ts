import { describe, expect, it } from "vitest";
import { GetUser } from "#application/use-cases/get-user.js";
import { UserNotFoundError } from "#domain/user/errors.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";
import { aUser } from "#tests/user/builders/user-builder.js";

describe("GetUser", () => {
	it("returns a UserDto when found", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(
			aUser()
				.withId("u1")
				.withName("Alice")
				.withEmail("alice@example.com")
				.withCreatedAt(new Date("2026-01-01T00:00:00Z"))
				.build(),
		);

		const user = await new GetUser(repo).execute("u1");
		expect(user).toStrictEqual({
			id: "u1",
			name: "Alice",
			email: "alice@example.com",
			status: "active",
			createdAt: "2026-01-01T00:00:00.000Z",
			version: 1,
		});
	});

	it("throws UserNotFoundError when missing", async () => {
		const repo = new InMemoryUserRepository();
		await expect(new GetUser(repo).execute("missing")).rejects.toBeInstanceOf(
			UserNotFoundError,
		);
	});
});
