import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { JsonFileUserRepository } from "#infrastructure/persistence/json-file-user-repository.js";
import { runUserRepositoryContract } from "#tests/infrastructure/persistence/user-repository-contract.js";

const created: string[] = [];

afterAll(async () => {
	await Promise.all(
		created.map(async (dir) => rm(dir, { recursive: true, force: true })),
	);
});

runUserRepositoryContract(async () => {
	const dir = await mkdtemp(join(tmpdir(), "user-repo-test-"));
	created.push(dir);
	return new JsonFileUserRepository(join(dir, "users.json"));
});
