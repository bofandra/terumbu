import { createHash } from "node:crypto";

export type AuthRateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export type AuthRateLimitStatus = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
  lastSeenAt: number;
};

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function pruneBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  const oldest = [...buckets.entries()]
    .sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt)
    .slice(0, buckets.size - MAX_BUCKETS);

  for (const [key] of oldest) {
    buckets.delete(key);
  }
}

export function hashAuthRateLimitIdentifier(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function authRateLimitKey(scope: string, ...identifiers: string[]) {
  return createHash("sha256")
    .update([scope, ...identifiers].join("\u0000"))
    .digest("hex");
}

function activeBucket(key: string, now: number) {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (bucket) {
      buckets.delete(key);
    }

    return null;
  }

  return bucket;
}

export function authRateLimitStatus(key: string, policy: AuthRateLimitPolicy, now = Date.now()): AuthRateLimitStatus {
  pruneBuckets(now);
  const bucket = activeBucket(key, now);

  if (!bucket) {
    return { allowed: true, remaining: policy.limit, retryAfterSeconds: 0 };
  }

  return {
    allowed: bucket.count < policy.limit,
    remaining: Math.max(0, policy.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

export function recordAuthRateLimitHit(key: string, policy: AuthRateLimitPolicy, now = Date.now()): AuthRateLimitStatus {
  pruneBuckets(now);
  const current = activeBucket(key, now);
  const bucket: Bucket = current
    ? { ...current, count: current.count + 1, lastSeenAt: now }
    : { count: 1, resetAt: now + policy.windowMs, lastSeenAt: now };

  buckets.set(key, bucket);

  return {
    allowed: bucket.count <= policy.limit,
    remaining: Math.max(0, policy.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

export function consumeAuthRateLimit(key: string, policy: AuthRateLimitPolicy, now = Date.now()): AuthRateLimitStatus {
  const status = authRateLimitStatus(key, policy, now);

  if (!status.allowed) {
    return status;
  }

  return recordAuthRateLimitHit(key, policy, now);
}

export function clearAuthRateLimit(key: string) {
  buckets.delete(key);
}
