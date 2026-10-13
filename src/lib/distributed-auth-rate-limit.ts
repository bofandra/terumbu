import { eq, lt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { authRateLimitBuckets } from "@/db/schema";
import type { AuthRateLimitPolicy, AuthRateLimitStatus } from "@/lib/auth-rate-limit";

type RateLimitScope = { key: string; policy: AuthRateLimitPolicy };

function validateScope(key: string, policy: AuthRateLimitPolicy) {
  // A key is derived with authRateLimitKey(): no untrusted raw identifiers.
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Auth rate-limit key must be a SHA-256 digest.");
  if (!Number.isSafeInteger(policy.limit) || policy.limit < 1 ||
      !Number.isSafeInteger(policy.windowMs) || policy.windowMs < 1 || policy.windowMs > 86_400_000) {
    throw new Error("Invalid auth rate-limit policy.");
  }
}

/**
 * Database atomic upsert serializes increments on the unique bucket key.
 * All app replicas share these counters; even simultaneous requests cannot
 * exceed the allowed count across multiple instances.
 *
 * Fail closed if the database is unavailable. No fallback to process memory.
 */
export async function consumeDistributedAuthRateLimit(
  key: string,
  policy: AuthRateLimitPolicy
): Promise<AuthRateLimitStatus> {
  validateScope(key, policy);
  const duration = policy.windowMs;

  const [bucket] = await db.insert(authRateLimitBuckets).values({
    bucketKey: key,
    attempts: 1,
    expiresAt: sql`now() + (${duration} * interval '1 millisecond')`,
    updatedAt: sql`now()`
  }).onConflictDoUpdate({
    target: authRateLimitBuckets.bucketKey,
    set: {
      attempts: sql`case when ${authRateLimitBuckets.expiresAt} <= now()
        then 1 else least(${authRateLimitBuckets.attempts} + 1, 2147483647) end`,
      expiresAt: sql`case when ${authRateLimitBuckets.expiresAt} <= now()
        then now() + (${duration} * interval '1 millisecond')
        else ${authRateLimitBuckets.expiresAt} end`,
      updatedAt: sql`now()`
    }
  }).returning({
    attempts: authRateLimitBuckets.attempts,
    expiresAt: authRateLimitBuckets.expiresAt
  });

  return {
    allowed: bucket.attempts <= policy.limit,
    remaining: Math.max(0, policy.limit - bucket.attempts),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt.getTime() - Date.now()) / 1000))
  };
}

export async function consumeDistributedAuthRateLimits(scopes: readonly RateLimitScope[]) {
  if (scopes.length === 0) throw new Error("At least one auth limiter scope is required.");
  // Every scope is reserved before expensive password checks / email delivery.
  // A rejected DB write prevents the request; no in-memory bypass is allowed.
  const decisions = await Promise.all(scopes.map(({ key, policy }) =>
    consumeDistributedAuthRateLimit(key, policy)
  ));
  return decisions.every(decision => decision.allowed);
}

export async function clearDistributedAuthRateLimit(key: string) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid auth rate-limit key.");
  await db.delete(authRateLimitBuckets).where(eq(authRateLimitBuckets.bucketKey, key));
}

/** Intended for an authenticated hourly cron job. Never delete active windows. */
export async function pruneExpiredAuthRateLimits(now = new Date()) {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await db.delete(authRateLimitBuckets).where(lt(authRateLimitBuckets.expiresAt, cutoff));
}
