import { type UserDto } from "#application/dtos/user-dto.js";
import { userMapper } from "#application/mappers/user-mapper.js";
import {
	type DeactivateUserInput,
	type DeactivateUserUseCase,
} from "#application/ports/input/deactivate-user-use-case.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type EventPublisher } from "#application/ports/output/event-publisher.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { UserNotFoundError } from "#domain/user/errors.js";
import { UserId } from "#domain/user/user-id.js";

export class DeactivateUser implements DeactivateUserUseCase {
	constructor(
		private readonly users: UserRepository,
		private readonly clock: Clock,
		private readonly events: EventPublisher,
	) {}

	async execute(input: DeactivateUserInput): Promise<UserDto> {
		const id = UserId.create(input.id);

		const user = await this.users.findById(id);
		if (!user) {
			throw new UserNotFoundError(input.id);
		}

		const deactivated = user.deactivate(input.reason, this.clock.now());
		await this.users.save(deactivated);

		for (const event of deactivated.events) {
			await this.events.publish(event);
		}

		return userMapper.toDto(deactivated);
	}
}
