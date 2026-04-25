import { type UserDto } from "#application/dtos/user-dto.js";
import {
	type CreateUserInput,
	type CreateUserUseCase,
} from "#application/ports/input/create-user-use-case.js";
import { type Tracer } from "#application/ports/output/tracer.js";

// Tracing decorator (§4.5, §6.7). Wraps an inner use case with a span.
export class TracedCreateUser implements CreateUserUseCase {
	constructor(
		private readonly inner: CreateUserUseCase,
		private readonly tracer: Tracer,
	) {}

	async execute(input: CreateUserInput): Promise<UserDto> {
		const span = this.tracer.startSpan("CreateUser", { email: input.email });
		try {
			const result = await this.inner.execute(input);
			span.setAttribute("user.id", result.id);
			return result;
		} catch (error) {
			span.recordError(error);
			throw error;
		} finally {
			span.end();
		}
	}
}
