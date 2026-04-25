export type SpanAttributes = Readonly<
	Record<string, string | number | boolean>
>;

export type Span = {
	setAttribute(key: string, value: string | number | boolean): void;
	recordError(error: unknown): void;
	end(): void;
};

// Distributed-tracing port (§6.7). Adapters live in
// `src/infrastructure/tracing/`.
export type Tracer = {
	startSpan(name: string, attributes?: SpanAttributes): Span;
};
