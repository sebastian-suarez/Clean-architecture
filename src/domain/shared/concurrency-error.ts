import { DomainError } from "#domain/shared/domain-error.js";

export class ConcurrencyError extends DomainError {
	get code(): string {
		return "CONCURRENT_UPDATE";
	}

	constructor(
		public readonly aggregateId: string,
		public readonly expectedVersion: number,
		public readonly actualVersion: number,
	) {
		super(
			`Concurrent update on ${aggregateId}: expected version ${expectedVersion}, found ${actualVersion}`,
		);
	}
}
