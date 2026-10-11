import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { workerHeartbeats } from "@/db/schema";
import { HOURLY_WORKERS, workerHeartbeatHealth } from "@/lib/worker-heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" };

/**
 * Deliberately public for an independent monitor. No names, run timestamps,
 * error details, user data or provider identifiers are exposed.
 * Missing/stale/repeatedly failing scheduler runs are not healthy.
 */
export async function GET() {
  try {
    const rows = await db.select({
      workerName: workerHeartbeats.workerName,
      lastStatus: workerHeartbeats.lastStatus,
      lastStartedAt: workerHeartbeats.lastStartedAt,
      lastFinishedAt: workerHeartbeats.lastFinishedAt,
      lastSucceededAt: workerHeartbeats.lastSucceededAt,
      lastFailedAt: workerHeartbeats.lastFailedAt,
      consecutiveFailures: workerHeartbeats.consecutiveFailures
    }).from(workerHeartbeats)
      .where(inArray(workerHeartbeats.workerName, [...HOURLY_WORKERS]));

    const now = new Date();
    const healthy = HOURLY_WORKERS.every((name) => {
      const row = rows.find((entry) => entry.workerName === name);
      if (!row) return false;
      const health = workerHeartbeatHealth({ ...row, workerName: name }, now);
      return health !== "not_observed" && health !== "stale" && health !== "failing";
    });

    return NextResponse.json(
      { status: healthy ? "ok" : "unhealthy" },
      { status: healthy ? 200 : 503, headers }
    );
  } catch {
    // An unreachable database is also an unhealthy external monitor result.
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }
}
