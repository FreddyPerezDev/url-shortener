import type { APIRoute } from "astro";
import { turso } from "../lib/turso";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const { id } = params;

	if (!id) {
		return new Response(JSON.stringify({ error: "ID no proporcionado." }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const result = await turso.execute({
			sql: "SELECT original_url FROM links WHERE id = ?",
			args: [id],
		});

		if (result.rows.length === 0) {
			return new Response(JSON.stringify({ error: "Enlace no encontrado." }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
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
