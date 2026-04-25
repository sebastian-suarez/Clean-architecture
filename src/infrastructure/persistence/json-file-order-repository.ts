import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
	type OrderPage,
	type OrderPagination,
	type OrderRepository,
} from "#application/ports/output/order-repository.js";
import { type CustomerId } from "#domain/order/customer-id.js";
import { type OrderId } from "#domain/order/order-id.js";
import { type Order } from "#domain/order/order.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";
import {
	type OrderRecord,
	orderRecordMapper,
} from "#infrastructure/persistence/order-record.js";

export class JsonFileOrderRepository implements OrderRepository {
	constructor(private readonly filePath: string) {}

	async findById(id: OrderId): Promise<Order | undefined> {
		const orders = await this.readAll();
		return orders.find((order) => order.id.equals(id));
	}

	async findByCustomer(
		customerId: CustomerId,
		pagination: OrderPagination,
	): Promise<OrderPage> {
		const orders = await this.readAll();
		const matching = orders
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
		const orders = await this.readAll();
		const index = orders.findIndex((existing) => existing.id.equals(order.id));

		if (index !== -1 && orders[index].version !== order.version) {
			throw new ConcurrencyError(
				order.id.value,
				order.version,
				orders[index].version,
			);
		}

		const record = orderRecordMapper.toRecord(order);
		record.version = order.version + 1;

		const records = orders.map((o) => orderRecordMapper.toRecord(o));
		if (index === -1) {
			records.push(record);
		} else {
			records[index] = record;
		}

		await this.writeRecords(records);
	}

	private async readAll(): Promise<Order[]> {
		try {
			const content = await readFile(this.filePath, "utf8");
			const records = JSON.parse(content) as OrderRecord[];
			return records.map((record) => orderRecordMapper.toDomain(record));
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return [];
			}

			throw error;
		}
	}

	private async writeRecords(records: OrderRecord[]): Promise<void> {
		await mkdir(dirname(this.filePath), { recursive: true });
		await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf8");
	}
}
