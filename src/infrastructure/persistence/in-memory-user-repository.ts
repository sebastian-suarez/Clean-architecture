import { type UserRepository } from "#application/ports/output/user-repository.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";
import { type Email } from "#domain/user/email.js";
import { type UserId } from "#domain/user/user-id.js";
import { User } from "#domain/user/user.js";

export class InMemoryUserRepository implements UserRepository {
	private readonly users = new Map<string, User>();

	async findById(id: UserId): Promise<User | undefined> {
		return this.users.get(id.value);
	}

	async findByEmail(email: Email): Promise<User | undefined> {
		for (const user of this.users.values()) {
			if (user.email.equals(email)) {
				return user;
			}
		}

		return undefined;
	}

	async findAll(): Promise<readonly User[]> {
		return [...this.users.values()];
	}

	async save(user: User): Promise<void> {
		const existing = this.users.get(user.id.value);
		if (existing && existing.version !== user.version) {
			throw new ConcurrencyError(user.id.value, user.version, existing.version);
		}

		// Bump version on save and drop the events buffer (events are
		// transient — the use case publishes them after `save` returns).
		this.users.set(
			user.id.value,
			User.reconstruct({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
				status: user.status,
				version: user.version + 1,
			}),
		);
	}
}
