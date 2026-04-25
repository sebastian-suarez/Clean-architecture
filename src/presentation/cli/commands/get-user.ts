import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";

export async function getUserCommand(
	args: string[],
	deps: { getUser: GetUserUseCase },
): Promise<void> {
	const [id] = args;
	if (!id) {
		throw new Error("get-user requires a user id positional argument");
	}

	const user = await deps.getUser.execute(id);
	console.log(JSON.stringify(user, undefined, 2));
}
