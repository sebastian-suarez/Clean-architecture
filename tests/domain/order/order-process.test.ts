import { describe, expect, it } from "vitest";
import { CustomerId } from "#domain/order/customer-id.js";
import { OrderProcessTransitionError } from "#domain/order/errors.js";
import { OrderId } from "#domain/order/order-id.js";
import { OrderProcessId } from "#domain/order/order-process-id.js";
import { OrderProcess } from "#domain/order/order-process.js";

function aProcess(): OrderProcess {
	return OrderProcess.start({
		id: OrderProcessId.create("p-1"),
		orderId: OrderId.create("o-1"),
		customerId: CustomerId.create("user-1"),
		startedAt: new Date("2026-01-01T00:00:00Z"),
	});
}

describe("OrderProcess (saga state aggregate)", () => {
	it("starts in 'started' and is non-terminal", () => {
		const p = aProcess();
		expect(p.status.kind).toBe("started");
		expect(p.isTerminal()).toBe(false);
	});

	it("confirms with a reservation id", () => {
		const next = aProcess().confirm("res-1");
		expect(next.status).toStrictEqual({
			kind: "confirmed",
			reservationId: "res-1",
		});
		expect(next.isTerminal()).toBe(true);
	});

	it("compensates with a reason", () => {
		const next = aProcess().compensate("inventory_unavailable");
		expect(next.status).toStrictEqual({
			kind: "compensated",
			reason: "inventory_unavailable",
		});
		expect(next.isTerminal()).toBe(true);
	});

	it("rejects double-confirm", () => {
		const confirmed = aProcess().confirm("res-1");
		expect(() => confirmed.confirm("res-2")).toThrow(
			OrderProcessTransitionError,
		);
	});

	it("rejects compensation after confirm", () => {
		const confirmed = aProcess().confirm("res-1");
		expect(() => confirmed.compensate("nope")).toThrow(
			OrderProcessTransitionError,
		);
	});
});
