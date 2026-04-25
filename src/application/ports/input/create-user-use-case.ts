import { type UserDto } from "#application/dtos/user-dto.js";

export type CreateUserInput = {
	name: string;
	email: string;
};

export type CreateUserUseCase = {
	execute(input: CreateUserInput): Promise<UserDto>;
};
