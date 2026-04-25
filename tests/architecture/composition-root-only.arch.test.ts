import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SRC, importsOf, listFiles, readSource } from "./_walker.js";

// Composition module rule (§2.5). `src/composition.ts` is shared
// across composition roots but must NOT be imported by any other
// layer. `new <ConcreteAdapter>(...)` likewise lives only in
// composition roots and `composition.ts` itself.

const COMPOSITION_ROOTS = new Set([
	resolve(SRC, "index.ts"),
	resolve(SRC, "server.ts"),
	resolve(SRC, "worker.ts"),
]);

const COMPOSITION_MODULE = resolve(SRC, "composition.ts");

const ADAPTER_PREFIX_PATTERN =
	/\bnew\s+(InMemory|JsonFile|Console|Crypto|System|InProcess|Env|Cached|Retrying|Order)([A-Z]\w*)/g;

describe("Composition module is only consumed by composition roots (§2.5)", () => {
	it("nothing outside composition roots imports #src/composition.js", async () => {
		const files = await listFiles(SRC);
		const violations: string[] = [];
		for (const file of files) {
			if (COMPOSITION_ROOTS.has(file) || file === COMPOSITION_MODULE) continue;

			const imports = await importsOf(file);
			if (
				imports.some(
					(i) => i === "#src/composition.js" || i.endsWith("/composition.js"),
				)
			) {
				violations.push(file);
			}
		}

		expect(violations).toStrictEqual([]);
	});

	it("`new <ConcreteAdapter>(...)` only appears in composition roots / composition.ts / infrastructure / Order/OrderFactory call sites", async () => {
		const files = await listFiles(SRC);
		const violations: string[] = [];

		for (const file of files) {
			if (COMPOSITION_ROOTS.has(file) || file === COMPOSITION_MODULE) continue;
			// Adapters live in infrastructure/ and may compose with one another
			// internally (e.g., CachedUserRepository wraps an inner repo passed
			// in via the constructor — but `new InMemory…` itself can appear
			// inside a sibling adapter for testing).
			if (file.includes("/src/infrastructure/")) continue;

			const content = await readSource(file);
			ADAPTER_PREFIX_PATTERN.lastIndex = 0;
			const matches = [...content.matchAll(ADAPTER_PREFIX_PATTERN)].map(
				(m) => m[0],
			);
			// Allowed: `new OrderFactory(...)` (application factory, not an
			// adapter), `new Order(...)` is impossible (private ctor) and
			// `Order.create(...)` is fine. The pattern accidentally matches
			// `new Order…` so filter that out.
			const offending = matches.filter((m) => !m.startsWith("new Order"));

			if (offending.length > 0) {
				violations.push(`${file}: ${offending.join(", ")}`);
			}
		}

		expect(violations).toStrictEqual([]);
	});
});
