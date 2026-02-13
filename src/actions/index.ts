import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { customAlphabet } from "nanoid";
import { rateLimiter } from "../lib/rate-limiter";
import { turso } from "../lib/turso";

const NANOID_LENGTH = 8;
const nanoid = customAlphabet(
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
	NANOID_LENGTH,
);

const SHORTEN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

export const server = {
	shortenUrl: defineAction({
		input: z.object({
			url: z
				.string({ message: "La URL es requerida." })
				.url("La URL proporcionada no es válida."),
		}),
		handler: async ({ url }, context) => {
			const clientIp =
				context.request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
				context.request.headers.get("cf-connecting-ip") ||
				"unknown";

			const { allowed, retryAfterMs } = rateLimiter(
				`shorten:${clientIp}`,
				SHORTEN_RATE_LIMIT,
			);

			if (!allowed) {
				const minutes = Math.ceil(retryAfterMs / 60000);
				throw new ActionError({
					code: "TOO_MANY_REQUESTS",
					message: `Demasiadas solicitudes. Intenta de nuevo en ${minutes} minuto${minutes > 1 ? "s" : ""}.`,
				});
			}

			const id = nanoid();

			try {
				await turso.execute({
					sql: "INSERT INTO links(id, original_url) VALUES (?, ?)",
					args: [id, url],
				});
			} catch {
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: "No se pudo crear el enlace acortado. Intenta de nuevo.",
				});
			}

			return { id };
		},
	}),
};
