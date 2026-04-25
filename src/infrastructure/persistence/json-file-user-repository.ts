import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { ConcurrencyError } from "#domain/shared/concurrency-error.js";
import { type Email } from "#domain/user/email.js";
import { type UserId } from "#domain/user/user-id.js";
import { type User } from "#domain/user/user.js";
import {
	type UserRecord,
	userRecordMapper,
} from "#infrastructure/persistence/user-record.js";

export class JsonFileUserRepository implements UserRepository {
	constructor(private readonly filePath: string) {}

	async findById(id: UserId): Promise<User | undefined> {
		const users = await this.readAll();
		return users.find((user) => user.id.equals(id));
	}

	async findByEmail(email: Email): Promise<User | undefined> {
		const users = await this.readAll();
		return users.find((user) => user.email.equals(email));
	}

	async findAll(): Promise<readonly User[]> {
		return this.readAll();
	}

	async save(user: User): Promise<void> {
		const users = await this.readAll();
		const index = users.findIndex((existing) => existing.id.equals(user.id));

		if (index !== -1 && users[index].version !== user.version) {
			throw new ConcurrencyError(
				user.id.value,
				user.version,
				users[index].version,
			);
		}

		const recordToWrite = userRecordMapper.toRecord(user);
		recordToWrite.version = user.version + 1;

		const records = users.map((u) => userRecordMapper.toRecord(u));
		if (index === -1) {
			records.push(recordToWrite);
		} else {
			records[index] = recordToWrite;
		}

		await this.writeRecords(records);
	}

	private async readAll(): Promise<User[]> {
		try {
			const content = await readFile(this.filePath, "utf8");
			const records = JSON.parse(content) as UserRecord[];
			return records.map((record) => userRecordMapper.toDomain(record));
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return [];
			}

			throw error;
		}
	}

	private async writeRecords(records: UserRecord[]): Promise<void> {
		await mkdir(dirname(this.filePath), { recursive: true });
		await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf8");
	}
}
