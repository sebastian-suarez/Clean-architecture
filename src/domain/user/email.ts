import { InvalidEmailError } from "#domain/user/errors.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
	static create(raw: string): Email {
		const trimmed = raw.trim().toLowerCase();
		if (!emailPattern.test(trimmed)) {
			throw new InvalidEmailError(raw);
		}

		return new Email(trimmed);
	}

	private constructor(public readonly value: string) {}

	equals(other: Email): boolean {
		return this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}
