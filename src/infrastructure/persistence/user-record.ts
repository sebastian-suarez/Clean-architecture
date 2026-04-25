import { Email } from "#domain/user/email.js";
import { UserId } from "#domain/user/user-id.js";
import { UserName } from "#domain/user/user-name.js";
import { type UserStatus, User } from "#domain/user/user.js";

export type UserRecord = {
	id: string;
	name: string;
	email: string;
	status: UserStatus;
	createdAt: string;
	version: number;
};

export const userRecordMapper = {
	toRecord(user: User): UserRecord {
		return {
			id: user.id.value,
			name: user.name.value,
			email: user.email.value,
			status: user.status,
			createdAt: user.createdAt.toISOString(),
			version: user.version,
		};
	},

	toDomain(record: UserRecord): User {
		// Hydration uses `reconstruct` (§3.1) — creation invariants are
		// NOT re-run; past data may have been valid under older rules.
		return User.reconstruct({
			id: UserId.create(record.id),
			name: UserName.create(record.name),
			email: Email.create(record.email),
			createdAt: new Date(record.createdAt),
			status: record.status,
			version: record.version,
		});
	},
};
