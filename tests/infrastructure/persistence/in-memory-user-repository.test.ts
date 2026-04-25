import { InMemoryUserRepository } from "#infrastructure/persistence/in-memory-user-repository.js";
import { runUserRepositoryContract } from "#tests/infrastructure/persistence/user-repository-contract.js";

runUserRepositoryContract(() => new InMemoryUserRepository());
