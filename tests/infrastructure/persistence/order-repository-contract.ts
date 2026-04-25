import { describe, expect, it } from "vitest";
import { type OrderRepository } from "#application/ports/output/order-repository.js";
import { CustomerId } from "#domain/order/customer-id.js";
import { OrderId } from "#domain/order/order-id.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";
import { anOrder } from "#tests/order/builders/order-builder.js";

export function runOrderRepositoryContract(
	makeRepo: () => Promise<OrderRepository> | OrderRepository,
): void {
	describe("OrderRepository contract", () => {
		it("round-trips an order", async () => {
			const repo = await makeRepo();
			await repo.save(anOrder().withId("o-1").buildNew());
			const loaded = await repo.findById(OrderId.create("o-1"));
			expect(loaded?.id.value).toBe("o-1");
		});

		it("returns undefined for a missing id", async () => {
			const repo = await makeRepo();
			expect(await repo.findById(OrderId.create("missing"))).toBeUndefined();
		});

		it("findByCustomer paginates and exposes nextCursor", async () => {
			const repo = await makeRepo();
			for (let i = 1; i <= 5; i += 1) {
				await repo.save(
					anOrder()
						.withId(`o-${i}`)
						.withCustomerId("user-1")
						.withPlacedAt(new Date(`2026-01-0${i}T00:00:00Z`))
						.buildNew(),
				);
			}

			const page1 = await repo.findByCustomer(CustomerId.create("user-1"), {
				limit: 2,
			});
			expect(page1.items).toHaveLength(2);
			expect(page1.nextCursor).toBeDefined();

			const page2 = await repo.findByCustomer(CustomerId.create("user-1"), {
				limit: 2,
				cursor: page1.nextCursor,
			});
			expect(page2.items).toHaveLength(2);

			const page3 = await repo.findByCustomer(CustomerId.create("user-1"), {
				limit: 2,
				cursor: page2.nextCursor,
			});
			expect(page3.items).toHaveLength(1);
			expect(page3.nextCursor).toBeUndefined();
		});

		it("rejects stale writes with ConcurrencyError", async () => {
			const repo = await makeRepo();
			await repo.save(anOrder().withId("o-1").buildNew());
			const a = await repo.findById(OrderId.create("o-1"));
			const b = await repo.findById(OrderId.create("o-1"));
			const cancA = a!.cancel("a", new Date());
			const cancB = b!.cancel("b", new Date());
			await repo.save(cancA);
			await expect(repo.save(cancB)).rejects.toBeInstanceOf(ConcurrencyError);
		});
	});
}
