import { Email } from "#domain/user/email.js";
import { UserId } from "#domain/user/user-id.js";
import { UserName } from "#domain/user/user-name.js";
import { type UserStatus, User } from "#domain/user/user.js";

// Test Data Builder (§10.3). Centralizes fixture construction so
// invariant changes are fixed in one place, not scattered across tests.
export function aUser(): UserBuilder {
	return new UserBuilder();
}

class UserBuilder {
	private id = "user-1";
	private name = "Alice";
	private email = "alice@example.com";
	private createdAt = new Date("2026-01-01T00:00:00Z");
	private status: UserStatus = "active";
	private version = 0;

	withId(id: string): this {
		this.id = id;
		return this;
	}

	withName(name: string): this {
		this.name = name;
		return this;
	}

	withEmail(email: string): this {
		this.email = email;
		return this;
	}

	withStatus(status: UserStatus): this {
		this.status = status;
		return this;
	}

	withVersion(version: number): this {
		this.version = version;
		return this;
	}

	withCreatedAt(date: Date): this {
		this.createdAt = date;
		return this;
	}

	// Hydration path — uses reconstruct, no creation events emitted.
	build(): User {
		return User.reconstruct({
			id: UserId.create(this.id),
			name: UserName.create(this.name),
			email: Email.create(this.email),
			createdAt: this.createdAt,
			status: this.status,
			version: this.version,
		});
	}

	// Creation path — uses create, emits UserRegistered.
	buildNew(): User {
		return User.create({
			id: UserId.create(this.id),
			name: UserName.create(this.name),
			email: Email.create(this.email),
			createdAt: this.createdAt,
		});
	}
}
