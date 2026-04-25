import { parseArgs } from "node:util";
import { type DeactivateUserUseCase } from "#application/ports/input/deactivate-user-use-case.js";

export async function deactivateUserCommand(
	args: string[],
	deps: { deactivateUser: DeactivateUserUseCase },
): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			id: { type: "string" },
			reason: { type: "string", short: "r" },
		},
	});

	if (!values.id || !values.reason) {
		throw new Error("deactivate-user requires --id and --reason");
	}

	const user = await deps.deactivateUser.execute({
		id: values.id,
		reason: values.reason,
	});

	console.log(`Deactivated user ${user.id} (status: ${user.status})`);
}
