import { describe, expect, it } from "vitest";
import { ListUsers } from "#application/use-cases/list-users.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";
import { aUser } from "#tests/user/builders/user-builder.js";

describe("ListUsers", () => {
	it("returns a UserDto for every stored user", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(
			aUser().withId("1").withName("A").withEmail("a@b.co").build(),
		);
		await repo.save(
			aUser().withId("2").withName("B").withEmail("b@c.co").build(),
		);

		const users = await new ListUsers(repo).execute();
		const sorted = [...users].sort((a, b) => a.id.localeCompare(b.id));
		expect(sorted.map((u) => u.id)).toStrictEqual(["1", "2"]);
		expect(sorted[0]).toMatchObject({
			id: "1",
			name: "A",
			email: "a@b.co",
			status: "active",
		});
	});

	it("returns an empty list when no users exist", async () => {
		const users = await new ListUsers(new InMemoryUserRepository()).execute();
		expect(users).toStrictEqual([]);
	});
});
