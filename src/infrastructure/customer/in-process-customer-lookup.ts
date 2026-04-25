import { type CustomerSummaryDto } from "#application/dtos/customer-summary-dto.js";
import { type CustomerLookup } from "#application/ports/output/customer-lookup.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { type CustomerId } from "#domain/order/customer-id.js";
import { UserId } from "#domain/user/user-id.js";

// Anti-Corruption Layer (§5.4, §6.5) between the Order context and the
// User context. The Order context only knows `CustomerId` and
// `CustomerSummaryDto` (its own published-language types); this
// adapter translates from the User context's `User` aggregate.
//
// In-process today; could be swapped for an HTTP adapter tomorrow with
// no change to the application or domain layers (Branch by Abstraction
// — §6.12).
export class InProcessCustomerLookup implements CustomerLookup {
	constructor(private readonly users: UserRepository) {}

	async find(id: CustomerId): Promise<CustomerSummaryDto | undefined> {
		const user = await this.users.findById(UserId.create(id));
		if (!user) return undefined;

		// Translation IS the ACL — User → CustomerSummaryDto.
		return {
			id: user.id.value,
			displayName: user.name.value,
			status: user.status,
		};
	}
}
