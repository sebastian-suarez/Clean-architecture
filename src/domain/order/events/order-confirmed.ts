import { type DomainEvent } from "#domain/shared/domain-event.js";

export type OrderConfirmed = DomainEvent & {
	readonly name: "OrderConfirmed";
	readonly reservationId: string;
};

export function orderConfirmed(parameters: {
	aggregateId: string;
	reservationId: string;
	occurredAt: Date;
}): OrderConfirmed {
	return {
		name: "OrderConfirmed",
		aggregateId: parameters.aggregateId,
		reservationId: parameters.reservationId,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
