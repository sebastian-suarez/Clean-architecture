import { parseArgs } from "node:util";
import { type ListOrdersUseCase } from "#application/ports/input/list-orders-use-case.js";

export async function listOrdersCommand(
	args: string[],
	deps: { listOrders: ListOrdersUseCase },
): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			"customer-id": { type: "string" },
			cursor: { type: "string" },
			limit: { type: "string" },
		},
	});

	if (!values["customer-id"]) {
		throw new Error("list-orders requires --customer-id");
	}

	const limit = values.limit ? Number(values.limit) : 20;
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		throw new Error("--limit must be an integer in 1..100");
	}

	const page = await deps.listOrders.execute({
		customerId: values["customer-id"],
		cursor: values.cursor,
		limit,
	});

	if (page.items.length === 0) {
		console.log("(no orders)");
	} else {
		for (const order of page.items) {
			console.log(
				`${order.id}\t${order.placedAt}\t${order.totalAmount.toFixed(2)} ${order.currency}\t${order.status.kind}`,
			);
		}
	}

	if (page.nextCursor !== undefined) {
		console.log(`\n(next cursor: ${page.nextCursor})`);
	}
}
