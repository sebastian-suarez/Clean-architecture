// Cross-context published-language DTO (§6.5). Owned by the Order
// context; populated by the CustomerLookup adapter (ACL).
export type CustomerSummaryDto = {
	readonly id: string;
	readonly displayName: string;
	readonly status: "active" | "deactivated";
};
