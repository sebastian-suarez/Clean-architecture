import { type UserDto } from "#application/dtos/user-dto.js";
import { userMapper } from "#application/mappers/user-mapper.js";
import { type ListUsersUseCase } from "#application/ports/input/list-users-use-case.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";

export class ListUsers implements ListUsersUseCase {
	constructor(private readonly users: UserRepository) {}

	async execute(): Promise<readonly UserDto[]> {
		const users = await this.users.findAll();
		return users.map((user) => userMapper.toDto(user));
	}
}
