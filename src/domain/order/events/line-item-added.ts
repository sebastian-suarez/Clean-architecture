import { type DomainEvent } from "#domain/shared/domain-event.js";

export type LineItemAdded = DomainEvent & {
	readonly name: "LineItemAdded";
	readonly sku: string;
	readonly quantity: number;
};

export function lineItemAdded(parameters: {
	aggregateId: string;
	sku: string;
	quantity: number;
	occurredAt: Date;
}): LineItemAdded {
	return {
		name: "LineItemAdded",
		aggregateId: parameters.aggregateId,
		sku: parameters.sku,
		quantity: parameters.quantity,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
