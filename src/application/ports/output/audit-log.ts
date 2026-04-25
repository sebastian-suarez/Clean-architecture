export type AuditEntry = {
	readonly principalId: string;
	readonly action: string;
	readonly targetId: string;
	readonly outcome: "ok" | "fail";
	readonly occurredAt: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
};

// Append-only audit log (§6.9). Wired as a decorator on mutating use
// cases.
export type AuditLog = {
	append(entry: AuditEntry): Promise<void>;
};
