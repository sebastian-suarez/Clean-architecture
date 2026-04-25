import { type UserSummaryDto } from "#application/dtos/user-summary-dto.js";
import { type UserReadModel } from "#application/ports/output/user-read-model.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { UserId } from "#domain/user/user-id.js";
import { type User } from "#domain/user/user.js";

// Read-model adapter (§4.1) backed by the same User store. In a real
// system the read model would be a denormalized projection updated by
// events; this in-process variant projects on demand.
export class InMemoryUserReadModel implements UserReadModel {
	constructor(private readonly users: UserRepository) {}

	async findById(id: string): Promise<UserSummaryDto | undefined> {
		const user = await this.users.findById(UserId.create(id));
		if (!user) return undefined;
		return toSummary(user);
	}

	async listActive(): Promise<readonly UserSummaryDto[]> {
		const users = await this.users.findAll();
		return users
			.filter((user) => user.status === "active")
			.map((user) => toSummary(user));
	}
}

function toSummary(user: User): UserSummaryDto {
	return {
		id: user.id.value,
		displayName: user.name.value,
		email: user.email.value,
		status: user.status,
	};
}
