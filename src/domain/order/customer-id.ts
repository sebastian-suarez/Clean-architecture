/* eslint-disable @typescript-eslint/no-redeclare -- type + namespace const is the canonical TS pattern for branded value objects */
import { InvalidCustomerIdError } from "#domain/order/errors.js";

declare const customerIdBrand: unique symbol;

// Branded type — demonstrates §3.2 / §7.1 alternative to a full VO class
// when the value is opaque, validated once at the boundary, and never
// compared structurally past that point. UserId (in the user context)
// is a full VO class for contrast.
export type CustomerId = string & { readonly [customerIdBrand]: true };

export const CustomerId = {
	create(raw: string): CustomerId {
		const trimmed = raw.trim();
		if (trimmed.length === 0) {
			throw new InvalidCustomerIdError(raw);
		}

		return trimmed as CustomerId;
	},
};
