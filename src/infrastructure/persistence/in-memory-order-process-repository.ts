import { type OrderProcessRepository } from "#application/ports/output/order-process-repository.js";
import { type OrderId } from "#domain/order/order-id.js";
import { OrderProcess } from "#domain/order/order-process.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";

export class InMemoryOrderProcessRepository implements OrderProcessRepository {
	private readonly byId = new Map<string, OrderProcess>();
	private readonly idByOrder = new Map<string, string>();

	async findByOrderId(orderId: OrderId): Promise<OrderProcess | undefined> {
		const id = this.idByOrder.get(orderId.value);
		if (!id) return undefined;
		return this.byId.get(id);
	}

	async save(process: OrderProcess): Promise<void> {
		const existing = this.byId.get(process.id.value);
		if (existing && existing.version !== process.version) {
			throw new ConcurrencyError(
				process.id.value,
				process.version,
				existing.version,
			);
		}

		const next = OrderProcess.reconstruct({
			id: process.id,
			orderId: process.orderId,
			customerId: process.customerId,
			startedAt: process.startedAt,
			status: process.status,
			version: process.version + 1,
		});
		this.byId.set(process.id.value, next);
		this.idByOrder.set(process.orderId.value, process.id.value);
	}
}
