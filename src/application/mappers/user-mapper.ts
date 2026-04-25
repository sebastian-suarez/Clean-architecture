import { type UserDto } from "#application/dtos/user-dto.js";
import { type User } from "#domain/user/user.js";

export const userMapper = {
	toDto(user: User): UserDto {
		return {
			id: user.id,
			name: user.name,
			email: user.email.value,
			createdAt: user.createdAt.toISOString(),
		};
	},
};
