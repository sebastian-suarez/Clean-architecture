import { type Email } from "#domain/user/email.js";
import { type User } from "#domain/user/user.js";

export type UserRepository = {
	findById(id: string): Promise<User | undefined>;
	findByEmail(email: Email): Promise<User | undefined>;
	findAll(): Promise<User[]>;
	save(user: User): Promise<void>;
};
