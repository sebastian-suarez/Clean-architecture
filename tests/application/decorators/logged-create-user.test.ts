import { describe, expect, it } from "vitest";
import { LoggedCreateUser } from "#application/use-cases/logged-create-user.js";
import { type UserDto } from "#application/dtos/user-dto.js";
import { InvalidEmailError } from "#domain/user/errors.js";
import { InMemoryLogger } from "#infrastructure/logging/in-memory-logger.js";

const sampleDto: UserDto = {
	id: "u-1",
	name: "Alice",
	email: "alice@example.com",
	status: "active",
	createdAt: "2026-01-01T00:00:00.000Z",
	version: 0,
};

describe("LoggedCreateUser", () => {
	it("logs start and ok on success", async () => {
		const logger = new InMemoryLogger();
		const decorated = new LoggedCreateUser(
			{
				async execute() {
					return sampleDto;
				},
			},
			logger,
		);

		await decorated.execute({ name: "Alice", email: "alice@example.com" });

		expect(logger.entries.map((e) => e.event)).toStrictEqual([
			"create_user.start",
			"create_user.ok",
		]);
	});

	it("logs start and fail when the inner throws, and rethrows", async () => {
		const logger = new InMemoryLogger();
		const decorated = new LoggedCreateUser(
			{
				async execute() {
					throw new InvalidEmailError("nope");
				},
			},
			logger,
		);

		await expect(
			decorated.execute({ name: "x", email: "nope" }),
		).rejects.toBeInstanceOf(InvalidEmailError);

		expect(logger.entries.map((e) => e.event)).toStrictEqual([
			"create_user.start",
			"create_user.fail",
		]);
	});
});
