import { type Email } from "#domain/user/email.js";

export type UserProps = {
	id: string;
	name: string;
	email: Email;
	createdAt: Date;
};

export class User {
	static create(props: UserProps): User {
		return new User(props.id, props.name, props.email, props.createdAt);
	}

	private constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly email: Email,
		public readonly createdAt: Date,
	) {}
}
