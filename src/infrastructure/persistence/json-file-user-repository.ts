import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type UserRepository } from "#application/ports/output/user-repository.js";
import { type Email } from "#domain/user/email.js";
import { type User } from "#domain/user/user.js";
import {
	type UserRecord,
	userRecordMapper,
} from "#infrastructure/persistence/user-record.js";

export class JsonFileUserRepository implements UserRepository {
	constructor(private readonly filePath: string) {}

	async findById(id: string): Promise<User | undefined> {
		const users = await this.readAll();
		return users.find((user) => user.id === id);
	}

	async findByEmail(email: Email): Promise<User | undefined> {
		const users = await this.readAll();
		return users.find((user) => user.email.equals(email));
	}

	async findAll(): Promise<User[]> {
		return this.readAll();
	}

	async save(user: User): Promise<void> {
		const users = await this.readAll();
		const index = users.findIndex((existing) => existing.id === user.id);
		if (index === -1) {
			users.push(user);
		} else {
			users[index] = user;
		}

		await this.writeAll(users);
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

	private async writeAll(users: User[]): Promise<void> {
		await mkdir(dirname(this.filePath), { recursive: true });
		const records = users.map((user) => userRecordMapper.toRecord(user));
		await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf8");
	}
}
