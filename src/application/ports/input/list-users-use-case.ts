import { type UserDto } from "#application/dtos/user-dto.js";

export type ListUsersUseCase = {
	execute(): Promise<UserDto[]>;
};
