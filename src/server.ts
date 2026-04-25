import { serve } from "@hono/node-server";
import { CreateUser } from "#application/use-cases/create-user.js";
import { GetUser } from "#application/use-cases/get-user.js";
import { ListUsers } from "#application/use-cases/list-users.js";
import { SystemClock } from "#infrastructure/clock/system-clock.js";
import { CryptoIdGenerator } from "#infrastructure/id/crypto-id-generator.js";
import { JsonFileUserRepository } from "#infrastructure/persistence/json-file-user-repository.js";
import { createServer } from "#presentation/http/server.js";
import { loadConfig } from "#src/config.js";

const config = loadConfig();

const users = new JsonFileUserRepository(config.dataFile);
const ids = new CryptoIdGenerator();
const clock = new SystemClock();

const app = createServer({
	createUser: new CreateUser(users, ids, clock),
	getUser: new GetUser(users),
	listUsers: new ListUsers(users),
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
	console.log(`HTTP server listening on http://localhost:${info.port}`);
});
