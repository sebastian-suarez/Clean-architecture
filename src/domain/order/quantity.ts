import { InvalidQuantityError } from "#domain/order/errors.js";

export class Quantity {
	static create(value: number): Quantity {
		if (!Number.isInteger(value) || value < 1) {
			throw new InvalidQuantityError(value);
		}

		return new Quantity(value);
	}

	private constructor(public readonly value: number) {}

	add(other: Quantity): Quantity {
		return Quantity.create(this.value + other.value);
	}

	equals(other: Quantity): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return String(this.value);
	}
}
