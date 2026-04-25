import { parseArgs } from "node:util";
import {
	type PlaceOrderItemInput,
	type PlaceOrderUseCase,
} from "#application/ports/input/place-order-use-case.js";

export async function placeOrderCommand(
	args: string[],
	deps: { placeOrder: PlaceOrderUseCase },
): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			"customer-id": { type: "string" },
			"idempotency-key": { type: "string" },
			item: { type: "string", multiple: true },
		},
	});

	if (!values["customer-id"]) {
		throw new Error("place-order requires --customer-id");
	}

	if (!values["idempotency-key"]) {
		throw new Error("place-order requires --idempotency-key");
	}

	if (!values.item || values.item.length === 0) {
		throw new Error(
			"place-order requires at least one --item SKU:QUANTITY:PRICE:CURRENCY",
		);
	}

	const items = values.item.map((raw) => parseItem(raw));

	let exitCode: "placed" | "missing" | "inactive" = "missing";
	let resultLine = "";

	await deps.placeOrder.execute(
		{
			principal: { id: values["customer-id"], roles: ["customer"] },
			customerId: values["customer-id"],
			items,
			idempotencyKey: values["idempotency-key"],
		},
		{
			placed(order) {
				exitCode = "placed";
				resultLine = `Placed order ${order.id} (total ${order.totalAmount.toFixed(2)} ${order.currency})`;
			},
			customerNotFound(customerId) {
				resultLine = `Customer not found: ${customerId}`;
			},
			customerInactive(customerId) {
				exitCode = "inactive";
				resultLine = `Customer inactive: ${customerId}`;
			},
		},
	);

	if (exitCode === "placed") {
		console.log(resultLine);
	} else {
		console.error(resultLine);
		throw new Error(resultLine);
	}
}

function parseItem(raw: string): PlaceOrderItemInput {
	const parts = raw.split(":");
	if (parts.length !== 4) {
		throw new Error(
			`Invalid --item "${raw}" — expected SKU:QUANTITY:PRICE:CURRENCY`,
		);
	}

	const [sku, quantityString, priceString, currency] = parts;
	const quantity = Number(quantityString);
	const unitPrice = Number(priceString);

	if (!Number.isInteger(quantity)) {
		throw new TypeError(`Invalid quantity in --item "${raw}"`);
	}

	if (!Number.isFinite(unitPrice)) {
		throw new TypeError(`Invalid price in --item "${raw}"`);
	}

	return {
		sku,
		quantity,
		unitPrice,
		currency,
	};
}
