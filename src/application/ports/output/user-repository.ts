import { type Email } from "#domain/user/email.js";
import { type UserId } from "#domain/user/user-id.js";
import { type User } from "#domain/user/user.js";

export type UserRepository = {
	findById(id: UserId): Promise<User | undefined>;
	findByEmail(email: Email): Promise<User | undefined>;
	// FindAll is unbounded — acceptable in this template only because the
	// dataset is small. A production repo must add a paginated alternative
	// (§5.2). Use only from tests / small admin tools.
	findAll(): Promise<readonly User[]>;
	save(user: User): Promise<void>;
};
