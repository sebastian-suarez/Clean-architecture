import { type DomainEvent } from "#domain/shared/domain-event.js";

export type EventHandler = (event: DomainEvent) => Promise<void>;

// Domain-event dispatch port (§3.6). Adapters live in
// `src/infrastructure/messaging/`. Subscribers register via
// `subscribe(eventName, handler)`; the use case calls `publish(event)`
// after `repository.save`.
export type EventPublisher = {
	publish(event: DomainEvent): Promise<void>;
	subscribe(eventName: string, handler: EventHandler): void;
};
