const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

type Bucket = { count: number; resetAt: number };

/** In-isolate sliding window; resets on cold start. */
const buckets = new Map<string, Bucket>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const existing = buckets.get(userId);
  if (!existing || now >= existing.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_PER_WINDOW) return false;
  existing.count += 1;
  return true;
}
