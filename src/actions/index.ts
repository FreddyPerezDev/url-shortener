import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { nanoid } from "nanoid";
import { turso } from "../lib/turso";

const NANOID_LENGTH = 8;

export const server = {
	shortenUrl: defineAction({
		input: z.object({
			url: z
				.string({ message: "La URL es requerida." })
				.url("La URL proporcionada no es válida."),
		}),
		handler: async ({ url }) => {
			const id = nanoid(NANOID_LENGTH);

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
