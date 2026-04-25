import { type Clock } from "#application/ports/output/clock.js";
import {
	type EventHandler,
	type EventPublisher,
} from "#application/ports/output/event-publisher.js";
import { type IdGenerator } from "#application/ports/output/id-generator.js";
import { type DomainEvent } from "#domain/shared/domain-event.js";

export class FixedClock implements Clock {
	constructor(private readonly date: Date) {}

	now(): Date {
		return this.date;
	}
}

export class SequentialIdGenerator implements IdGenerator {
	private counter = 0;

	constructor(private readonly prefix = "id") {}

	next(): string {
		this.counter += 1;
		return `${this.prefix}-${this.counter}`;
	}
}

export class CapturingEventPublisher implements EventPublisher {
	readonly published: DomainEvent[] = [];
	private readonly handlers = new Map<string, EventHandler[]>();

	async publish(event: DomainEvent): Promise<void> {
		this.published.push(event);
		const list = this.handlers.get(event.name) ?? [];
		for (const handler of list) {
			await handler(event);
		}
	}

	subscribe(eventName: string, handler: EventHandler): void {
		const list = this.handlers.get(eventName) ?? [];
		list.push(handler);
		this.handlers.set(eventName, list);
	}
}
