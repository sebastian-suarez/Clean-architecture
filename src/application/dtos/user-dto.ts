export type UserDto = {
	readonly id: string;
	readonly name: string;
	readonly email: string;
	readonly status: "active" | "deactivated";
	readonly createdAt: string;
	readonly version: number;
};
