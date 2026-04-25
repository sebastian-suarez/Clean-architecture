import { type CreateUserUseCase } from "#application/ports/input/create-user-use-case.js";
import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";
import { type ListUsersUseCase } from "#application/ports/input/list-users-use-case.js";
import { DomainError } from "#domain/shared/domain-error.js";
import { createUserCommand } from "#presentation/cli/commands/create-user.js";
import { getUserCommand } from "#presentation/cli/commands/get-user.js";
import { listUsersCommand } from "#presentation/cli/commands/list-users.js";

export type CliDeps = {
	createUser: CreateUserUseCase;
	getUser: GetUserUseCase;
	listUsers: ListUsersUseCase;
};

type CommandHandler = (args: string[], deps: CliDeps) => Promise<void>;

type CommandEntry = {
	describe: string;
	handler: CommandHandler;
};

const commands = new Map<string, CommandEntry>([
	[
		"create-user",
		{
			describe: "Create a new user. Flags: --name, --email",
			handler: createUserCommand,
		},
	],
	[
		"get-user",
		{
			describe: "Get a user by id. Usage: get-user <id>",
			handler: getUserCommand,
		},
	],
	[
		"list-users",
		{
			describe: "List all users",
			handler: listUsersCommand,
		},
	],
]);

export async function runCli(argv: string[], deps: CliDeps): Promise<number> {
	const [name, ...rest] = argv;

	if (!name || name === "help" || name === "--help" || name === "-h") {
		printHelp();
		return 0;
	}

	const command = commands.get(name);
	if (!command) {
		console.error(`Unknown command: ${name}\n`);
		printHelp();
		return 1;
	}

	try {
		await command.handler(rest, deps);
		return 0;
	} catch (error: unknown) {
		if (error instanceof DomainError) {
			console.error(`Error [${error.code}]: ${error.message}`);
			return 1;
		}

		console.error(error instanceof Error ? error.message : String(error));
		return 1;
	}
}

function printHelp(): void {
	console.log("Usage: <command> [options]\n");
	console.log("Commands:");
	for (const [name, { describe }] of commands) {
		console.log(`  ${name.padEnd(14)} ${describe}`);
	}
}
