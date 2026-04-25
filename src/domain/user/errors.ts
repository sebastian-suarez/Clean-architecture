import { DomainError } from "#domain/shared/domain-error.js";

export class InvalidEmailError extends DomainError {
	get code(): string {
		return "INVALID_EMAIL";
	}

	constructor(value: string) {
		super(`Invalid email: ${value}`);
	}
}

export class EmailAlreadyExistsError extends DomainError {
	get code(): string {
		return "EMAIL_ALREADY_EXISTS";
	}

	constructor(email: string) {
		super(`A user with email "${email}" already exists`);
	}
}

export class UserNotFoundError extends DomainError {
	get code(): string {
		return "USER_NOT_FOUND";
	}

	constructor(id: string) {
		super(`User not found: ${id}`);
	}
}
