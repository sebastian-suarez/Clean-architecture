export type DomainEvent = {
	readonly name: string;
	readonly aggregateId: string;
	readonly occurredAt: string;
};
