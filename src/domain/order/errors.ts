import { DomainError } from "#domain/shared/domain-error.js";

export class InvalidOrderIdError extends DomainError {
	get code(): string {
		return "INVALID_ORDER_ID";
	}

	constructor(value: string) {
		super(`Invalid order id: ${value}`);
	}
}

export class InvalidCustomerIdError extends DomainError {
	get code(): string {
		return "INVALID_CUSTOMER_ID";
	}

	constructor(value: string) {
		super(`Invalid customer id: ${value}`);
	}
}

export class InvalidMoneyError extends DomainError {
	get code(): string {
		return "INVALID_MONEY";
	}

	constructor(reason: string) {
		super(`Invalid money: ${reason}`);
	}
}

export class CurrencyMismatchError extends DomainError {
	get code(): string {
		return "CURRENCY_MISMATCH";
	}

	constructor(left: string, right: string) {
		super(`Cannot combine ${left} and ${right}`);
	}
}

export class InvalidQuantityError extends DomainError {
	get code(): string {
		return "INVALID_QUANTITY";
	}

	constructor(value: number) {
		super(`Invalid quantity: ${value} (must be a positive integer)`);
	}
}

export class InvalidSkuError extends DomainError {
	get code(): string {
		return "INVALID_SKU";
	}

	constructor(value: string) {
		super(`Invalid SKU: "${value}"`);
	}
}

export class EmptyOrderError extends DomainError {
	get code(): string {
		return "EMPTY_ORDER";
	}

	constructor() {
		super("An order must have at least one line item");
	}
}

export class OrderNotFoundError extends DomainError {
	get code(): string {
		return "ORDER_NOT_FOUND";
	}

	constructor(id: string) {
		super(`Order not found: ${id}`);
	}
}

export class OrderAlreadyCancelledError extends DomainError {
	get code(): string {
		return "ORDER_ALREADY_CANCELLED";
	}

	constructor(id: string) {
		super(`Order is already cancelled: ${id}`);
	}
}

export class OrderAlreadyShippedError extends DomainError {
	get code(): string {
		return "ORDER_ALREADY_SHIPPED";
	}

	constructor(id: string) {
		super(`Order is already shipped: ${id}`);
	}
}

export class OrderNotMutableError extends DomainError {
	get code(): string {
		return "ORDER_NOT_MUTABLE";
	}

	constructor(id: string, status: string) {
		super(`Order ${id} cannot be modified in status "${status}"`);
	}
}

export class OrderNotConfirmableError extends DomainError {
	get code(): string {
		return "ORDER_NOT_CONFIRMABLE";
	}

	constructor(id: string, status: string) {
		super(`Order ${id} cannot be confirmed from status "${status}"`);
	}
}

export class InvalidOrderProcessIdError extends DomainError {
	get code(): string {
		return "INVALID_ORDER_PROCESS_ID";
	}

	constructor(value: string) {
		super(`Invalid order-process id: ${value}`);
	}
}

export class OrderProcessTransitionError extends DomainError {
	get code(): string {
		return "ORDER_PROCESS_TRANSITION";
	}

	constructor(id: string, from: string, to: string) {
		super(`Order-process ${id} cannot transition from "${from}" to "${to}"`);
	}
}

export class CustomerNotFoundError extends DomainError {
	get code(): string {
		return "CUSTOMER_NOT_FOUND";
	}

	constructor(id: string) {
		super(`Customer not found: ${id}`);
	}
}

export class CustomerInactiveError extends DomainError {
	get code(): string {
		return "CUSTOMER_INACTIVE";
	}

	constructor(id: string) {
		super(`Customer is not active: ${id}`);
	}
}
