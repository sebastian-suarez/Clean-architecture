import {
	type Span,
	type SpanAttributes,
	type Tracer,
} from "#application/ports/output/tracer.js";

export type RecordedSpan = {
	readonly name: string;
	readonly attributes: Record<string, string | number | boolean>;
	readonly errors: unknown[];
	ended: boolean;
};

export class InMemoryTracer implements Tracer {
	readonly spans: RecordedSpan[] = [];

	startSpan(name: string, attributes?: SpanAttributes): Span {
		const recorded: RecordedSpan = {
			name,
			attributes: { ...attributes },
			errors: [],
			ended: false,
		};
		this.spans.push(recorded);

		return {
			setAttribute(key, value) {
				recorded.attributes[key] = value;
			},
			recordError(error) {
				recorded.errors.push(error);
			},
			end() {
				recorded.ended = true;
			},
		};
	}
}
