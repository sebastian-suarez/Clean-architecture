import { describe, expect, it } from "vitest";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";
import { Email } from "#domain/user/email.js";
import { UserId } from "#domain/user/user-id.js";
import { UserName } from "#domain/user/user-name.js";
import { aUser } from "#tests/user/builders/user-builder.js";

// Contract test (§10.4) — every UserRepository adapter must satisfy
// this suite. Each adapter's test file calls `runUserRepositoryContract`
// with its own factory.
export function runUserRepositoryContract(
	makeRepo: () => Promise<UserRepository> | UserRepository,
): void {
	describe("UserRepository contract", () => {
		it("round-trips an entity (save + findById)", async () => {
			const repo = await makeRepo();
			const user = aUser().withId("u-1").withName("Alice").buildNew();
			await repo.save(user);

			const loaded = await repo.findById(UserId.create("u-1"));
			expect(loaded?.id.value).toBe("u-1");
			expect(loaded?.name.value).toBe("Alice");
		});

		it("returns undefined for a missing id (no throw)", async () => {
			const repo = await makeRepo();
			expect(await repo.findById(UserId.create("missing"))).toBeUndefined();
		});

		it("upserts: re-saving the same id replaces, doesn't duplicate", async () => {
			const repo = await makeRepo();
			await repo.save(aUser().withId("u-1").withName("Alice").buildNew());
			const first = await repo.findById(UserId.create("u-1"));
			const renamed = first!.rename(UserName.create("Bob"), new Date());
			await repo.save(renamed);

			const all = await repo.findAll();
			expect(all.filter((u) => u.id.value === "u-1")).toHaveLength(1);
			expect(all.find((u) => u.id.value === "u-1")?.name.value).toBe("Bob");
		});

		it("findByEmail returns undefined for unknown email", async () => {
			const repo = await makeRepo();
			expect(await repo.findByEmail(Email.create("nope@x.io"))).toBeUndefined();
		});

		it("findByEmail finds a stored user case-insensitively", async () => {
			const repo = await makeRepo();
			await repo.save(aUser().withEmail("alice@example.com").buildNew());
			const found = await repo.findByEmail(Email.create("ALICE@EXAMPLE.COM"));
			expect(found?.email.value).toBe("alice@example.com");
		});

		it("rejects stale writes with ConcurrencyError", async () => {
			const repo = await makeRepo();
			await repo.save(aUser().withId("u-1").buildNew());
			const a = await repo.findById(UserId.create("u-1"));
			const b = await repo.findById(UserId.create("u-1"));
			// Two concurrent renames — both load version N, only one save wins.
			const renamedA = a!.rename(UserName.create("A"), new Date());
			const renamedB = b!.rename(UserName.create("B"), new Date());
			await repo.save(renamedA);
			await expect(repo.save(renamedB)).rejects.toBeInstanceOf(
				ConcurrencyError,
			);
		});
	});
}
