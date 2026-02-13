interface RateLimitEntry {
	count: number;
	resetTime: number;
}

interface RateLimiterOptions {
	maxRequests: number;
	windowMs: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 1000;

setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (now >= entry.resetTime) {
			store.delete(key);
		}
	}
}, CLEANUP_INTERVAL);

export function rateLimiter(
	identifier: string,
	{ maxRequests, windowMs }: RateLimiterOptions,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
	const now = Date.now();
	const entry = store.get(identifier);

	if (!entry || now >= entry.resetTime) {
		store.set(identifier, { count: 1, resetTime: now + windowMs });
		return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
	}

	if (entry.count < maxRequests) {
		entry.count++;
		return {
			allowed: true,
			remaining: maxRequests - entry.count,
			retryAfterMs: 0,
		};
	}

	return {
		allowed: false,
		remaining: 0,
		retryAfterMs: entry.resetTime - now,
	};
}
