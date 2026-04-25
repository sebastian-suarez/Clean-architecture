import { describe, expect, it } from "vitest";
import { Money } from "#domain/order/money.js";

// Hand-rolled property-based tests — see §10.3. A real codebase would
// use fast-check; the principle is the same: assert algebraic laws over
// many randomized inputs, not just example values.
const SAMPLES = 200;

function randomAmount(): number {
	// Bounded to avoid overflow when squaring; rounded to 2dp to match
	// Money's own rounding so identities hold exactly.
	return Math.round(Math.random() * 1_000_000) / 100;
}

describe("Money — algebraic properties", () => {
	it("addition is commutative: a + b === b + a", () => {
		for (let i = 0; i < SAMPLES; i += 1) {
			const a = Money.create(randomAmount(), "USD");
			const b = Money.create(randomAmount(), "USD");
			expect(a.add(b).equals(b.add(a))).toBe(true);
		}
	});

	it("addition is associative: (a + b) + c === a + (b + c)", () => {
		for (let i = 0; i < SAMPLES; i += 1) {
			const a = Money.create(randomAmount(), "USD");
			const b = Money.create(randomAmount(), "USD");
			const c = Money.create(randomAmount(), "USD");
			expect(
				a
					.add(b)
					.add(c)
					.equals(a.add(b.add(c))),
			).toBe(true);
		}
	});

	it("zero is the additive identity: a + 0 === a", () => {
		const zero = Money.zero("USD");
		for (let i = 0; i < SAMPLES; i += 1) {
			const a = Money.create(randomAmount(), "USD");
			expect(a.add(zero).equals(a)).toBe(true);
		}
	});

	it("multiply by 1 is identity: a * 1 === a", () => {
		for (let i = 0; i < SAMPLES; i += 1) {
			const a = Money.create(randomAmount(), "USD");
			expect(a.multiply(1).equals(a)).toBe(true);
		}
	});
});
