import { type DomainEvent } from "#domain/shared/domain-event.js";

export type UserRenamed = DomainEvent & {
	readonly name: "UserRenamed";
	readonly newName: string;
};

export function userRenamed(parameters: {
	aggregateId: string;
	newName: string;
	occurredAt: Date;
}): UserRenamed {
	return {
		name: "UserRenamed",
		aggregateId: parameters.aggregateId,
		newName: parameters.newName,
		occurredAt: parameters.occurredAt.toISOString(),
	};
}
