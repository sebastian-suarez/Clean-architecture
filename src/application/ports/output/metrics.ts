export type MetricTags = Readonly<Record<string, string>>;

// Metrics port (§6.7). Adapters live in `src/infrastructure/metrics/`.
export type Metrics = {
	counter(name: string, tags?: MetricTags): void;
	histogram(name: string, value: number, tags?: MetricTags): void;
	gauge(name: string, value: number, tags?: MetricTags): void;
};
