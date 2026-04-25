import { DomainError } from "#domain/shared/domain-error.js";

export class ForbiddenError extends DomainError {
	get code(): string {
		return "FORBIDDEN";
	}

	constructor(action: string) {
		super(`Not authorized to perform action: ${action}`);
	}
}
