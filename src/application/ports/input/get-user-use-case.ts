import { type UserDto } from "#application/dtos/user-dto.js";

export type GetUserUseCase = {
	execute(id: string): Promise<UserDto>;
};
