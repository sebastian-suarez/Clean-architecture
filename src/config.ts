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
	dataFile: string;
	port: number;
	nodeEnv: "development" | "production" | "test";
};

export function loadConfig(): AppConfig {
	return Object.freeze({
		dataFile:
			process.env.USERS_DATA_FILE ?? resolve(process.cwd(), ".data/users.json"),
		port: parsePort(process.env.PORT, 3000),
		nodeEnv: parseNodeEnv(process.env.NODE_ENV),
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
