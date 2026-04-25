import { afterEach, describe, expect, it, vi } from "vitest";
import { getUserCommand } from "#presentation/cli/commands/get-user.js";

const sampleDto = {
	id: "u-1",
	name: "Alice",
	email: "alice@example.com",
	createdAt: "2026-01-01T00:00:00.000Z",
};

describe("getUserCommand", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("invokes the use case with the positional id and prints the DTO as JSON", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const execute = vi.fn(async () => sampleDto);

		await getUserCommand(["u-1"], { getUser: { execute } });

		expect(execute).toHaveBeenCalledWith("u-1");
		expect(log).toHaveBeenCalledWith(JSON.stringify(sampleDto, undefined, 2));
	});

	it("throws when no id is provided without calling the use case", async () => {
		const execute = vi.fn();
		await expect(getUserCommand([], { getUser: { execute } })).rejects.toThrow(
			/positional/,
		);
		expect(execute).not.toHaveBeenCalled();
	});
});
