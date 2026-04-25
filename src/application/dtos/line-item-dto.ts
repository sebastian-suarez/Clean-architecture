export type LineItemDto = {
	readonly sku: string;
	readonly quantity: number;
	readonly unitPriceAmount: number;
	readonly currency: string;
	readonly subtotalAmount: number;
};
