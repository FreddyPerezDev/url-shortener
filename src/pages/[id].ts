import type { APIRoute } from "astro";
import { rateLimiter } from "../lib/rate-limiter";
import { turso } from "../lib/turso";

export const prerender = false;

const REDIRECT_RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 1000 };

const SLUG_REGEX = /^[A-Za-z0-9]{1,20}$/;

export const GET: APIRoute = async ({ params, request, redirect }) => {
	const { id } = params;

	if (!id || !SLUG_REGEX.test(id)) {
		return redirect("/404", 302);
	}

	const clientIp =
		request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
		request.headers.get("cf-connecting-ip") ||
		"unknown";

	const { allowed } = rateLimiter(`redirect:${clientIp}`, REDIRECT_RATE_LIMIT);

	if (!allowed) {
		return new Response(
			JSON.stringify({ error: "Demasiadas solicitudes. Intenta más tarde." }),
			{
				status: 429,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		const result = await turso.execute({
			sql: "SELECT original_url FROM links WHERE id = ?",
			args: [id],
		});

		if (result.rows.length === 0) {
			return redirect("/404", 302);
		}

		const originalUrl = result.rows[0].original_url as string;

		await turso.execute({
			sql: "UPDATE links SET clicks = clicks + 1 WHERE id = ?",
			args: [id],
		});

		return new Response(null, {
			status: 302,
			headers: { Location: originalUrl },
		});
	} catch {
		return new Response(
			JSON.stringify({ error: "Error interno del servidor." }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
