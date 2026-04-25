import {
	type LogFields,
	type Logger,
} from "#application/ports/output/logger.js";

export type LogEntry = {
	readonly level: "info" | "warn" | "error";
	readonly event: string;
	readonly fields?: LogFields;
};

export class InMemoryLogger implements Logger {
	readonly entries: LogEntry[] = [];

	info(event: string, fields?: LogFields): void {
		this.entries.push({ level: "info", event, fields });
	}

	warn(event: string, fields?: LogFields): void {
		this.entries.push({ level: "warn", event, fields });
	}

	error(event: string, fields?: LogFields): void {
		this.entries.push({ level: "error", event, fields });
	}
}
