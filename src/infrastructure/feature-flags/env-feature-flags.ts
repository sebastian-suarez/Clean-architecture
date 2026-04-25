import {
	type FeatureFlags,
	type FlagContext,
} from "#application/ports/output/feature-flags.js";

// Feature-flag adapter sourced from a static Set (the composition root
// builds it from config). For a real system this would call a feature-
// flag service (LaunchDarkly, Unleash, …); the port stays the same.
export class EnvFeatureFlags implements FeatureFlags {
	constructor(private readonly enabled: ReadonlySet<string>) {}

	isEnabled(flag: string, _context?: FlagContext): boolean {
		return this.enabled.has(flag);
	}
}
