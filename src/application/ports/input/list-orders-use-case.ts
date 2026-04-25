import { type OrderDto } from "#application/dtos/order-dto.js";

export type ListOrdersInput = {
	readonly customerId: string;
	readonly cursor?: string;
	readonly limit: number;
};

export type ListOrdersOutput = {
	readonly items: readonly OrderDto[];
	readonly nextCursor: string | undefined;
};

export type ListOrdersUseCase = {
	execute(input: ListOrdersInput): Promise<ListOrdersOutput>;
};
