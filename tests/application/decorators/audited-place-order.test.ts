import { describe, expect, it } from "vitest";
import { type OrderDto } from "#application/dtos/order-dto.js";
import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { AuditedPlaceOrder } from "#application/use-cases/audited-place-order.js";
import { InMemoryAuditLog } from "#infrastructure/audit/in-memory-audit-log.js";
import { FixedClock } from "#tests/support/fakes.js";

const sampleOrder: OrderDto = {
	id: "o-1",
	customerId: "user-1",
	placedAt: "2026-01-01T00:00:00.000Z",
	items: [],
	totalAmount: 0,
	currency: "USD",
	status: { kind: "placed" },
	version: 0,
};

const baseInput: PlaceOrderInput = {
	principal: { id: "user-1", roles: ["customer"] },
	customerId: "user-1",
	items: [{ sku: "X", quantity: 1, unitPrice: 1, currency: "USD" }],
	idempotencyKey: "k1",
};

describe("AuditedPlaceOrder", () => {
	it("records 'ok' on successful placement", async () => {
		const audit = new InMemoryAuditLog();
		const inner: PlaceOrderUseCase = {
			async execute(_input, out) {
				out.placed(sampleOrder);
			},
		};

		const decorated = new AuditedPlaceOrder(
			inner,
			audit,
			new FixedClock(new Date("2026-01-01T00:00:00Z")),
		);

		const captured: PlaceOrderOutput = {
			placed() {},
			customerNotFound() {},
			customerInactive() {},
		};
		await decorated.execute(baseInput, captured);

		// Allow microtasks queued by `void` to settle.
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});

		expect(audit.entries).toHaveLength(1);
		expect(audit.entries[0]).toMatchObject({
			principalId: "user-1",
			action: "place_order",
			outcome: "ok",
			targetId: "o-1",
		});
	});

	it("records 'fail' when the inner throws", async () => {
		const audit = new InMemoryAuditLog();
		const inner: PlaceOrderUseCase = {
			async execute() {
				throw new Error("boom");
			},
		};

		const decorated = new AuditedPlaceOrder(
			inner,
			audit,
			new FixedClock(new Date("2026-01-01T00:00:00Z")),
		);

		const noop: PlaceOrderOutput = {
			placed() {},
			customerNotFound() {},
			customerInactive() {},
		};
		await expect(decorated.execute(baseInput, noop)).rejects.toThrow("boom");

		expect(audit.entries).toHaveLength(1);
		expect(audit.entries[0]?.outcome).toBe("fail");
	});
});
