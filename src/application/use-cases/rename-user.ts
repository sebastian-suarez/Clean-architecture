import { type UserDto } from "#application/dtos/user-dto.js";
import { userMapper } from "#application/mappers/user-mapper.js";
import {
	type RenameUserInput,
	type RenameUserUseCase,
} from "#application/ports/input/rename-user-use-case.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { UserNotFoundError } from "#domain/user/errors.js";
import { UserId } from "#domain/user/user-id.js";
import { UserName } from "#domain/user/user-name.js";

export class RenameUser implements RenameUserUseCase {
	constructor(
		private readonly users: UserRepository,
		private readonly clock: Clock,
		private readonly events: EventPublisher,
	) {}

	async execute(input: RenameUserInput): Promise<UserDto> {
		const id = UserId.create(input.id);
		const newName = UserName.create(input.newName);

		const user = await this.users.findById(id);
		if (!user) {
			throw new UserNotFoundError(input.id);
		}

		const renamed = user.rename(newName, this.clock.now());
		await this.users.save(renamed);

		for (const event of renamed.events) {
			await this.events.publish(event);
		}

		return userMapper.toDto(renamed);
	}
}
