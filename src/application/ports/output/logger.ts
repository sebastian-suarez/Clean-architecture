export type LogFields = Readonly<Record<string, unknown>>;

// Structured logger port (§6.1). Adapters live in
// `src/infrastructure/logging/`. Use cases reach this only via a
// decorator, not direct call (§6.1, §6.7).
export type Logger = {
	info(event: string, fields?: LogFields): void;
	warn(event: string, fields?: LogFields): void;
	error(event: string, fields?: LogFields): void;
};
