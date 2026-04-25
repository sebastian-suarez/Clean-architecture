import { type FlatXoConfig } from "xo";

const xoConfig: FlatXoConfig = [
	{
		prettier: true,
	},
	{
		files: ["src/index.ts"],
		rules: {
			"unicorn/no-process-exit": "off",
		},
	},
];

export default xoConfig;
