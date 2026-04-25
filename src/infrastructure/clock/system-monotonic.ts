import { performance } from "node:perf_hooks";
import { type Monotonic } from "#application/ports/output/monotonic.js";

export class SystemMonotonic implements Monotonic {
	now(): number {
		return performance.now();
	}
}
