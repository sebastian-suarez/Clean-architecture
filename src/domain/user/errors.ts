import { DomainError } from "#domain/shared/domain-error.js";

export class InvalidUserIdError extends DomainError {
	get code(): string {
		return "INVALID_USER_ID";
	}

	constructor(value: string) {
		super(`Invalid user id: ${value}`);
	}
}

export class InvalidUserNameError extends DomainError {
	get code(): string {
		return "INVALID_USER_NAME";
	}

	constructor(value: string) {
		super(`Invalid user name: "${value}" (must be 1..100 chars after trim)`);
	}
}

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

export class UserAlreadyDeactivatedError extends DomainError {
	get code(): string {
		return "USER_ALREADY_DEACTIVATED";
	}

	constructor(id: string) {
		super(`User is already deactivated: ${id}`);
	}
}

export class UserAlreadyActiveError extends DomainError {
	get code(): string {
		return "USER_ALREADY_ACTIVE";
	}

	constructor(id: string) {
		super(`User is already active: ${id}`);
	}
}
