import {
	type PlaceOrderInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";
import { type PlaceOrderOutput } from "#application/ports/output/place-order-output.js";
import { ForbiddenError } from "#domain/shared/forbidden-error.js";

const REQUIRED_ROLE = "customer";

// Coarse, role-based authorization (§6.4). Data-aware checks happen
// inside the inner use case where the data is loaded; this decorator
// fails fast for principals that can't possibly call PlaceOrder.
export class AuthorizedPlaceOrder implements PlaceOrderUseCase {
	constructor(private readonly inner: PlaceOrderUseCase) {}

	async execute(
		input: PlaceOrderInput,
		output: PlaceOrderOutput,
	): Promise<void> {
		if (!input.principal.roles.includes(REQUIRED_ROLE)) {
			throw new ForbiddenError("place order");
		}

		// Customers may only place orders for themselves.
		if (
			input.customerId !== input.principal.id &&
			!input.principal.roles.includes("admin")
		) {
			throw new ForbiddenError("place order on behalf of another customer");
		}

		await this.inner.execute(input, output);
	}
}
