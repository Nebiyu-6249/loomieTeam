/**
 * Rate limiting, and only rate limiting.
 *
 * Upstash used to be the booking diary as well. It is not any more — bookings
 * live in Postgres alongside everything else, where they can be joined to a
 * service, listed in the admin and read back by a person. What Upstash is still
 * good at is the thing a database is bad at: a counter that expires by itself,
 * incremented on every request, that nobody ever wants to read afterwards.
 *
 * It speaks plain HTTPS, so a serverless route reaches it with fetch and no
 * connection pool. When it is not configured the counter lives in process
 * memory, which is honest about what it is: correct for one instance, useless
 * across several, and fine for development. Unlike the booking diary, a rate
 * limiter that resets on deploy is a degraded defence rather than lost data, so
 * this one is allowed to fall back in production — it just says so.
 */

export const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };

export interface RateLimiter {
  readonly kind: "redis" | "memory";
  readonly shared: boolean;
  /** The count in the window after recording this hit. */
  hit(key: string, windowMs: number): Promise<number>;
}

function redisLimiter(url: string, token: string): RateLimiter {
  const call = async (command: unknown[]): Promise<unknown> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Rate limiter returned ${response.status}`);
    const body = (await response.json()) as { result?: unknown };
    return body.result;
  };

  return {
    kind: "redis",
    shared: true,
    async hit(key, windowMs) {
      const bucket = `loomie:rate:${key}`;
      const count = Number(await call(["INCR", bucket]));
      // Only the first hit sets the expiry, so the window is fixed from the
      // first request rather than sliding forward on every one.
      if (count === 1) await call(["PEXPIRE", bucket, String(windowMs)]);
      return count;
    },
  };
}

const hits = new Map<string, number[]>();

const memoryLimiter: RateLimiter = {
  kind: "memory",
  shared: false,
  async hit(key, windowMs) {
    const now = Date.now();
    const window = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
    window.push(now);
    hits.set(key, window);
    return window.length;
  },
};

let warned = false;

export function getRateLimiter(): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) return redisLimiter(url, token);

  if (!warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.warn(
      "[loomie] No UPSTASH_REDIS_REST_URL configured. Rate limiting is running " +
        "in process memory, so the limit applies per instance rather than " +
        "across the deployment and resets on every restart."
    );
  }

  return memoryLimiter;
}

/**
 * A caller key from the request, best effort.
 *
 * Behind a proxy the socket address is the proxy's, so the forwarded header is
 * what identifies the visitor. It is spoofable — anyone can send whatever
 * X-Forwarded-For they like — which is why this limits abuse rather than
 * preventing it, and why nothing security-critical is decided from it.
 */
export function callerKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
