import { type Money } from "#domain/order/money.js";
import { type Order } from "#domain/order/order.js";

// Specification (§5.5) — a reusable predicate object. We keep this as a
// demonstration; the template prefers domain-named repository methods
// over a generic `find(spec)`.
export class ExpensiveOrderSpec {
	constructor(private readonly threshold: Money) {}

	isSatisfiedBy(order: Order): boolean {
		return order.total().isGreaterThan(this.threshold);
	}
}
