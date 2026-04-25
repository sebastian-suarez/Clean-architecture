import { parseArgs } from "node:util";
import { type RenameUserUseCase } from "#application/ports/input/rename-user-use-case.js";

export async function renameUserCommand(
	args: string[],
	deps: { renameUser: RenameUserUseCase },
): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			id: { type: "string" },
			name: { type: "string", short: "n" },
		},
	});

	if (!values.id || !values.name) {
		throw new Error("rename-user requires --id and --name");
	}

	const user = await deps.renameUser.execute({
		id: values.id,
		newName: values.name,
	});

	console.log(`Renamed user ${user.id} to "${user.name}" (v${user.version})`);
}
