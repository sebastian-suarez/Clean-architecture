import { type LineItemDto } from "#application/dtos/line-item-dto.js";

export type OrderStatusDto =
	| { readonly kind: "placed" }
	| {
			readonly kind: "confirmed";
			readonly reservationId: string;
			readonly at: string;
	  }
	| { readonly kind: "shipped"; readonly at: string }
	| {
			readonly kind: "cancelled";
			readonly reason: string;
			readonly at: string;
	  };

export type OrderDto = {
	readonly id: string;
	readonly customerId: string;
	readonly placedAt: string;
	readonly items: readonly LineItemDto[];
	readonly totalAmount: number;
	readonly currency: string;
	readonly status: OrderStatusDto;
	readonly version: number;
};
