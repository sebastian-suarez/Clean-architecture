import process from "node:process";
import { CreateUser } from "#application/use-cases/create-user.js";
import { GetUser } from "#application/use-cases/get-user.js";
import { ListUsers } from "#application/use-cases/list-users.js";
import { SystemClock } from "#infrastructure/clock/system-clock.js";
import { CryptoIdGenerator } from "#infrastructure/id/crypto-id-generator.js";
import { JsonFileUserRepository } from "#infrastructure/persistence/json-file-user-repository.js";
import { runCli } from "#presentation/cli/cli.js";
import { loadConfig } from "#src/config.js";

const config = loadConfig();

const users = new JsonFileUserRepository(config.dataFile);
const ids = new CryptoIdGenerator();
const clock = new SystemClock();

const exitCode = await runCli(process.argv.slice(2), {
	createUser: new CreateUser(users, ids, clock),
	getUser: new GetUser(users),
	listUsers: new ListUsers(users),
});

process.exit(exitCode);
