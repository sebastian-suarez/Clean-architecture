import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SRC, listFiles } from "./_walker.js";

// §7.1 forbids barrel files (re-export `index.ts` in subfolders). The
// top-level `src/index.ts` is the CLI composition root, not a barrel —
// it's the only allowed `index.ts` under `src/`.

describe("No barrel files (§7.1)", () => {
	it("no `index.ts` exists outside of src/index.ts", async () => {
		const files = await listFiles(SRC);
		const allowed = resolve(SRC, "index.ts");
		const barrels = files.filter(
			(f) => f.endsWith("/index.ts") && f !== allowed,
		);
		expect(barrels).toStrictEqual([]);
	});
});
