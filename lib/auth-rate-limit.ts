type Entry = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as { authRateLimits?: Map<string, Entry> };
const buckets = globalForRateLimit.authRateLimits ?? new Map<string, Entry>();
globalForRateLimit.authRateLimits = buckets;
const maxBuckets = 5000;

export function consumeAuthRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    if (buckets.size >= maxBuckets) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      if (buckets.size >= maxBuckets) return false;
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count += 1;
  return entry.count <= limit;
}