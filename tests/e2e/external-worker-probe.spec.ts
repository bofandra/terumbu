import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

type HeartbeatRow = {
  worker_name: string;
  run_id: string;
  last_started_at: Date;
  last_finished_at: Date | null;
  last_succeeded_at: Date | null;
  last_failed_at: Date | null;
  last_status: string;
  consecutive_failures: number;
  updated_at: Date;
};

test("public external probe exposes only coarse health and detects silent/stale/failing workers", async ({ request }) => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const names = ["corporate_reports", "expedition_reminders", "midtrans_compensations"];
  const previous = await sql<HeartbeatRow[]>`
    select * from worker_heartbeats
    where worker_name in ('corporate_reports', 'expedition_reminders', 'midtrans_compensations')
  `;
  try {
    await sql`delete from worker_heartbeats where worker_name in ('corporate_reports', 'expedition_reminders', 'midtrans_compensations')`;
    const missing = await request.get("/api/health/workers");
    expect(missing.status()).toBe(503);
    expect(await missing.json()).toEqual({ status: "unhealthy" });
    expect((await request.post("/api/cron/midtrans-compensations")).status()).toBe(401);
    expect(missing.headers()["cache-control"]).toContain("no-store");

    for (const name of names) {
      await sql`
        insert into worker_heartbeats
          (worker_name, run_id, last_started_at, last_finished_at,
           last_succeeded_at, last_failed_at, last_status, consecutive_failures)
        values (${name}, ${randomUUID()}, now() - interval '1 minute',
          now(), now(), null, 'success', 0)
      `;
    }
    const healthy = await request.get("/api/health/workers");
    expect(healthy.status()).toBe(200);
    expect(await healthy.json()).toEqual({ status: "ok" });

    await sql`
      update worker_heartbeats
      set last_started_at = now() - interval '180 minutes'
      where worker_name = 'expedition_reminders'
    `;
    const stale = await request.get("/api/health/workers");
    expect(stale.status()).toBe(503);
    expect(await stale.json()).toEqual({ status: "unhealthy" });

    await sql`
      update worker_heartbeats
      set last_started_at = now() - interval '1 minute',
          last_status = 'failed', consecutive_failures = 2,
          last_failed_at = now()
      where worker_name = 'expedition_reminders'
    `;
    const failing = await request.get("/api/health/workers");
    expect(failing.status()).toBe(503);
    const data = await failing.json();
    expect(data).toEqual({ status: "unhealthy" });
    expect(JSON.stringify(data)).not.toContain("expedition_reminders");
    expect(JSON.stringify(data)).not.toContain("last_failed_at");
  } finally {
    await sql`delete from worker_heartbeats where worker_name in ('corporate_reports', 'expedition_reminders', 'midtrans_compensations')`;
    for (const row of previous) {
      await sql`
        insert into worker_heartbeats (
          worker_name, run_id, last_started_at, last_finished_at,
          last_succeeded_at, last_failed_at, last_status,
          consecutive_failures, updated_at
        ) values (
          ${row.worker_name}, ${row.run_id}, ${row.last_started_at},
          ${row.last_finished_at}, ${row.last_succeeded_at},
          ${row.last_failed_at}, ${row.last_status},
          ${row.consecutive_failures}, ${row.updated_at}
        )
      `;
    }
    await sql.end();
  }
});
