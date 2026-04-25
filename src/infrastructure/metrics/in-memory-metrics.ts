import {
	type MetricTags,
	type Metrics,
} from "#application/ports/output/metrics.js";

type Sample = {
	readonly name: string;
	readonly value?: number;
	readonly tags?: MetricTags;
};

export class InMemoryMetrics implements Metrics {
	readonly counters: Sample[] = [];
	readonly histograms: Sample[] = [];
	readonly gauges: Sample[] = [];

	counter(name: string, tags?: MetricTags): void {
		this.counters.push({ name, tags });
	}

	histogram(name: string, value: number, tags?: MetricTags): void {
		this.histograms.push({ name, value, tags });
	}

	gauge(name: string, value: number, tags?: MetricTags): void {
		this.gauges.push({ name, value, tags });
	}
}
