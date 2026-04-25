import {
	CurrencyMismatchError,
	InvalidMoneyError,
} from "#domain/order/errors.js";

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export class Money {
	static create(amount: number, currency: string): Money {
		if (!Number.isFinite(amount)) {
			throw new InvalidMoneyError(`amount must be finite, got: ${amount}`);
		}

		const normalized = currency.trim().toUpperCase();
		if (!CURRENCY_PATTERN.test(normalized)) {
			throw new InvalidMoneyError(
				`currency must be a 3-letter ISO 4217 code, got: "${currency}"`,
			);
		}

		// Round to 2 decimals using EPSILON-corrected half-away-from-zero
		// to dodge classic JS FP issues like 1.005 * 100 = 100.4999...
		const rounded = Math.round(amount * 100 + Number.EPSILON) / 100;
		return new Money(rounded, normalized);
	}

	static zero(currency: string): Money {
		return Money.create(0, currency);
	}

	private constructor(
		public readonly amount: number,
		public readonly currency: string,
	) {}

	// Closure of operations (Evans §3.9): Money + Money → Money
	add(other: Money): Money {
		this.assertSameCurrency(other);
		return Money.create(this.amount + other.amount, this.currency);
	}

	subtract(other: Money): Money {
		this.assertSameCurrency(other);
		return Money.create(this.amount - other.amount, this.currency);
	}

	multiply(factor: number): Money {
		return Money.create(this.amount * factor, this.currency);
	}

	equals(other: Money): boolean {
		return this.amount === other.amount && this.currency === other.currency;
	}

	isGreaterThan(other: Money): boolean {
		this.assertSameCurrency(other);
		return this.amount > other.amount;
	}

	toString(): string {
		return `${this.amount.toFixed(2)} ${this.currency}`;
	}

	private assertSameCurrency(other: Money): void {
		if (this.currency !== other.currency) {
			throw new CurrencyMismatchError(this.currency, other.currency);
		}
	}
}
