import { type CustomerId } from "#domain/order/customer-id.js";
import { type OrderId } from "#domain/order/order-id.js";
import { type Order } from "#domain/order/order.js";

export type OrderPage = {
	readonly items: readonly Order[];
	readonly nextCursor: string | undefined;
};

export type OrderPagination = {
	readonly cursor?: string;
	readonly limit: number; // 1..100
};

// Repository for the Order aggregate (§5.2). Returns aggregate roots,
// never persistence rows. Carries optimistic concurrency via the order
// `version` (§3.7) — `save` rejects stale writes with
// `ConcurrencyError`.
export type OrderRepository = {
	findById(id: OrderId): Promise<Order | undefined>;
	findByCustomer(
		customerId: CustomerId,
		pagination: OrderPagination,
	): Promise<OrderPage>;
	save(order: Order): Promise<void>;
};
