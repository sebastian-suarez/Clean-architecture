import { beforeEach, describe, expect, it } from "vitest";
import { CreateUser } from "#application/use-cases/create-user.js";
import {
	EmailAlreadyExistsError,
	InvalidEmailError,
} from "#domain/user/errors.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";
import {
	CapturingEventPublisher,
	FixedClock,
	SequentialIdGenerator,
} from "#tests/support/fakes.js";

describe("CreateUser", () => {
	let repo: InMemoryUserRepository;
	let events: CapturingEventPublisher;
	let useCase: CreateUser;

	beforeEach(() => {
		repo = new InMemoryUserRepository();
		events = new CapturingEventPublisher();
		useCase = new CreateUser(
			repo,
			new SequentialIdGenerator("user"),
			new FixedClock(new Date("2026-01-01T00:00:00Z")),
			events,
		);
	});

	it("returns a UserDto with the generated id, status, and version", async () => {
		const user = await useCase.execute({
			name: "Alice",
			email: "alice@example.com",
		});

		expect(user).toStrictEqual({
			id: "user-1",
			name: "Alice",
			email: "alice@example.com",
			status: "active",
			createdAt: "2026-01-01T00:00:00.000Z",
			version: 0,
		});
	});

	it("publishes a UserRegistered event", async () => {
		await useCase.execute({ name: "Alice", email: "alice@example.com" });

		expect(events.published).toHaveLength(1);
		expect(events.published[0]).toMatchObject({
			name: "UserRegistered",
			aggregateId: "user-1",
			email: "alice@example.com",
			occurredAt: "2026-01-01T00:00:00.000Z",
		});
	});

	it("rejects invalid emails", async () => {
		await expect(
			useCase.execute({ name: "Alice", email: "nope" }),
		).rejects.toBeInstanceOf(InvalidEmailError);
	});

	it("rejects duplicate emails (case-insensitive)", async () => {
		await useCase.execute({ name: "Alice", email: "alice@example.com" });
		await expect(
			useCase.execute({ name: "Alice2", email: "ALICE@example.com" }),
		).rejects.toBeInstanceOf(EmailAlreadyExistsError);
	});
});
