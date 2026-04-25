import { type GetOrderUseCase } from "#application/ports/input/get-order-use-case.js";

export async function getOrderCommand(
	args: string[],
	deps: { getOrder: GetOrderUseCase },
): Promise<void> {
	const [id] = args;
	if (!id) {
		throw new Error("get-order requires an order id positional argument");
	}

	const order = await deps.getOrder.execute(id);
	console.log(JSON.stringify(order, undefined, 2));
}
