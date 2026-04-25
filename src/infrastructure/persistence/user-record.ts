import { Email } from "#domain/user/email.js";
import { User } from "#domain/user/user.js";

export type UserRecord = {
	id: string;
	name: string;
	email: string;
	createdAt: string;
};

export const userRecordMapper = {
	toRecord(user: User): UserRecord {
		return {
			id: user.id,
			name: user.name,
			email: user.email.value,
			createdAt: user.createdAt.toISOString(),
		};
	},

	toDomain(record: UserRecord): User {
		return User.create({
			id: record.id,
			name: record.name,
			email: Email.create(record.email),
			createdAt: new Date(record.createdAt),
		});
	},
};
