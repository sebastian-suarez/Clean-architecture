import { type PlaceOrderUseCase } from "#application/ports/input/place-order-use-case.js";
import { type Logger } from "#application/ports/output/logger.js";
import { DomainError } from "#domain/shared/domain-error.js";
import { handlePlaceOrderMessage } from "#presentation/queue/handlers/place-order-handler.js";

export type WorkerDeps = {
	placeOrder: PlaceOrderUseCase;
	logger: Logger;
};

// Queue messages are JSONL-encoded on stdin. Each message has a `kind`
// discriminator. This is the third delivery mechanism alongside CLI
// and HTTP — see §2.4. New transports = new presentation folder + new
// composition root, no changes to application/ or domain/.
export type QueueMessage = {
	readonly kind: "place-order";
	readonly input: Parameters<PlaceOrderUseCase["execute"]>[0];
};

export async function runWorker(
	messages: AsyncIterable<string>,
	deps: WorkerDeps,
): Promise<number> {
	let processed = 0;
	let failed = 0;

	for await (const line of messages) {
		const trimmed = line.trim();
		if (trimmed.length === 0) continue;

		let message: QueueMessage;
		try {
			message = JSON.parse(trimmed) as QueueMessage;
		} catch (error) {
			deps.logger.error("queue.parse.fail", {
				line: trimmed,
				error: error instanceof Error ? error.message : String(error),
			});
			failed += 1;
			continue;
		}

		try {
			if (message.kind === "place-order") {
				const outcome = await handlePlaceOrderMessage(message.input, deps);
				if (outcome === "placed") {
					processed += 1;
				} else {
					failed += 1;
				}
			} else {
				deps.logger.warn("queue.unknown_kind", {
					kind: (message as { kind: string }).kind,
				});
				failed += 1;
			}
		} catch (error) {
			failed += 1;
			if (error instanceof DomainError) {
				deps.logger.warn("queue.domain_error", {
					code: error.code,
					message: error.message,
				});
			} else {
				deps.logger.error("queue.exception", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	deps.logger.info("queue.done", { processed, failed });
	return failed === 0 ? 0 : 1;
}

export async function* linesFromReadable(
	readable: NodeJS.ReadableStream,
): AsyncIterable<string> {
	let buffer = "";
	for await (const chunk of readable) {
		buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
		let newlineIndex = buffer.indexOf("\n");
		while (newlineIndex !== -1) {
			yield buffer.slice(0, newlineIndex);
			buffer = buffer.slice(newlineIndex + 1);
			newlineIndex = buffer.indexOf("\n");
		}
	}

	if (buffer.length > 0) yield buffer;
}
