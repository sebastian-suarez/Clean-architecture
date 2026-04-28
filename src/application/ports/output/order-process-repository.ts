import { type OrderId } from "#domain/order/order-id.js";
import { type OrderProcess } from "#domain/order/order-process.js";

// Repository for the `OrderProcess` saga aggregate (§6.6). One row per
// triggering OrderPlaced event (lookup by orderId enforces "one
// process per order" idempotency). Carries optimistic concurrency on
// `version` so two saga workers reacting to the same event collide
// loudly instead of silently overwriting (§3.7).
export type OrderProcessRepository = {
	findByOrderId(orderId: OrderId): Promise<OrderProcess | undefined>;
	save(process: OrderProcess): Promise<void>;
};
