import { type DomainEvent } from "#domain/shared/domain-event.js";
import { type Email } from "#domain/user/email.js";
import {
	UserAlreadyActiveError,
	UserAlreadyDeactivatedError,
} from "#domain/user/errors.js";
import { userDeactivated } from "#domain/user/events/user-deactivated.js";
import { userReactivated } from "#domain/user/events/user-reactivated.js";
import { userRegistered } from "#domain/user/events/user-registered.js";
import { userRenamed } from "#domain/user/events/user-renamed.js";
import { type UserId } from "#domain/user/user-id.js";
import { type UserName } from "#domain/user/user-name.js";

export type UserStatus = "active" | "deactivated";

export type UserCreateProps = {
	id: UserId;
	name: UserName;
	email: Email;
	createdAt: Date;
};

export type UserReconstructProps = UserCreateProps & {
	status: UserStatus;
	version: number;
};

export class User {
	static create(props: UserCreateProps): User {
		const event = userRegistered({
			aggregateId: props.id.value,
			email: props.email.value,
			occurredAt: props.createdAt,
		});
		return new User(
			props.id,
			props.name,
			props.email,
			props.createdAt,
			"active",
			0,
			[event],
		);
	}

	static reconstruct(props: UserReconstructProps): User {
		return new User(
			props.id,
			props.name,
			props.email,
			props.createdAt,
			props.status,
			props.version,
			[],
		);
	}

	private constructor(
		public readonly id: UserId,
		public readonly name: UserName,
		public readonly email: Email,
		public readonly createdAt: Date,
		public readonly status: UserStatus,
		public readonly version: number,
		public readonly events: readonly DomainEvent[],
	) {}

	rename(newName: UserName, when: Date): User {
		if (this.name.equals(newName)) return this;
		return new User(
			this.id,
			newName,
			this.email,
			this.createdAt,
			this.status,
			this.version,
			[
				...this.events,
				userRenamed({
					aggregateId: this.id.value,
					newName: newName.value,
					occurredAt: when,
				}),
			],
		);
	}

	deactivate(reason: string, when: Date): User {
		if (this.status === "deactivated") {
			throw new UserAlreadyDeactivatedError(this.id.value);
		}

		return new User(
			this.id,
			this.name,
			this.email,
			this.createdAt,
			"deactivated",
			this.version,
			[
				...this.events,
				userDeactivated({
					aggregateId: this.id.value,
					reason,
					occurredAt: when,
				}),
			],
		);
	}

	reactivate(when: Date): User {
		if (this.status === "active") {
			throw new UserAlreadyActiveError(this.id.value);
		}

		return new User(
			this.id,
			this.name,
			this.email,
			this.createdAt,
			"active",
			this.version,
			[
				...this.events,
				userReactivated({ aggregateId: this.id.value, occurredAt: when }),
			],
		);
	}
}
