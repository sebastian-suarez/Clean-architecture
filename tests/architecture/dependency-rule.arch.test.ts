import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SRC, importsOf, listFiles } from "./_walker.js";

// Architectural fitness function (§10.5) — enforces the dependency
// rule (§1.1).

type Rule = {
	readonly from: string;
	readonly forbiddenPrefixes: readonly string[];
	readonly allowedExceptions?: (importPath: string) => boolean;
};

const RULES: readonly Rule[] = [
	{
		from: "domain",
		forbiddenPrefixes: ["#application", "#infrastructure", "#presentation"],
	},
	{
		from: "application",
		forbiddenPrefixes: ["#infrastructure", "#presentation"],
	},
	{
		from: "infrastructure",
		forbiddenPrefixes: ["#presentation"],
	},
	{
		from: "presentation",
		forbiddenPrefixes: ["#infrastructure"],
		// `DomainError` is the sole domain symbol presentation may import (§2.4).
		allowedExceptions: (path) => path === "#domain/shared/domain-error.js",
	},
];

describe("Dependency rule (§1.1)", () => {
	for (const rule of RULES) {
		it(`${rule.from}/ never imports from ${rule.forbiddenPrefixes.join(", ")}`, async () => {
			const files = await listFiles(resolve(SRC, rule.from));
			const violations: string[] = [];

			for (const file of files) {
				const imports = await importsOf(file);
				for (const imp of imports) {
					if (rule.forbiddenPrefixes.some((p) => imp.startsWith(p))) {
						violations.push(`${file} → ${imp}`);
					}
				}
			}

			expect(violations).toStrictEqual([]);
		});
	}

	it("presentation/ only imports DomainError from domain (no entities/VOs)", async () => {
		const files = await listFiles(resolve(SRC, "presentation"));
		const violations: string[] = [];
		for (const file of files) {
			const imports = await importsOf(file);
			for (const imp of imports) {
				if (
					imp.startsWith("#domain/") &&
					imp !== "#domain/shared/domain-error.js"
				) {
					violations.push(`${file} → ${imp}`);
				}
			}
		}

		expect(violations).toStrictEqual([]);
	});
});
