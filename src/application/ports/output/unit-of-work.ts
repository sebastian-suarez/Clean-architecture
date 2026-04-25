// Transaction-coordinator port (§5.5). The use case calls
// `unitOfWork.run(async () => …)`; the adapter brackets the inner work
// in a transaction. Transaction handles do not leak to the application
// layer.
export type UnitOfWork = {
	run<T>(work: () => Promise<T>): Promise<T>;
};
