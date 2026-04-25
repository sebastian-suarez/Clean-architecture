import { type UserDto } from "#application/dtos/user-dto.js";

export type RenameUserInput = {
	readonly id: string;
	readonly newName: string;
};

export type RenameUserUseCase = {
	execute(input: RenameUserInput): Promise<UserDto>;
};
