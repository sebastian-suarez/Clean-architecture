import process from "node:process";
import { linesFromReadable, runWorker } from "#presentation/queue/worker.js";
import { compose } from "#src/composition.js";
import { loadConfig } from "#src/config.js";

const config = loadConfig();
const composed = compose(config);

const exitCode = await runWorker(linesFromReadable(process.stdin), {
	placeOrder: composed.placeOrder,
	logger: composed.logger,
});

process.exit(exitCode);
