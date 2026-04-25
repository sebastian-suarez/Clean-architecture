import { afterEach, describe, expect, it, vi } from "vitest";
import { type UserDto } from "#application/dtos/user-dto.js";
import { listUsersCommand } from "#presentation/cli/commands/list-users.js";

const sample: UserDto = {
	id: "1",
	name: "A",
	email: "a@b.co",
	status: "active",
	createdAt: "2026-01-01T00:00:00.000Z",
	version: 0,
};

describe("listUsersCommand", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("prints '(no users)' when the use case returns an empty list", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await listUsersCommand([], {
			listUsers: {
				async execute() {
					return [];
				},
			},
		});
		expect(log).toHaveBeenCalledTimes(1);
		expect(log).toHaveBeenCalledWith("(no users)");
	});

	it("prints one tab-separated line per user", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		await listUsersCommand([], {
			listUsers: {
				async execute() {
					return [sample, { ...sample, id: "2", name: "B", email: "b@c.co" }];
				},
			},
		});

		expect(log).toHaveBeenCalledTimes(2);
		expect(log).toHaveBeenNthCalledWith(1, "1\ta@b.co\tA");
		expect(log).toHaveBeenNthCalledWith(2, "2\tb@c.co\tB");
	});
});
