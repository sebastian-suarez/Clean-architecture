import { resolve } from "node:path";
import process from "node:process";

// Dotenv is a *devDependency*: it loads `.env` for local development only.
// In production, inject env vars via your platform (Docker, systemd, k8s, …).
if (process.env.NODE_ENV !== "production") {
	try {
		await import("dotenv/config");
	} catch {
		// Dotenv isn't installed in this environment — that's expected in prod.
	}
}

export type AppConfig = {
	readonly usersDataFile: string;
	readonly ordersDataFile: string;
	readonly port: number;
	readonly nodeEnv: "development" | "production" | "test";
	readonly rateLimitPerMinute: number;
	readonly enabledFeatures: ReadonlySet<string>;
};

export function loadConfig(): AppConfig {
	const { env } = process;
	return Object.freeze({
		usersDataFile:
			env.USERS_DATA_FILE ?? resolve(process.cwd(), ".data/users.json"),
		ordersDataFile:
			env.ORDERS_DATA_FILE ?? resolve(process.cwd(), ".data/orders.json"),
		port: parsePort(env.PORT, 3000),
		nodeEnv: parseNodeEnv(env.NODE_ENV),
		rateLimitPerMinute: parsePositiveInt(env.RATE_LIMIT_PER_MINUTE, 60),
		enabledFeatures: parseFlags(env.ENABLED_FEATURES),
	});
}

function parsePort(raw: string | undefined, fallback: number): number {
	if (!raw) return fallback;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
		throw new Error(`PORT must be an integer in 1..65535, got: ${raw}`);
	}

	return parsed;
}

function parseNodeEnv(raw: string | undefined): AppConfig["nodeEnv"] {
	if (raw === "production" || raw === "test") return raw;
	return "development";
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
	if (!raw) return fallback;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new Error(`Expected positive integer, got: ${raw}`);
	}

	return parsed;
}

function parseFlags(raw: string | undefined): ReadonlySet<string> {
	if (!raw) return new Set();
	return new Set(
		raw
			.split(",")
			.map((flag) => flag.trim())
			.filter((flag) => flag.length > 0),
	);
}
