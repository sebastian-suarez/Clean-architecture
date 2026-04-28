import process from "node:process";
import { runCli } from "#presentation/cli/cli.js";
import { compose } from "#src/composition.js";
import { loadConfig } from "#src/config.js";

const config = loadConfig();
const composed = compose(config);

const exitCode = await runCli(process.argv.slice(2), {
	createUser: composed.createUser,
	getUser: composed.getUser,
	listUsers: composed.listUsers,
	renameUser: composed.renameUser,
	deactivateUser: composed.deactivateUser,
	placeOrder: composed.placeOrder,
	cancelOrder: composed.cancelOrder,
	getOrder: composed.getOrder,
	listOrders: composed.listOrders,
	listOrderSummaries: composed.listOrderSummaries,
});

process.exit(exitCode);
