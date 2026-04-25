import { type Clock } from "#application/ports/output/clock.js";

export class SystemClock implements Clock {
	now(): Date {
		return new Date();
	}
}
