import { describe, expect, it } from "vitest";
import { CustomerId } from "#domain/order/customer-id.js";
import { InProcessCustomerLookup } from "#infrastructure/customer/in-process-customer-lookup.js";
import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";
import { aUser } from "#tests/user/builders/user-builder.js";

describe("InProcessCustomerLookup (ACL)", () => {
	it("translates a User aggregate into a CustomerSummaryDto", async () => {
		const users = new InMemoryUserRepository();
		await users.save(
			aUser()
				.withId("user-1")
				.withName("Alice")
				.withEmail("a@b.co")
				.withStatus("active")
				.build(),
		);

		const lookup = new InProcessCustomerLookup(users);
		const summary = await lookup.find(CustomerId.create("user-1"));

		// Note: the published-language DTO does NOT carry the user's email
		// — the Order context only needs id + displayName + status.
		expect(summary).toStrictEqual({
			id: "user-1",
			displayName: "Alice",
			status: "active",
		});
	});

	it("returns undefined when the foreign aggregate is missing", async () => {
		const lookup = new InProcessCustomerLookup(new InMemoryUserRepository());
		expect(await lookup.find(CustomerId.create("missing"))).toBeUndefined();
	});
});
