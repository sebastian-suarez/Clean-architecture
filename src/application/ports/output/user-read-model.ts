import { type UserSummaryDto } from "#application/dtos/user-summary-dto.js";

// Read-model port (§4.1). Returns query DTOs directly, bypassing the
// User aggregate, for queries the aggregate cannot serve cheaply.
// Distinct from the UserRepository — never bend the repository to
// serve query DTOs (§5.2).
export type UserReadModel = {
	findById(id: string): Promise<UserSummaryDto | undefined>;
	listActive(): Promise<readonly UserSummaryDto[]>;
};
