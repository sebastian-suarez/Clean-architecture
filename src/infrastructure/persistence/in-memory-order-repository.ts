import {
	type OrderPage,
	type OrderPagination,
	type OrderRepository,
} from "#application/ports/output/order-repository.js";
import { type CustomerId } from "#domain/order/customer-id.js";
import { type OrderId } from "#domain/order/order-id.js";
import { Order } from "#domain/order/order.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";

export class InMemoryOrderRepository implements OrderRepository {
	private readonly orders = new Map<string, Order>();

	async findById(id: OrderId): Promise<Order | undefined> {
		return this.orders.get(id.value);
	}

	async findByCustomer(
		customerId: CustomerId,
		pagination: OrderPagination,
	): Promise<OrderPage> {
		const matching = [...this.orders.values()]
			.filter((order) => order.customerId === customerId)
			.sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime());

		const offset = pagination.cursor ? Number(pagination.cursor) : 0;
		if (!Number.isInteger(offset) || offset < 0) {
			throw new Error(`Invalid cursor: ${pagination.cursor}`);
		}

		const items = matching.slice(offset, offset + pagination.limit);
		const nextOffset = offset + items.length;
		const nextCursor =
			nextOffset < matching.length ? String(nextOffset) : undefined;

		return { items, nextCursor };
	}

	async save(order: Order): Promise<void> {
		const existing = this.orders.get(order.id.value);
		if (existing && existing.version !== order.version) {
			throw new ConcurrencyError(
				order.id.value,
				order.version,
				existing.version,
			);
		}

		this.orders.set(
			order.id.value,
			Order.reconstruct({
				id: order.id,
				customerId: order.customerId,
				placedAt: order.placedAt,
				items: order.items,
				status: order.status,
				version: order.version + 1,
			}),
		);
	}
}
