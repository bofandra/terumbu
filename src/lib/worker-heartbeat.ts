import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { workerHeartbeats } from "@/db/schema";

export const HOURLY_WORKERS = ["corporate_reports", "expedition_reminders", "midtrans_compensations", "midtrans_reconciliation"] as const;
export type HourlyWorkerName = (typeof HOURLY_WORKERS)[number];
export type WorkerHeartbeatRow = {
  workerName: HourlyWorkerName;
  lastStatus: string;
  lastStartedAt: Date;
  lastFinishedAt: Date | null;
  lastSucceededAt: Date | null;
  lastFailedAt: Date | null;
  consecutiveFailures: number;
};

export type WorkerHealth = "not_observed" | "running" | "healthy" | "degraded" | "failing" | "stale";
export const WORKER_STALE_AFTER_MINUTES = 150;

/** A missing worker row is a warning, not an assertion that the service is down. */
export function workerHeartbeatHealth(row: WorkerHeartbeatRow | null, now = new Date()): WorkerHealth {
  if (!row) return "not_observed";
  if (now.getTime() - row.lastStartedAt.getTime() > WORKER_STALE_AFTER_MINUTES * 60_000) return "stale";
  if (row.consecutiveFailures >= 2) return "failing";
  if (row.lastStatus === "running") return "running";
  if (row.lastStatus === "success" && row.consecutiveFailures === 0) return "healthy";
  return "degraded";
}

/**
 * Commit start and finish independently, and use a run UUID as a fencing
 * token so an older concurrent invocation cannot overwrite a newer run.
 * Only authenticated cron handlers may call this wrapper.
 */
export async function runWithWorkerHeartbeat<T>(
  workerName: HourlyWorkerName,
  task: () => Promise<T>,
  successful: (result: T) => boolean = () => true
): Promise<T> {
  const runId = randomUUID();
  const startedAt = new Date();

  await db.insert(workerHeartbeats).values({
    workerName,
    runId,
    lastStartedAt: startedAt,
    lastStatus: "running",
    lastFinishedAt: null,
    updatedAt: startedAt
  }).onConflictDoUpdate({
    target: workerHeartbeats.workerName,
    set: {
      runId,
      lastStartedAt: startedAt,
      lastFinishedAt: null,
      lastStatus: "running",
      updatedAt: startedAt
    }
  });

  async function finish(ok: boolean) {
    const now = new Date();
    await db.update(workerHeartbeats).set({
      lastStatus: ok ? "success" : "failed",
      lastFinishedAt: now,
      ...(ok ? { lastSucceededAt: now, consecutiveFailures: 0 } : {
        lastFailedAt: now,
        consecutiveFailures: sql<number>`${workerHeartbeats.consecutiveFailures} + 1`
      }),
      updatedAt: now
    }).where(and(eq(workerHeartbeats.workerName, workerName), eq(workerHeartbeats.runId, runId)));
  }

  let completed = false;
  try {
    const result = await task();
    completed = true;
    await finish(successful(result));
    return result;
  } catch (error) {
    // Do not turn a failed task into success; do not log sensitive exceptions.
    // If the database is unavailable, propagate the original failure.
    if (!completed) {
      try { await finish(false); } catch { console.error("Worker heartbeat finalization failed", { workerName }); }
    }
    throw error;
  }
}
