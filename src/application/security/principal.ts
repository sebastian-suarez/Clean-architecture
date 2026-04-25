// Principal extracted from the transport at the presentation boundary
// (§6.4) and passed into use-case input. Use cases enforce
// authorization against this — they never trust transport-level claims
// directly.
export type Principal = {
	readonly id: string;
	readonly roles: readonly string[];
};
