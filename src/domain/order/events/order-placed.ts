import { type DomainEvent } from "#domain/shared/domain-event.js";

export type OrderPlaced = DomainEvent & {
	readonly name: "OrderPlaced";
	readonly customerId: string;
	readonly totalAmount: number;
	readonly currency: string;
	readonly itemCount: number;
};

export function orderPlaced(parameters: {
	aggregateId: string;
	customerId: string;
	totalAmount: number;
	currency: string;
	itemCount: number;
	occurredAt: Date;
}): OrderPlaced {
	return {
		name: "OrderPlaced",
		aggregateId: parameters.aggregateId,
		customerId: parameters.customerId,
		totalAmount: parameters.totalAmount,
		currency: parameters.currency,
		itemCount: parameters.itemCount,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
