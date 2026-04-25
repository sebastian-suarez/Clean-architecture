import { randomUUID } from "node:crypto";
import { type IdGenerator } from "#application/ports/output/id-generator.js";

export class CryptoIdGenerator implements IdGenerator {
	next(): string {
		return randomUUID();
	}
}
