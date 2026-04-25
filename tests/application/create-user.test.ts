import { beforeEach, describe, expect, it } from "vitest";
import { type Clock } from "#application/ports/output/clock.js";
import { type IdGenerator } from "#application/ports/output/id-generator.js";
import { CreateUser } from "#application/use-cases/create-user.js";
import {
	EmailAlreadyExistsError,
	InvalidEmailError,
} from "#domain/user/errors.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";

class SequentialIdGenerator implements IdGenerator {
	private counter = 0;

	next(): string {
		this.counter += 1;
		return `id-${this.counter}`;
	}
}

class FixedClock implements Clock {
	constructor(private readonly date: Date) {}

	now(): Date {
		return this.date;
	}
}

describe("CreateUser", () => {
	let repo: InMemoryUserRepository;
	let useCase: CreateUser;

	beforeEach(() => {
		repo = new InMemoryUserRepository();
		useCase = new CreateUser(
			repo,
			new SequentialIdGenerator(),
			new FixedClock(new Date("2026-01-01T00:00:00Z")),
		);
	});

	it("returns a UserDto with the generated id and configured clock", async () => {
		const user = await useCase.execute({
			name: "Alice",
			email: "alice@example.com",
		});

		expect(user).toStrictEqual({
			id: "id-1",
			name: "Alice",
			email: "alice@example.com",
			createdAt: "2026-01-01T00:00:00.000Z",
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
