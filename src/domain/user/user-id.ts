import { InvalidUserIdError } from "#domain/user/errors.js";

export class UserId {
	static create(raw: string): UserId {
		const trimmed = raw.trim();
		if (trimmed.length === 0) {
			throw new InvalidUserIdError(raw);
		}

		return new UserId(trimmed);
	}

	private constructor(public readonly value: string) {}

	equals(other: UserId): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
