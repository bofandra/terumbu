import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import { authRateLimitBuckets } from "../../src/db/schema";
import { authRateLimitKey } from "../../src/lib/auth-rate-limit";
import {
  clearDistributedAuthRateLimit,
  consumeDistributedAuthRateLimit,
  consumeDistributedAuthRateLimits,
  pruneExpiredAuthRateLimits
} from "../../src/lib/distributed-auth-rate-limit";

test("PostgreSQL atomic buckets limit concurrent attempts across all application handlers", async () => {
  const key = authRateLimitKey("e2e-concurrency", randomUUID());
  const policy = { limit: 3, windowMs: 60_000 };
  try {
    const outcomes = await Promise.all(Array.from({ length: 12 }, () =>
      consumeDistributedAuthRateLimit(key, policy)
    ));
    expect(outcomes.filter(result => result.allowed)).toHaveLength(3);
    expect(outcomes.filter(result => !result.allowed)).toHaveLength(9);

    const [record] = await db.select({
      attempts: authRateLimitBuckets.attempts,
      bucketKey: authRateLimitBuckets.bucketKey
    }).from(authRateLimitBuckets).where(eq(authRateLimitBuckets.bucketKey, key));
    expect(record).toMatchObject({ attempts: 12, bucketKey: key });

    // A rolled-over time window must reset the counter in the same atomic upsert.
    await db.update(authRateLimitBuckets)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(authRateLimitBuckets.bucketKey, key));
    const renewed = await consumeDistributedAuthRateLimit(key, policy);
    expect(renewed.allowed).toBe(true);
    expect(renewed.remaining).toBe(2);
  } finally {
    await clearDistributedAuthRateLimit(key);
  }
});

test("account-wide buckets cannot be evaded by changing a client identifier", async () => {
  const accountKey = authRateLimitKey("e2e-account", randomUUID());
  const pairKeys = Array.from({ length: 4 }, () => authRateLimitKey("e2e-pair", randomUUID()));
  try {
    const outcomes = await Promise.all(pairKeys.map(key =>
      consumeDistributedAuthRateLimits([
        { key, policy: { limit: 5, windowMs: 30_000 } },
        { key: accountKey, policy: { limit: 2, windowMs: 30_000 } }
      ])
    ));
    expect(outcomes.filter(Boolean)).toHaveLength(2);
    const [record] = await db.select({ attempts: authRateLimitBuckets.attempts })
      .from(authRateLimitBuckets).where(eq(authRateLimitBuckets.bucketKey, accountKey));
    expect(record.attempts).toBe(4);
  } finally {
    await Promise.all([accountKey, ...pairKeys].map(clearDistributedAuthRateLimit));
  }
});

test("expired auth buckets can be cleaned without deleting live windows", async () => {
  const expiredKey = authRateLimitKey("e2e-expired", randomUUID());
  const liveKey = authRateLimitKey("e2e-live", randomUUID());
  const policy = { limit: 2, windowMs: 60_000 };
  try {
    await Promise.all([expiredKey, liveKey].map(key => consumeDistributedAuthRateLimit(key, policy)));
    await db.update(authRateLimitBuckets)
      .set({ expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60_000) })
      .where(eq(authRateLimitBuckets.bucketKey, expiredKey));
    await pruneExpiredAuthRateLimits();
    const records = await db.select({ key: authRateLimitBuckets.bucketKey })
      .from(authRateLimitBuckets);
    expect(records.some(item => item.key === expiredKey)).toBe(false);
    expect(records.some(item => item.key === liveKey)).toBe(true);
  } finally {
    await Promise.all([expiredKey, liveKey].map(clearDistributedAuthRateLimit));
  }
});
