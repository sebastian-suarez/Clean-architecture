import { parseArgs } from "node:util";
import { type ListOrderSummariesUseCase } from "#application/ports/input/list-order-summaries-use-case.js";

export async function listOrderSummariesCommand(
	args: string[],
	deps: { listOrderSummaries: ListOrderSummariesUseCase },
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
		throw new Error("list-order-summaries requires --customer-id");
	}

	const limit = values.limit ? Number(values.limit) : 20;
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		throw new Error("--limit must be an integer in 1..100");
	}

	const page = await deps.listOrderSummaries.execute({
		customerId: values["customer-id"],
		cursor: values.cursor,
		limit,
	});

	if (page.items.length === 0) {
		console.log("(no order summaries)");
	} else {
		for (const summary of page.items) {
			console.log(
				`${summary.id}\t${summary.status}\t${summary.totalAmount.toFixed(2)} ${summary.currency}\titems=${summary.itemCount}\t${summary.lastActivityAt}`,
			);
		}
	}

	if (page.nextCursor !== undefined) {
		console.log(`\n(next cursor: ${page.nextCursor})`);
	}
}
