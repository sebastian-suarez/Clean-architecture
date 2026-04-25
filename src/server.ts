import { serve } from "@hono/node-server";
import { createServer } from "#presentation/http/server.js";
import { compose } from "#src/composition.js";
import { loadConfig } from "#src/config.js";

const config = loadConfig();
const composed = compose(config);

const app = createServer({
	createUser: composed.createUser,
	getUser: composed.getUser,
	listUsers: composed.listUsers,
	placeOrder: composed.placeOrderForHttp,
	cancelOrder: composed.cancelOrder,
	getOrder: composed.getOrder,
	listOrders: composed.listOrders,
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
	console.log(`HTTP server listening on http://localhost:${info.port}`);
});
