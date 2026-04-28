import { describe, expect, it } from "vitest";
import { ListOrderSummaries } from "#application/use-cases/list-order-summaries.js";
import { type OrderSummaryDto } from "#application/dtos/order-summary-dto.js";
import { InMemoryOrderSummaryReadModel } from "#infrastructure/persistence/in-memory-order-summary-read-model.js";

function summary(overrides: Partial<OrderSummaryDto> = {}): OrderSummaryDto {
	return {
		id: "o-1",
		customerId: "user-1",
		status: "placed",
		totalAmount: 10,
		currency: "USD",
		itemCount: 1,
		placedAt: "2026-01-01T00:00:00.000Z",
		lastActivityAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("ListOrderSummaries (CQRS query)", () => {
	it("returns summaries from the read model", async () => {
		const projection = new InMemoryOrderSummaryReadModel();
		await projection.upsert(summary({ id: "o-1" }));
		await projection.upsert(
			summary({ id: "o-2", placedAt: "2026-01-02T00:00:00.000Z" }),
		);
		const useCase = new ListOrderSummaries(projection);

		const page = await useCase.execute({ customerId: "user-1", limit: 10 });
		expect(page.items.map((i) => i.id)).toStrictEqual(["o-1", "o-2"]);
		expect(page.nextCursor).toBeUndefined();
	});

	it("paginates with a next cursor", async () => {
		const projection = new InMemoryOrderSummaryReadModel();
		for (let i = 0; i < 3; i++) {
			await projection.upsert(
				summary({
					id: `o-${i}`,
					placedAt: `2026-01-0${i + 1}T00:00:00.000Z`,
				}),
			);
		}

		const useCase = new ListOrderSummaries(projection);
		const first = await useCase.execute({ customerId: "user-1", limit: 2 });
		expect(first.items).toHaveLength(2);
		expect(first.nextCursor).toBe("2");

		const second = await useCase.execute({
			customerId: "user-1",
			limit: 2,
			cursor: first.nextCursor,
		});
		expect(second.items.map((i) => i.id)).toStrictEqual(["o-2"]);
		expect(second.nextCursor).toBeUndefined();
	});

	it("rejects an out-of-range limit", async () => {
		const useCase = new ListOrderSummaries(new InMemoryOrderSummaryReadModel());
		await expect(
			useCase.execute({ customerId: "user-1", limit: 0 }),
		).rejects.toThrow(/limit must be in 1..100/);
	});
});
