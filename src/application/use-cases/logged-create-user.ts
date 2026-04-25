import { type UserDto } from "#application/dtos/user-dto.js";
import {
	type CreateUserInput,
	type CreateUserUseCase,
} from "#application/ports/input/create-user-use-case.js";
import { type Logger } from "#application/ports/output/logger.js";

// Use-case decorator (§4.5). Wraps an inner CreateUserUseCase to add
// structured logging without touching the use case's business logic.
export class LoggedCreateUser implements CreateUserUseCase {
	constructor(
		private readonly inner: CreateUserUseCase,
		private readonly logger: Logger,
	) {}

	async execute(input: CreateUserInput): Promise<UserDto> {
		this.logger.info("create_user.start", { email: input.email });
		try {
			const result = await this.inner.execute(input);
			this.logger.info("create_user.ok", { id: result.id });
			return result;
		} catch (error) {
			this.logger.warn("create_user.fail", {
				email: input.email,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}
