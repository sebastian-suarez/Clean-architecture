import { type UserDto } from "#application/dtos/user-dto.js";

export type DeactivateUserInput = {
	readonly id: string;
	readonly reason: string;
};

export type DeactivateUserUseCase = {
	execute(input: DeactivateUserInput): Promise<UserDto>;
};
