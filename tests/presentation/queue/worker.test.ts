import { describe, expect, it } from "vitest";
import { type PlaceOrderInput } from "#application/ports/input/place-order-use-case.js";
import { InMemoryLogger } from "#infrastructure/logging/in-memory-logger.js";
import { runWorker } from "#presentation/queue/worker.js";

const sampleInput: PlaceOrderInput = {
	principal: { id: "u1", roles: ["customer"] },
	customerId: "u1",
	items: [{ sku: "X", quantity: 1, unitPrice: 1, currency: "USD" }],
	idempotencyKey: "k1",
};

async function* asyncOf(...lines: string[]): AsyncIterable<string> {
	for (const line of lines) yield line;
}

describe("queue worker", () => {
	it("returns 0 when all messages process successfully", async () => {
		const logger = new InMemoryLogger();
		const code = await runWorker(
			asyncOf(JSON.stringify({ kind: "place-order", input: sampleInput })),
			{
				placeOrder: {
					async execute(_input, out) {
						out.placed({
							id: "o-1",
							customerId: "u1",
							placedAt: "x",
							items: [],
							totalAmount: 0,
							currency: "USD",
							status: { kind: "placed" },
							version: 0,
						});
					},
				},
				logger,
			},
		);
		expect(code).toBe(0);
	});

	it("returns 1 when any message fails", async () => {
		const logger = new InMemoryLogger();
		const code = await runWorker(
			asyncOf(JSON.stringify({ kind: "place-order", input: sampleInput })),
			{
				placeOrder: {
					async execute(_input, out) {
						out.customerNotFound("u1");
					},
				},
				logger,
			},
		);
		expect(code).toBe(1);
	});

	it("logs and counts a parse failure as failed", async () => {
		const logger = new InMemoryLogger();
		const code = await runWorker(asyncOf("{not-json"), {
			placeOrder: { async execute() {} },
			logger,
		});
		expect(code).toBe(1);
		expect(logger.entries.some((e) => e.event === "queue.parse.fail")).toBe(
			true,
		);
	});
});
