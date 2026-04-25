import { type DomainEvent } from "#domain/shared/domain-event.js";

export type UserReactivated = DomainEvent & {
	readonly name: "UserReactivated";
};

export function userReactivated(parameters: {
	aggregateId: string;
	occurredAt: Date;
}): UserReactivated {
	return {
		name: "UserReactivated",
		aggregateId: parameters.aggregateId,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
