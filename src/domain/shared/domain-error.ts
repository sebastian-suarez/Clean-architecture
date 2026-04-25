export abstract class DomainError extends Error {
	abstract get code(): string;

	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}
