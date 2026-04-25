import { type ListUsersUseCase } from "#application/ports/input/list-users-use-case.js";

export async function listUsersCommand(
	_args: string[],
	deps: { listUsers: ListUsersUseCase },
): Promise<void> {
	const users = await deps.listUsers.execute();
	if (users.length === 0) {
		console.log("(no users)");
		return;
	}

	for (const user of users) {
		console.log(`${user.id}\t${user.email}\t${user.name}`);
	}
}
