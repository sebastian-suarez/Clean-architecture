import { describe, expect, it } from "vitest";
import {
	CurrencyMismatchError,
	InvalidMoneyError,
} from "#domain/order/errors.js";
import { Money } from "#domain/order/money.js";

describe("Money", () => {
	it("normalizes currency to uppercase", () => {
		const m = Money.create(10, "usd");
		expect(m.currency).toBe("USD");
	});

	it("rejects non-3-letter currency codes", () => {
		expect(() => Money.create(10, "USDX")).toThrow(InvalidMoneyError);
		expect(() => Money.create(10, "")).toThrow(InvalidMoneyError);
	});

	it("rejects non-finite amounts", () => {
		expect(() => Money.create(Number.NaN, "USD")).toThrow(InvalidMoneyError);
		expect(() => Money.create(Infinity, "USD")).toThrow(InvalidMoneyError);
	});

	it("rounds to 2 decimal places", () => {
		// Avoiding 1.005 — the IEEE 754 representation isn't exactly on the
		// midpoint, so what gets rounded is platform-defined. Use values
		// that round unambiguously.
		expect(Money.create(1.006, "USD").amount).toBe(1.01);
		expect(Money.create(1.004, "USD").amount).toBe(1);
	});

	describe("add (closure of operations)", () => {
		it("returns a new Money in the same currency", () => {
			const result = Money.create(10, "USD").add(Money.create(2.5, "USD"));
			expect(result.equals(Money.create(12.5, "USD"))).toBe(true);
		});

		it("rejects mixed currencies", () => {
			expect(() => Money.create(10, "USD").add(Money.create(5, "EUR"))).toThrow(
				CurrencyMismatchError,
			);
		});
	});

	describe("multiply", () => {
		it("scales the amount", () => {
			expect(Money.create(2.5, "USD").multiply(4).amount).toBe(10);
		});
	});

	describe("equals", () => {
		it("matches by amount and currency", () => {
			expect(Money.create(10, "USD").equals(Money.create(10, "USD"))).toBe(
				true,
			);
			expect(Money.create(10, "USD").equals(Money.create(10, "EUR"))).toBe(
				false,
			);
		});
	});

	describe("isGreaterThan", () => {
		it("compares same-currency amounts", () => {
			expect(
				Money.create(10, "USD").isGreaterThan(Money.create(5, "USD")),
			).toBe(true);
		});

		it("rejects mixed currencies", () => {
			expect(() =>
				Money.create(10, "USD").isGreaterThan(Money.create(5, "EUR")),
			).toThrow(CurrencyMismatchError);
		});
	});
});
