import { describe, expect, it } from "vitest";
import { ListUsers } from "#application/use-cases/list-users.js";
import { Email } from "#domain/user/email.js";
import { User } from "#domain/user/user.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";

describe("ListUsers", () => {
	it("returns a UserDto for every stored user", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(
			User.create({
				id: "1",
				name: "A",
				email: Email.create("a@b.co"),
				createdAt: new Date("2026-01-01T00:00:00Z"),
			}),
		);
		await repo.save(
			User.create({
				id: "2",
				name: "B",
				email: Email.create("b@c.co"),
				createdAt: new Date("2026-01-02T00:00:00Z"),
			}),
		);

		const users = await new ListUsers(repo).execute();
		const sorted = [...users].sort((a, b) => a.id.localeCompare(b.id));
		expect(sorted).toStrictEqual([
			{
				id: "1",
				name: "A",
				email: "a@b.co",
				createdAt: "2026-01-01T00:00:00.000Z",
			},
			{
				id: "2",
				name: "B",
				email: "b@c.co",
				createdAt: "2026-01-02T00:00:00.000Z",
			},
		]);
	});

	it("returns an empty list when no users exist", async () => {
		const users = await new ListUsers(new InMemoryUserRepository()).execute();
		expect(users).toStrictEqual([]);
	});
});
