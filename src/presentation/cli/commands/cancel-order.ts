import { parseArgs } from "node:util";
import { type CancelOrderUseCase } from "#application/ports/input/cancel-order-use-case.js";

export async function cancelOrderCommand(
	args: string[],
	deps: { cancelOrder: CancelOrderUseCase },
): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			id: { type: "string" },
			reason: { type: "string", short: "r" },
			"customer-id": { type: "string" },
		},
	});

	if (!values.id || !values.reason || !values["customer-id"]) {
		throw new Error("cancel-order requires --id, --reason, --customer-id");
	}

	const order = await deps.cancelOrder.execute({
		principal: { id: values["customer-id"], roles: ["customer"] },
		id: values.id,
		reason: values.reason,
	});

	console.log(`Cancelled order ${order.id} (status: ${order.status.kind})`);
}
