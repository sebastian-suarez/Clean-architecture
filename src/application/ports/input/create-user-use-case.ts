import { type UserDto } from "#application/dtos/user-dto.js";

export type CreateUserInput = {
	readonly name: string;
	readonly email: string;
};

export type CreateUserUseCase = {
	execute(input: CreateUserInput): Promise<UserDto>;
};
