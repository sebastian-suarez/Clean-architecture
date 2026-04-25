// Read-model DTO (§4.1). Used by query use cases that go through the
// `UserReadModel` port instead of the `UserRepository`. Distinct from
// `UserDto` — read models can carry denormalized fields.
export type UserSummaryDto = {
	readonly id: string;
	readonly displayName: string;
	readonly email: string;
	readonly status: "active" | "deactivated";
};
