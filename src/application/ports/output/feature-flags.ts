export type FlagContext = {
	readonly principalId?: string;
};

// Feature-flag port (§6.9). Read in the composition root or in a small
// decorator — never inside a use case directly (§9 forbidden).
export type FeatureFlags = {
	isEnabled(flag: string, context?: FlagContext): boolean;
};
