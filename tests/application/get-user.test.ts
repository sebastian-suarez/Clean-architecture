import { describe, expect, it } from "vitest";
import { GetUser } from "#application/use-cases/get-user.js";
import { Email } from "#domain/user/email.js";
import { UserNotFoundError } from "#domain/user/errors.js";
import { User } from "#domain/user/user.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";

describe("GetUser", () => {
	it("returns a UserDto when found", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(
			User.create({
				id: "u1",
				name: "Alice",
				email: Email.create("alice@example.com"),
				createdAt: new Date("2026-01-01T00:00:00Z"),
			}),
		);

		const user = await new GetUser(repo).execute("u1");
		expect(user).toStrictEqual({
			id: "u1",
			name: "Alice",
			email: "alice@example.com",
			createdAt: "2026-01-01T00:00:00.000Z",
		});
	});

	it("throws UserNotFoundError when missing", async () => {
		const repo = new InMemoryUserRepository();
		await expect(new GetUser(repo).execute("missing")).rejects.toBeInstanceOf(
			UserNotFoundError,
		);
	});
});
