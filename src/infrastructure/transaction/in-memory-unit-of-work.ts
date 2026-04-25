import { type UnitOfWork } from "#application/ports/output/unit-of-work.js";

// In-memory adapter — no transactional semantics, just runs the work.
// A Postgres-backed adapter would BEGIN/COMMIT around `work()`.
export class InMemoryUnitOfWork implements UnitOfWork {
	async run<T>(work: () => Promise<T>): Promise<T> {
		return work();
	}
}
