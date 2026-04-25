import { describe, expect, it } from "vitest";
import { Money } from "#domain/order/money.js";
import { ExpensiveOrderSpec } from "#domain/order/specifications/expensive-order-spec.js";
import { aLineItem, anOrder } from "#tests/order/builders/order-builder.js";

describe("ExpensiveOrderSpec", () => {
	const spec = new ExpensiveOrderSpec(Money.create(50, "USD"));

	it("matches orders whose total exceeds the threshold", () => {
		const order = anOrder()
			.withItems([aLineItem().withQuantity(10).withUnitPrice(10).build()])
			.buildNew();
		expect(spec.isSatisfiedBy(order)).toBe(true);
	});

	it("rejects orders below the threshold", () => {
		const order = anOrder()
			.withItems([aLineItem().withQuantity(2).withUnitPrice(10).build()])
			.buildNew();
		expect(spec.isSatisfiedBy(order)).toBe(false);
	});
});
