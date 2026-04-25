import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { JsonFileOrderRepository } from "#infrastructure/persistence/json-file-order-repository.js";
import { runOrderRepositoryContract } from "#tests/infrastructure/persistence/order-repository-contract.js";

const created: string[] = [];

afterAll(async () => {
	await Promise.all(
		created.map(async (dir) => rm(dir, { recursive: true, force: true })),
	);
});

runOrderRepositoryContract(async () => {
	const dir = await mkdtemp(join(tmpdir(), "order-repo-test-"));
	created.push(dir);
	return new JsonFileOrderRepository(join(dir, "orders.json"));
});
