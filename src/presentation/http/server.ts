import { Hono } from "hono";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { DomainError } from "#domain/shared/domain-error.js";
import {
	registerUserRoutes,
	type UserRoutesDeps,
} from "#presentation/http/routes/users.js";

export type HttpDeps = UserRoutesDeps;

const statusByCode = new Map<string, ContentfulStatusCode>([
	["INVALID_EMAIL", 400],
	["EMAIL_ALREADY_EXISTS", 409],
	["USER_NOT_FOUND", 404],
]);

export function createServer(deps: HttpDeps): Hono {
	const app = new Hono();

	registerUserRoutes(app, deps);

	app.onError((error, c) => {
		if (error instanceof DomainError) {
			return c.json(
				{ error: error.code, message: error.message },
				statusByCode.get(error.code) ?? 422,
			);
		}

		console.error(error);
		return c.json({ error: "INTERNAL_ERROR", message: "Internal error" }, 500);
	});

	return app;
}
