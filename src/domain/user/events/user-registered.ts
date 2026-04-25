import { type DomainEvent } from "#domain/shared/domain-event.js";

export type UserRegistered = DomainEvent & {
	readonly name: "UserRegistered";
	readonly email: string;
};

export function userRegistered(parameters: {
	aggregateId: string;
	email: string;
	occurredAt: Date;
}): UserRegistered {
	return {
		name: "UserRegistered",
		aggregateId: parameters.aggregateId,
		email: parameters.email,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
