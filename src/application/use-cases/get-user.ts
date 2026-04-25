import { type UserDto } from "#application/dtos/user-dto.js";
import { userMapper } from "#application/mappers/user-mapper.js";
import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { UserNotFoundError } from "#domain/user/errors.js";

export class GetUser implements GetUserUseCase {
	constructor(private readonly users: UserRepository) {}

	async execute(id: string): Promise<UserDto> {
		const user = await this.users.findById(id);
		if (!user) {
			throw new UserNotFoundError(id);
		}

		return userMapper.toDto(user);
	}
}
