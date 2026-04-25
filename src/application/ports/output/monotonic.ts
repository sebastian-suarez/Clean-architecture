// Monotonic clock port (§6.2). Returns ms since an arbitrary epoch.
// Cannot jump backwards under NTP correction, unlike `Clock.now()`.
// Use only when correctness depends on duration (rate-limit windows,
// expiry timers).
export type Monotonic = {
	now(): number;
};
