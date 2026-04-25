import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type UserDto } from "#application/dtos/user-dto.js";
import { UserNotFoundError } from "#domain/user/errors.js";
import { type CliDeps, runCli } from "#presentation/cli/cli.js";

const sampleDto: UserDto = {
	id: "u-1",
	name: "A",
	email: "a@b.co",
	status: "active",
	createdAt: "2026-01-01T00:00:00.000Z",
	version: 0,
};

function makeDeps(overrides: Partial<CliDeps> = {}): CliDeps {
	return {
		createUser: {
			async execute() {
				return sampleDto;
			},
		},
		getUser: {
			async execute() {
				return sampleDto;
			},
		},
		listUsers: {
			async execute() {
				return [];
			},
		},
		renameUser: {
			async execute() {
				return sampleDto;
			},
		},
		deactivateUser: {
			async execute() {
				return sampleDto;
			},
		},
		placeOrder: { async execute() {} },
		cancelOrder: {
			async execute() {
				throw new Error("not implemented in fake");
			},
		},
		getOrder: {
			async execute() {
				throw new Error("not implemented in fake");
			},
		},
		listOrders: {
			async execute() {
				return { items: [], nextCursor: undefined };
			},
		},
		...overrides,
	};
}

describe("runCli", () => {
	let log: ReturnType<typeof vi.spyOn>;
	let error: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		error = vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("prints help and returns 0 with no args", async () => {
		const code = await runCli([], makeDeps());
		expect(code).toBe(0);
		const printed = JSON.stringify(log.mock.calls);
		expect(printed).toContain("Commands:");
		expect(printed).toContain("create-user");
		expect(printed).toContain("place-order");
	});

	it("returns 1 and prints help for unknown command", async () => {
		const code = await runCli(["bogus"], makeDeps());
		expect(code).toBe(1);
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining("Unknown command"),
		);
	});

	it("translates DomainError into '[code]: message' and returns 1", async () => {
		const code = await runCli(
			["get-user", "x"],
			makeDeps({
				getUser: {
					async execute() {
						throw new UserNotFoundError("x");
					},
				},
			}),
		);
		expect(code).toBe(1);
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining("[USER_NOT_FOUND]"),
		);
	});

	it("returns 0 when the command succeeds", async () => {
		const code = await runCli(["list-users"], makeDeps());
		expect(code).toBe(0);
		expect(log).toHaveBeenCalledWith("(no users)");
	});
});
