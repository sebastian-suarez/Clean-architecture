import {
	type EventHandler,
	type EventPublisher,
} from "#application/ports/output/event-publisher.js";
import { type DomainEvent } from "#domain/shared/domain-event.js";

export class InMemoryEventPublisher implements EventPublisher {
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
