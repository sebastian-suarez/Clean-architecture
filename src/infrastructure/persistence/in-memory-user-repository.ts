import { type UserRepository } from "#application/ports/output/user-repository.js";
import { type Email } from "#domain/user/email.js";
import { type User } from "#domain/user/user.js";

export class InMemoryUserRepository implements UserRepository {
	private readonly users = new Map<string, User>();

	async findById(id: string): Promise<User | undefined> {
		return this.users.get(id);
	}

	async findByEmail(email: Email): Promise<User | undefined> {
		for (const user of this.users.values()) {
			if (user.email.equals(email)) {
				return user;
			}
		}

		return undefined;
	}

	async findAll(): Promise<User[]> {
		return [...this.users.values()];
	}

	async save(user: User): Promise<void> {
		this.users.set(user.id, user);
	}
}
