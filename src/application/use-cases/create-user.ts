import { type UserDto } from "#application/dtos/user-dto.js";
import { userMapper } from "#application/mappers/user-mapper.js";
import {
	type CreateUserInput,
	type CreateUserUseCase,
} from "#application/ports/input/create-user-use-case.js";
import { type Clock } from "#application/ports/output/clock.js";
import { type IdGenerator } from "#application/ports/output/id-generator.js";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { Email } from "#domain/user/email.js";
import { EmailAlreadyExistsError } from "#domain/user/errors.js";
import { User } from "#domain/user/user.js";

export class CreateUser implements CreateUserUseCase {
	constructor(
		private readonly users: UserRepository,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async execute(input: CreateUserInput): Promise<UserDto> {
		const email = Email.create(input.email);

		const existing = await this.users.findByEmail(email);
		if (existing) {
			throw new EmailAlreadyExistsError(email.value);
		}

		const user = User.create({
			id: this.ids.next(),
			name: input.name.trim(),
			email,
			createdAt: this.clock.now(),
		});

		await this.users.save(user);
		return userMapper.toDto(user);
	}
}
