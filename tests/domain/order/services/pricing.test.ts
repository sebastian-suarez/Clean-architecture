import { describe, expect, it } from "vitest";
import { pricing } from "#domain/order/services/pricing.js";
import { aLineItem } from "#tests/order/builders/order-builder.js";

describe("pricing.applyBulkDiscount", () => {
	it("applies 10% discount when total quantity ≥ 10", () => {
		const items = [
			aLineItem().withSku("AAA").withQuantity(7).withUnitPrice(10).build(),
			aLineItem().withSku("BBB").withQuantity(5).withUnitPrice(10).build(),
		];

		const discounted = pricing.applyBulkDiscount(items);
		expect(discounted[0]?.unitPrice.amount).toBe(9);
		expect(discounted[1]?.unitPrice.amount).toBe(9);
	});

	it("returns the items unchanged below the threshold", () => {
		const items = [aLineItem().withQuantity(2).withUnitPrice(10).build()];
		expect(pricing.applyBulkDiscount(items)).toBe(items);
	});
});
