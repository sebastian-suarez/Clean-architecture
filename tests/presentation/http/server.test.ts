import { describe, expect, it } from "vitest";
import {
	EmailAlreadyExistsError,
	InvalidEmailError,
	UserNotFoundError,
} from "#domain/user/errors.js";
import { createServer, type HttpDeps } from "#presentation/http/server.js";

const sampleDto = {
	id: "u-1",
	name: "Alice",
	email: "alice@example.com",
	createdAt: "2026-01-01T00:00:00.000Z",
};

function makeDeps(overrides: Partial<HttpDeps> = {}): HttpDeps {
	return {
		createUser: {
			async execute() {
				return sampleDto;
			},
		},
		getUser: {
			async execute(id) {
				return { ...sampleDto, id };
			},
		},
		listUsers: {
			async execute() {
				return [sampleDto];
			},
		},
		...overrides,
	};
}

describe("HTTP server", () => {
	describe("POST /users", () => {
		it("returns 201 and the DTO on success", async () => {
			const app = createServer(makeDeps());
			const response = await app.request("/users", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
			});
			expect(response.status).toBe(201);
			expect(await response.json()).toStrictEqual(sampleDto);
		});

		it("returns 400 BAD_REQUEST when body is missing fields", async () => {
			const app = createServer(makeDeps());
			const response = await app.request("/users", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{}",
			});
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ error: "BAD_REQUEST" });
		});

		it("maps INVALID_EMAIL to 400", async () => {
			const app = createServer(
				makeDeps({
					createUser: {
						async execute() {
							throw new InvalidEmailError("nope");
						},
					},
				}),
			);
			const response = await app.request("/users", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: "x", email: "nope" }),
			});
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ error: "INVALID_EMAIL" });
		});

		it("maps EMAIL_ALREADY_EXISTS to 409", async () => {
			const app = createServer(
				makeDeps({
					createUser: {
						async execute() {
							throw new EmailAlreadyExistsError("a@b.co");
						},
					},
				}),
			);
			const response = await app.request("/users", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: "x", email: "a@b.co" }),
			});
			expect(response.status).toBe(409);
			expect(await response.json()).toMatchObject({
				error: "EMAIL_ALREADY_EXISTS",
			});
		});
	});

	describe("GET /users/:id", () => {
		it("returns 200 and the DTO on success", async () => {
			const app = createServer(makeDeps());
			const response = await app.request("/users/abc");
			expect(response.status).toBe(200);
			expect(await response.json()).toStrictEqual({ ...sampleDto, id: "abc" });
		});

		it("maps USER_NOT_FOUND to 404", async () => {
			const app = createServer(
				makeDeps({
					getUser: {
						async execute(id) {
							throw new UserNotFoundError(id);
						},
					},
				}),
			);
			const response = await app.request("/users/missing");
			expect(response.status).toBe(404);
			expect(await response.json()).toMatchObject({ error: "USER_NOT_FOUND" });
		});
	});

	describe("GET /users", () => {
		it("returns 200 and the list", async () => {
			const app = createServer(makeDeps());
			const response = await app.request("/users");
			expect(response.status).toBe(200);
			expect(await response.json()).toStrictEqual([sampleDto]);
		});
	});

	it("returns 500 INTERNAL_ERROR for unexpected failures", async () => {
		const app = createServer(
			makeDeps({
				listUsers: {
					async execute() {
						throw new Error("boom");
					},
				},
			}),
		);
		const response = await app.request("/users");
		expect(response.status).toBe(500);
		expect(await response.json()).toMatchObject({ error: "INTERNAL_ERROR" });
	});
});
