import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SRC, listFiles, readSource } from "./_walker.js";

// §2.5: only `src/config.ts` may read `process.env`.

const ALLOWED = new Set([resolve(SRC, "config.ts")]);
const PATTERN = /process\.env/;

describe("Only src/config.ts reads process.env (§2.5)", () => {
	it("no other source file references process.env", async () => {
		const files = await listFiles(SRC);
		const violations: string[] = [];
		for (const file of files) {
			if (ALLOWED.has(file)) continue;

			const content = await readSource(file);
			if (content.includes("process.env")) violations.push(file);
		}

		expect(violations).toStrictEqual([]);
	});
});
