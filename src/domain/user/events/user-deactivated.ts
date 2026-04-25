import { type DomainEvent } from "#domain/shared/domain-event.js";

export type UserDeactivated = DomainEvent & {
	readonly name: "UserDeactivated";
	readonly reason: string;
};

export function userDeactivated(parameters: {
	aggregateId: string;
	reason: string;
	occurredAt: Date;
}): UserDeactivated {
	return {
		name: "UserDeactivated",
		aggregateId: parameters.aggregateId,
		reason: parameters.reason,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
