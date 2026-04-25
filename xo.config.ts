import { type FlatXoConfig } from "xo";

const xoConfig: FlatXoConfig = [
	{
		prettier: true,
	},
	{
		// Composition roots are the only place process.exit is allowed.
		files: ["src/index.ts", "src/worker.ts"],
		rules: {
			"unicorn/no-process-exit": "off",
		},
	},
	{
		rules: {
			// Sequential awaits are correct for ordered event publishing,
			// retries with backoff, and contract test seeding. The rule is
			// off globally; use Promise.all where parallelism is correct.
			"no-await-in-loop": "off",
			// Reduce is idiomatic for monoid-like accumulators (Money totals).
			"unicorn/no-array-reduce": "off",
			// Use cases with 5+ injected ports are by design (constructor
			// injection of every collaborator).
			"max-params": "off",
			// SCREAMING_SNAKE_CASE is the conventional casing for module-level
			// const tunables (TTLs, thresholds, regex patterns). Allow it
			// alongside camelCase / PascalCase.
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "variable",
					modifiers: ["const"],
					format: ["strictCamelCase", "UPPER_CASE", "PascalCase"],
					leadingUnderscore: "allow",
				},
				{
					selector: "variable",
					format: ["strictCamelCase", "PascalCase"],
					leadingUnderscore: "allow",
				},
				{
					selector: "function",
					format: ["strictCamelCase", "PascalCase"],
				},
				{
					selector: "typeLike",
					format: ["PascalCase"],
				},
				{
					selector: "import",
					format: ["camelCase", "PascalCase"],
				},
				{
					selector: "objectLiteralProperty",
					format: null,
				},
				{
					selector: "typeProperty",
					format: null,
				},
				{
					selector: "enumMember",
					format: ["PascalCase", "UPPER_CASE"],
				},
			],
		},
	},
	{
		// Tests intentionally use `e` parameter shadowing in tight lambdas;
		// the project also uses empty `execute` stubs as fixture defaults.
		files: ["tests/**/*.ts"],
		rules: {
			"unicorn/prevent-abbreviations": "off",
			"@typescript-eslint/no-empty-function": "off",
			"max-nested-callbacks": "off",
		},
	},
];

export default xoConfig;
