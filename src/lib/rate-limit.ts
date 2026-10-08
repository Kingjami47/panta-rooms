/**
 * Lightweight in-memory rate limiter (per serverless instance).
 * Same pattern as the balance route's IP cooldown — good-enough abuse
 * damping for social endpoints; a shared store (Upstash/Redis) is the
 * next step when multi-instance traffic justifies it.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Max 10_000 keys, then wipe — prevents unbounded memory growth. */
function sweep(now: number) {
  if (buckets.size < 10_000) return;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

/**
 * @returns true if the action is ALLOWED, false if it should be rejected.
 * Callers answer 429 with a friendly retry message.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Extract a best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
