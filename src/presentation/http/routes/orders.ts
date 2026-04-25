import { type Hono } from "hono";
import { type CancelOrderUseCase } from "#application/ports/input/cancel-order-use-case.js";
import { type GetOrderUseCase } from "#application/ports/input/get-order-use-case.js";
import { type ListOrdersUseCase } from "#application/ports/input/list-orders-use-case.js";
import { type PlaceOrderUseCase } from "#application/ports/input/place-order-use-case.js";
import { type OrderDto } from "#application/dtos/order-dto.js";
import { extractPrincipal } from "#presentation/http/principal.js";

export type OrderRoutesDeps = {
	placeOrder: PlaceOrderUseCase;
	cancelOrder: CancelOrderUseCase;
	getOrder: GetOrderUseCase;
	listOrders: ListOrdersUseCase;
};

type PlaceOrderBody = {
	readonly customerId?: unknown;
	readonly items?: unknown;
};

type CancelOrderBody = {
	readonly reason?: unknown;
};

export function registerOrderRoutes(app: Hono, deps: OrderRoutesDeps): void {
	app.post("/orders", async (c) => {
		const idempotencyKey = c.req.header("idempotency-key");
		if (!idempotencyKey) {
			return c.json(
				{
					error: "BAD_REQUEST",
					message: "Missing required header: Idempotency-Key",
				},
				400,
			);
		}

		const body = await c.req.json<PlaceOrderBody>();
		if (typeof body.customerId !== "string" || !Array.isArray(body.items)) {
			return c.json(
				{
					error: "BAD_REQUEST",
					message: "Body must include string 'customerId' and array 'items'",
				},
				400,
			);
		}

		const items = body.items.map((raw, index) => {
			if (typeof raw !== "object" || raw === null) {
				throw new TypeError(`items[${index}] must be an object`);
			}

			const r = raw as Record<string, unknown>;
			if (
				typeof r.sku !== "string" ||
				typeof r.quantity !== "number" ||
				typeof r.unitPrice !== "number" ||
				typeof r.currency !== "string"
			) {
				throw new TypeError(
					`items[${index}] must have string sku, number quantity, number unitPrice, string currency`,
				);
			}

			return {
				sku: r.sku,
				quantity: r.quantity,
				unitPrice: r.unitPrice,
				currency: r.currency,
			};
		});

		// Output Boundary (§4.8) implementation — the route writes to it,
		// the use case calls it. Captures the outcome to translate to HTTP.
		let response: Response | undefined;
		await deps.placeOrder.execute(
			{
				principal: extractPrincipal(c),
				customerId: body.customerId,
				items,
				idempotencyKey,
			},
			{
				placed(order: OrderDto) {
					response = c.json(order, 201);
				},
				customerNotFound(customerId) {
					response = c.json(
						{
							error: "CUSTOMER_NOT_FOUND",
							message: `Customer ${customerId} not found`,
						},
						404,
					);
				},
				customerInactive(customerId) {
					response = c.json(
						{
							error: "CUSTOMER_INACTIVE",
							message: `Customer ${customerId} is inactive`,
						},
						409,
					);
				},
			},
		);

		return response ?? c.json({ error: "INTERNAL_ERROR" }, 500);
	});

	app.get("/orders/:id", async (c) => {
		const order = await deps.getOrder.execute(c.req.param("id"));
		return c.json(order);
	});

	app.get("/orders", async (c) => {
		const customerId = c.req.query("customerId");
		if (!customerId) {
			return c.json(
				{
					error: "BAD_REQUEST",
					message: "Missing required query parameter: customerId",
				},
				400,
			);
		}

		const cursor = c.req.query("cursor");
		const limit = Number(c.req.query("limit") ?? "20");
		if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
			return c.json(
				{
					error: "BAD_REQUEST",
					message: "limit must be an integer in 1..100",
				},
				400,
			);
		}

		const page = await deps.listOrders.execute({
			customerId,
			cursor,
			limit,
		});

		return c.json(page);
	});

	app.post("/orders/:id/cancel", async (c) => {
		const body = await c.req.json<CancelOrderBody>();
		if (typeof body.reason !== "string") {
			return c.json(
				{
					error: "BAD_REQUEST",
					message: "Body must include string field 'reason'",
				},
				400,
			);
		}

		const order = await deps.cancelOrder.execute({
			principal: extractPrincipal(c),
			id: c.req.param("id"),
			reason: body.reason,
		});

		return c.json(order);
	});
}
