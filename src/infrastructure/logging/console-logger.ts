import {
	type LogFields,
	type Logger,
} from "#application/ports/output/logger.js";

const SECRET_KEYS = new Set([
	"password",
	"token",
	"authorization",
	"cookie",
	"apikey",
	"api_key",
]);

export class ConsoleLogger implements Logger {
	info(event: string, fields?: LogFields): void {
		console.log(this.format("info", event, fields));
	}

	warn(event: string, fields?: LogFields): void {
		console.warn(this.format("warn", event, fields));
	}

	error(event: string, fields?: LogFields): void {
		console.error(this.format("error", event, fields));
	}

	private format(level: string, event: string, fields?: LogFields): string {
		return JSON.stringify({
			level,
			event,
			...(fields ? redact(fields) : {}),
			ts: new Date().toISOString(),
		});
	}
}

function redact(fields: LogFields): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(fields)) {
		out[key] = SECRET_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : value;
	}

	return out;
}
