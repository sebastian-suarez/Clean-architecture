import { type Hono } from "hono";
import { type CreateUserUseCase } from "#application/ports/input/create-user-use-case.js";
import { type GetUserUseCase } from "#application/ports/input/get-user-use-case.js";
import { type ListUsersUseCase } from "#application/ports/input/list-users-use-case.js";

export type UserRoutesDeps = {
	createUser: CreateUserUseCase;
	getUser: GetUserUseCase;
	listUsers: ListUsersUseCase;
};

export function registerUserRoutes(app: Hono, deps: UserRoutesDeps): void {
	app.get("/users", async (c) => {
		const users = await deps.listUsers.execute();
		return c.json(users);
	});

	app.get("/users/:id", async (c) => {
		const user = await deps.getUser.execute(c.req.param("id"));
		return c.json(user);
	});

	app.post("/users", async (c) => {
		const body = await c.req.json<{ name?: unknown; email?: unknown }>();
		if (typeof body.name !== "string" || typeof body.email !== "string") {
			return c.json(
				{
					error: "BAD_REQUEST",
					message: "Body must include string fields 'name' and 'email'",
				},
				400,
			);
		}

		const user = await deps.createUser.execute({
			name: body.name,
			email: body.email,
		});
		return c.json(user, 201);
	});
}
