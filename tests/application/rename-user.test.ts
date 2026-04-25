import { describe, expect, it } from "vitest";
import { RenameUser } from "#application/use-cases/rename-user.js";
import {
	InvalidUserNameError,
	UserNotFoundError,
} from "#domain/user/errors.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";
import { CapturingEventPublisher, FixedClock } from "#tests/support/fakes.js";
import { aUser } from "#tests/user/builders/user-builder.js";

describe("RenameUser", () => {
	it("updates the name, persists the user, and publishes UserRenamed", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(aUser().withId("u-1").withName("Alice").build());
		const events = new CapturingEventPublisher();

		const result = await new RenameUser(
			repo,
			new FixedClock(new Date("2026-02-01T00:00:00Z")),
			events,
		).execute({ id: "u-1", newName: "Alicia" });

		expect(result.name).toBe("Alicia");
		expect(events.published.map((e) => e.name)).toStrictEqual(["UserRenamed"]);
	});

	it("rejects unknown users", async () => {
		const repo = new InMemoryUserRepository();
		await expect(
			new RenameUser(
				repo,
				new FixedClock(new Date()),
				new CapturingEventPublisher(),
			).execute({ id: "missing", newName: "x" }),
		).rejects.toBeInstanceOf(UserNotFoundError);
	});

	it("rejects invalid names at the VO factory", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(aUser().withId("u-1").build());
		await expect(
			new RenameUser(
				repo,
				new FixedClock(new Date()),
				new CapturingEventPublisher(),
			).execute({ id: "u-1", newName: "" }),
		).rejects.toBeInstanceOf(InvalidUserNameError);
	});
});
