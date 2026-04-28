import { type Context } from "hono";
import { type Principal } from "#application/security/principal.js";

// Extracts the Principal from request headers. In production this
// would verify a JWT or session cookie via an auth adapter (§6.4); for
// this educational repo we trust the headers in dev. Anonymous
// principals get no roles.
export function extractPrincipal(c: Context): Principal {
	const id = c.req.header("x-principal-id") ?? "anonymous";
	const rawRoles = c.req.header("x-principal-roles") ?? "";
	const roles = rawRoles
		.split(",")
		.map((r) => r.trim())
		.filter((r) => r.length > 0);

	return { id, roles };
}
