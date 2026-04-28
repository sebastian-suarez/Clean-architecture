import { InvalidOrderProcessIdError } from "#domain/order/errors.js";

export class OrderProcessId {
	static create(raw: string): OrderProcessId {
		const trimmed = raw.trim();
		if (trimmed.length === 0) {
			throw new InvalidOrderProcessIdError(raw);
		}

		return new OrderProcessId(trimmed);
	}

	private constructor(public readonly value: string) {}

	equals(other: OrderProcessId): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
