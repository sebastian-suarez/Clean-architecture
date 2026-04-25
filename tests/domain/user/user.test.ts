import { describe, expect, it } from "vitest";
import {
	UserAlreadyActiveError,
	UserAlreadyDeactivatedError,
} from "#domain/user/errors.js";
import { UserName } from "#domain/user/user-name.js";
import { aUser } from "#tests/user/builders/user-builder.js";

describe("User entity", () => {
	describe("create", () => {
		it("emits a UserRegistered event", () => {
			const user = aUser().buildNew();
			expect(user.events).toHaveLength(1);
			expect(user.events[0]?.name).toBe("UserRegistered");
		});

		it("starts in 'active' status with version 0", () => {
			const user = aUser().buildNew();
			expect(user.status).toBe("active");
			expect(user.version).toBe(0);
		});
	});

	describe("reconstruct", () => {
		it("does NOT emit a UserRegistered event (hydration path)", () => {
			const user = aUser().build();
			expect(user.events).toHaveLength(0);
		});
	});

	describe("rename", () => {
		it("returns a new instance with the new name + UserRenamed event", () => {
			const user = aUser().withName("Alice").build();
			const renamed = user.rename(UserName.create("Bob"), new Date());

			expect(renamed).not.toBe(user);
			expect(renamed.name.value).toBe("Bob");
			expect(renamed.events.map((e) => e.name)).toStrictEqual(["UserRenamed"]);
		});

		it("is a no-op when the new name equals the old name (no event)", () => {
			const user = aUser().withName("Alice").build();
			const renamed = user.rename(UserName.create("Alice"), new Date());
			expect(renamed).toBe(user);
		});
	});

	describe("deactivate", () => {
		it("flips status to 'deactivated' and emits UserDeactivated", () => {
			const user = aUser().withStatus("active").build();
			const deactivated = user.deactivate("spam", new Date());

			expect(deactivated.status).toBe("deactivated");
			expect(deactivated.events.map((e) => e.name)).toStrictEqual([
				"UserDeactivated",
			]);
		});

		it("rejects deactivating an already-deactivated user", () => {
			const user = aUser().withStatus("deactivated").build();
			expect(() => user.deactivate("again", new Date())).toThrow(
				UserAlreadyDeactivatedError,
			);
		});
	});

	describe("reactivate", () => {
		it("flips status back to 'active' and emits UserReactivated", () => {
			const user = aUser().withStatus("deactivated").build();
			const reactivated = user.reactivate(new Date());
			expect(reactivated.status).toBe("active");
			expect(reactivated.events.map((e) => e.name)).toStrictEqual([
				"UserReactivated",
			]);
		});

		it("rejects reactivating an already-active user", () => {
			const user = aUser().withStatus("active").build();
			expect(() => user.reactivate(new Date())).toThrow(UserAlreadyActiveError);
		});
	});
});
