import { type CancelOrderUseCase } from "#application/ports/input/cancel-order-use-case.js";
import { type CreateUserUseCase } from "#application/ports/input/create-user-use-case.js";
import { type DeactivateUserUseCase } from "#application/ports/input/deactivate-user-use-case.js";
import { type GetOrderUseCase } from "#application/ports/input/get-order-use-case.js";
import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";
import { type ListOrderSummariesUseCase } from "#application/ports/input/list-order-summaries-use-case.js";
import { type ListOrdersUseCase } from "#application/ports/input/list-orders-use-case.js";
import { type ListUsersUseCase } from "#application/ports/input/list-users-use-case.js";
import { type PlaceOrderUseCase } from "#application/ports/input/place-order-use-case.js";
import { type RenameUserUseCase } from "#application/ports/input/rename-user-use-case.js";
import { DomainError } from "#domain/shared/domain-error.js";
import { cancelOrderCommand } from "#presentation/cli/commands/cancel-order.js";
import { createUserCommand } from "#presentation/cli/commands/create-user.js";
import { deactivateUserCommand } from "#presentation/cli/commands/deactivate-user.js";
import { getOrderCommand } from "#presentation/cli/commands/get-order.js";
import { getUserCommand } from "#presentation/cli/commands/get-user.js";
import { listOrderSummariesCommand } from "#presentation/cli/commands/list-order-summaries.js";
import { listOrdersCommand } from "#presentation/cli/commands/list-orders.js";
import { listUsersCommand } from "#presentation/cli/commands/list-users.js";
import { placeOrderCommand } from "#presentation/cli/commands/place-order.js";
import { renameUserCommand } from "#presentation/cli/commands/rename-user.js";

export type CliDeps = {
	createUser: CreateUserUseCase;
	getUser: GetUserUseCase;
	listUsers: ListUsersUseCase;
	renameUser: RenameUserUseCase;
	deactivateUser: DeactivateUserUseCase;
	placeOrder: PlaceOrderUseCase;
	cancelOrder: CancelOrderUseCase;
	getOrder: GetOrderUseCase;
	listOrders: ListOrdersUseCase;
	listOrderSummaries: ListOrderSummariesUseCase;
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
	[
		"rename-user",
		{
			describe: "Rename a user. Flags: --id, --name",
			handler: renameUserCommand,
		},
	],
	[
		"deactivate-user",
		{
			describe: "Deactivate a user. Flags: --id, --reason",
			handler: deactivateUserCommand,
		},
	],
	[
		"place-order",
		{
			describe:
				"Place an order. Flags: --customer-id, --idempotency-key, --item SKU:QTY:PRICE:CURRENCY (repeatable)",
			handler: placeOrderCommand,
		},
	],
	[
		"cancel-order",
		{
			describe: "Cancel an order. Flags: --id, --reason, --customer-id",
			handler: cancelOrderCommand,
		},
	],
	[
		"get-order",
		{
			describe: "Get an order by id. Usage: get-order <id>",
			handler: getOrderCommand,
		},
	],
	[
		"list-orders",
		{
			describe:
				"List orders for a customer. Flags: --customer-id, --cursor, --limit",
			handler: listOrdersCommand,
		},
	],
	[
		"list-order-summaries",
		{
			describe:
				"List CQRS order summaries for a customer (read-model projection). Flags: --customer-id, --cursor, --limit",
			handler: listOrderSummariesCommand,
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
		console.log(`  ${name.padEnd(18)} ${describe}`);
	}
}
