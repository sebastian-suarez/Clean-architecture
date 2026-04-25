import {
	type OrderPage,
	type OrderPagination,
	type OrderRepository,
} from "#application/ports/output/order-repository.js";
import { type CustomerId } from "#domain/order/customer-id.js";
import { type OrderId } from "#domain/order/order-id.js";
import { type Order } from "#domain/order/order.js";
import { DomainError } from "#domain/shared/domain-error.js";

// Adapter-level resilience decorator (§5.1, §6.8). Retries reads on
// transient infrastructure errors; never retries DomainErrors (those
// are business decisions). Writes are NOT retried here — that would
// break optimistic concurrency. Caller-level retries on
// ConcurrencyError go through `RetriedPlaceOrder` (§4.5).
export class RetryingOrderRepository implements OrderRepository {
	constructor(
		private readonly inner: OrderRepository,
		private readonly attempts: number,
	) {}

	async findById(id: OrderId): Promise<Order | undefined> {
		return this.retry(async () => this.inner.findById(id));
	}

	async findByCustomer(
		customerId: CustomerId,
		pagination: OrderPagination,
	): Promise<OrderPage> {
		return this.retry(async () =>
			this.inner.findByCustomer(customerId, pagination),
		);
	}

	async save(order: Order): Promise<void> {
		return this.inner.save(order);
	}

	private async retry<T>(op: () => Promise<T>): Promise<T> {
		let lastError: unknown;
		for (let attempt = 0; attempt < this.attempts; attempt += 1) {
			try {
				return await op();
			} catch (error) {
				if (error instanceof DomainError) throw error;
				lastError = error;
			}
		}

		throw lastError;
	}
}
