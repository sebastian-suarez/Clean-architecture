import { afterEach, describe, expect, it, vi } from "vitest";
import { type CreateUserUseCase } from "#application/ports/input/create-user-use-case.js";
import { createUserCommand } from "#presentation/cli/commands/create-user.js";

const sampleDto = {
	id: "u-1",
	name: "Alice",
	email: "alice@example.com",
	createdAt: "2026-01-01T00:00:00.000Z",
};

describe("createUserCommand", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("invokes the use case with parsed flags and prints id + email", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const execute = vi.fn(async () => sampleDto);
		const fake: CreateUserUseCase = { execute };

		await createUserCommand(
			["--name", "Alice", "--email", "alice@example.com"],
			{ createUser: fake },
		);

		expect(execute).toHaveBeenCalledWith({
			name: "Alice",
			email: "alice@example.com",
		});
		expect(log).toHaveBeenCalledWith("Created user u-1 (alice@example.com)");
	});

	it("supports short flags (-n, -e)", async () => {
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		const execute = vi.fn(async () => sampleDto);

		await createUserCommand(["-n", "Alice", "-e", "alice@example.com"], {
			createUser: { execute },
		});

		expect(execute).toHaveBeenCalledWith({
			name: "Alice",
			email: "alice@example.com",
		});
	});

	it("throws when --name is missing without calling the use case", async () => {
		const execute = vi.fn();
		await expect(
			createUserCommand(["--email", "x@y.co"], { createUser: { execute } }),
		).rejects.toThrow(/--name/);
		expect(execute).not.toHaveBeenCalled();
	});
});
