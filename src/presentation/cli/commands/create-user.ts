import { parseArgs } from "node:util";
import { type CreateUserUseCase } from "#application/ports/input/create-user-use-case.js";

export async function createUserCommand(
	args: string[],
	deps: { createUser: CreateUserUseCase },
): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			name: { type: "string", short: "n" },
			email: { type: "string", short: "e" },
		},
	});

	if (!values.name || !values.email) {
		throw new Error("create-user requires --name and --email");
	}

	const user = await deps.createUser.execute({
		name: values.name,
		email: values.email,
	});

	console.log(`Created user ${user.id} (${user.email})`);
}
