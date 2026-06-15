// Best-effort, in-memory fixed-window rate limiter for Server Actions.
//
// This is a single-user, service-role app, so the goal is modest: stop a stuck
// client or a runaway loop from hammering the database, not defend against a
// distributed attacker. Buckets live in process memory, so the limit is
// per-instance and resets on cold start — adequate for this app, and the
// natural place to swap in a shared store (e.g. Postgres/Upstash) if the app
// ever goes multi-user.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns true if this call is allowed, false if `key` has exceeded `max`
 * calls within the rolling `windowMs`.
 */
export function allow(key: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}
