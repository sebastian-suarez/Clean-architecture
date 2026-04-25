import { describe, expect, it } from "vitest";
import { Email } from "#domain/user/email.js";
import { InvalidEmailError } from "#domain/user/errors.js";

describe("Email", () => {
	it("normalizes valid emails to trimmed lowercase", () => {
		const email = Email.create("  Alice@Example.com  ");
		expect(email.value).toBe("alice@example.com");
	});

	it("rejects malformed emails", () => {
		expect(() => Email.create("not-an-email")).toThrow(InvalidEmailError);
	});

	it("compares emails by normalized value", () => {
		expect(Email.create("a@b.co").equals(Email.create("A@B.CO"))).toBe(true);
	});
});
