import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

export const SRC = resolve(process.cwd(), "src");

export async function listFiles(
	dir: string,
	suffix = ".ts",
): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const out: string[] = [];
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await listFiles(full, suffix)));
		} else if (entry.name.endsWith(suffix)) {
			out.push(full);
		}
	}

	return out;
}

const IMPORT_PATTERN = /import\s+(?:type\s+)?[^"']*from\s+["']([^"']+)["']/g;

export async function importsOf(file: string): Promise<string[]> {
	const content = await readFile(file, "utf8");
	return [...content.matchAll(IMPORT_PATTERN)].map((m) => m[1]);
}

export async function readSource(file: string): Promise<string> {
	return readFile(file, "utf8");
}
