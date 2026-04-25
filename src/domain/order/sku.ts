import { InvalidSkuError } from "#domain/order/errors.js";

const SKU_PATTERN = /^[A-Z\d-]{3,32}$/;

export class Sku {
	static create(raw: string): Sku {
		const normalized = raw.trim().toUpperCase();
		if (!SKU_PATTERN.test(normalized)) {
			throw new InvalidSkuError(raw);
		}

		return new Sku(normalized);
	}

	private constructor(public readonly value: string) {}

	equals(other: Sku): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
