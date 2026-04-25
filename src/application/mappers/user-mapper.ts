import { type UserDto } from "#application/dtos/user-dto.js";
import { type User } from "#domain/user/user.js";

export const userMapper = {
	toDto(user: User): UserDto {
		return {
			id: user.id.value,
			name: user.name.value,
			email: user.email.value,
			status: user.status,
			createdAt: user.createdAt.toISOString(),
			version: user.version,
		};
	},
};
