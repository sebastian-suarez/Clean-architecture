import { type OrderDto } from "#application/dtos/order-dto.js";

// Output Boundary / Presenter port (§4.8). Demonstrates the inverted
// pattern: instead of returning a DTO, the use case writes outcomes
// into this object. Presentation implements it (HTTP writes JSON, CLI
// writes a line, queue worker acks/nacks).
export type PlaceOrderOutput = {
	placed(order: OrderDto): void;
	customerNotFound(customerId: string): void;
	customerInactive(customerId: string): void;
};
