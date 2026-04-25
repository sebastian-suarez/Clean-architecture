import { InMemoryOrderRepository } from "#infrastructure/persistence/in-memory-order-repository.js";
import { runOrderRepositoryContract } from "#tests/infrastructure/persistence/order-repository-contract.js";

runOrderRepositoryContract(() => new InMemoryOrderRepository());
