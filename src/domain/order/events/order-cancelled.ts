import { type DomainEvent } from "#domain/shared/domain-event.js";

export type OrderCancelled = DomainEvent & {
	readonly name: "OrderCancelled";
	readonly reason: string;
};

export function orderCancelled(parameters: {
	aggregateId: string;
	reason: string;
	occurredAt: Date;
}): OrderCancelled {
	return {
		name: "OrderCancelled",
		aggregateId: parameters.aggregateId,
		reason: parameters.reason,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
