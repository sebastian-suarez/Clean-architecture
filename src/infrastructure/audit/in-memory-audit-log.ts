import {
	type AuditEntry,
	type AuditLog,
} from "#application/ports/output/audit-log.js";

export class InMemoryAuditLog implements AuditLog {
	readonly entries: AuditEntry[] = [];

	async append(entry: AuditEntry): Promise<void> {
		this.entries.push(entry);
	}
}
