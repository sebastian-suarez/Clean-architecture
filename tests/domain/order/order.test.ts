import { describe, expect, it } from "vitest";
import {
	EmptyOrderError,
	OrderAlreadyCancelledError,
	OrderNotMutableError,
} from "#domain/order/errors.js";
import { Money } from "#domain/order/money.js";
import { aLineItem, anOrder } from "#tests/order/builders/order-builder.js";

describe("Order aggregate", () => {
	describe("create", () => {
		it("emits an OrderPlaced event", () => {
			const order = anOrder().buildNew();
			expect(order.events.map((e) => e.name)).toStrictEqual(["OrderPlaced"]);
		});

		it("rejects an order with no items (creation invariant)", () => {
			expect(() => anOrder().withItems([]).buildNew()).toThrow(EmptyOrderError);
		});

		it("computes total = sum of subtotals", () => {
			const order = anOrder()
				.withItems([
					aLineItem().withQuantity(2).withUnitPrice(10).build(),
					aLineItem()
						.withSku("BOOK-2")
						.withQuantity(3)
						.withUnitPrice(5)
						.build(),
				])
				.buildNew();

			expect(order.total().equals(Money.create(35, "USD"))).toBe(true);
		});
	});

	describe("addItem", () => {
		it("merges quantity when SKU already exists", () => {
			const order = anOrder()
				.withItems([aLineItem().withSku("BOOK-1").withQuantity(2).build()])
				.buildNew();

			const next = order.addItem(
				aLineItem().withSku("BOOK-1").withQuantity(3).build(),
				new Date(),
			);

			expect(next.items).toHaveLength(1);
			expect(next.items[0]?.quantity.value).toBe(5);
		});

		it("appends a new item when SKU is new", () => {
			const order = anOrder()
				.withItems([aLineItem().withSku("BOOK-1").build()])
				.buildNew();

			const next = order.addItem(
				aLineItem().withSku("BOOK-2").build(),
				new Date(),
			);

			expect(next.items).toHaveLength(2);
		});

		it("rejects modification when the order is cancelled", () => {
			const order = anOrder()
				.withStatus({
					kind: "cancelled",
					reason: "test",
					at: "2026-01-01T00:00:00.000Z",
				})
				.build();

			expect(() =>
				order.addItem(aLineItem().withSku("BOOK-2").build(), new Date()),
			).toThrow(OrderNotMutableError);
		});
	});

	describe("cancel", () => {
		it("flips status to cancelled and emits OrderCancelled", () => {
			const order = anOrder().buildNew();
			const cancelled = order.cancel("changed mind", new Date());
			expect(cancelled.status.kind).toBe("cancelled");
			expect(cancelled.events.map((e) => e.name)).toContain("OrderCancelled");
		});

		it("rejects double-cancellation", () => {
			const cancelled = anOrder().buildNew().cancel("once", new Date());
			expect(() => cancelled.cancel("twice", new Date())).toThrow(
				OrderAlreadyCancelledError,
			);
		});
	});
});
