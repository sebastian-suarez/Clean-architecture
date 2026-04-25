import { InvalidUserNameError } from "#domain/user/errors.js";

const MIN_LENGTH = 1;
const MAX_LENGTH = 100;

export class UserName {
	static create(raw: string): UserName {
		const trimmed = raw.trim();
		if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
			throw new InvalidUserNameError(raw);
		}

		return new UserName(trimmed);
	}

	private constructor(public readonly value: string) {}

	equals(other: UserName): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
