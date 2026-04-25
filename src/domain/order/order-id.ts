import { InvalidOrderIdError } from "#domain/order/errors.js";

export class OrderId {
	static create(raw: string): OrderId {
		const trimmed = raw.trim();
		if (trimmed.length === 0) {
			throw new InvalidOrderIdError(raw);
		}

		return new OrderId(trimmed);
	}

	private constructor(public readonly value: string) {}

	equals(other: OrderId): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
