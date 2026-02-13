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

const MAX_URL_LENGTH = 2048;
const SHORTEN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "[::]"];

const PRIVATE_IP_REGEX =
	/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|fc00:|fd[0-9a-f]{2}:)/i;

function isBlockedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);

		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return true;
		}

		const hostname = parsed.hostname.toLowerCase();

		if (BLOCKED_HOSTS.includes(hostname)) return true;
		if (hostname.endsWith(".local") || hostname.endsWith(".internal"))
			return true;
		if (PRIVATE_IP_REGEX.test(hostname)) return true;

		return false;
	} catch {
		return true;
	}
}

export const server = {
	shortenUrl: defineAction({
		input: z.object({
			url: z
				.string({ message: "La URL es requerida." })
				.min(1, "La URL no puede estar vacía.")
				.max(
					MAX_URL_LENGTH,
					`La URL no puede superar los ${MAX_URL_LENGTH} caracteres.`,
				)
				.url("La URL proporcionada no es válida.")
				.refine((url) => !isBlockedUrl(url), {
					message: "La URL proporcionada no está permitida.",
				}),
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

			try {
				const existing = await turso.execute({
					sql: "SELECT id FROM links WHERE original_url = ?",
					args: [url],
				});

				if (existing.rows.length > 0) {
					return { id: existing.rows[0].id as string };
				}

				const id = nanoid();

				await turso.execute({
					sql: "INSERT INTO links(id, original_url) VALUES (?, ?)",
					args: [id, url],
				});

				return { id };
			} catch {
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: "No se pudo crear el enlace acortado. Intenta de nuevo.",
				});
			}
		},
	}),
};
