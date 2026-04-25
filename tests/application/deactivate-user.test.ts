import { describe, expect, it } from "vitest";
import { DeactivateUser } from "#application/use-cases/deactivate-user.js";
import { UserAlreadyDeactivatedError } from "#domain/user/errors.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";
import { CapturingEventPublisher, FixedClock } from "#tests/support/fakes.js";
import { aUser } from "#tests/user/builders/user-builder.js";

describe("DeactivateUser", () => {
	it("flips the user to deactivated and publishes UserDeactivated", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(aUser().withId("u-1").withStatus("active").build());
		const events = new CapturingEventPublisher();

		const dto = await new DeactivateUser(
			repo,
			new FixedClock(new Date()),
			events,
		).execute({ id: "u-1", reason: "spam" });

		expect(dto.status).toBe("deactivated");
		expect(events.published.map((e) => e.name)).toStrictEqual([
			"UserDeactivated",
		]);
	});

	it("rejects deactivating an already-deactivated user", async () => {
		const repo = new InMemoryUserRepository();
		await repo.save(aUser().withId("u-1").withStatus("deactivated").build());
		await expect(
			new DeactivateUser(
				repo,
				new FixedClock(new Date()),
				new CapturingEventPublisher(),
			).execute({ id: "u-1", reason: "x" }),
		).rejects.toBeInstanceOf(UserAlreadyDeactivatedError);
	});
});
