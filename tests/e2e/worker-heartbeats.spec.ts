import assert from "node:assert/strict";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { runWithWorkerHeartbeat } from "../../src/lib/worker-heartbeat";
import { loginAs } from "./support";

test("durable worker heartbeats fence failures, recover, and stay admin-only", async ({ browser, request }) => {
  test.setTimeout(120_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const page = await browser.newPage();
  try {
    // Invalid requests must never create/refresh scheduler heartbeats.
    expect((await request.post("/api/cron/corporate-reports")).status()).toBe(401);
    expect((await request.post("/api/cron/expedition-reminders")).status()).toBe(401);

    const successfulRun = () => runWithWorkerHeartbeat("expedition_reminders", async () => "ok");
    await successfulRun();
    let [heartbeat] = await sql<{ last_status: string; consecutive_failures: number; last_started_at: Date; last_succeeded_at: Date; last_finished_at: Date }[]>`
      select last_status, consecutive_failures, last_started_at, last_succeeded_at, last_finished_at
      from worker_heartbeats where worker_name = 'expedition_reminders'
    `;
    expect(heartbeat.last_status).toBe("success");
    expect(heartbeat.consecutive_failures).toBe(0);
    expect(heartbeat.last_started_at).toBeTruthy();
    expect(heartbeat.last_succeeded_at).toBeTruthy();
    expect(heartbeat.last_finished_at).toBeTruthy();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await assert.rejects(
        runWithWorkerHeartbeat("expedition_reminders", async () => { throw new Error("Simulated provider outage"); }),
        /Simulated provider outage/
      );
    }
    [heartbeat] = await sql`
      select last_status, consecutive_failures, last_started_at, last_succeeded_at, last_finished_at
      from worker_heartbeats where worker_name = 'expedition_reminders'
    `;
    expect(heartbeat.last_status).toBe("failed");
    expect(heartbeat.consecutive_failures).toBe(2);

    await loginAs(page, "admin.demo@terumbu.eco", "/admin/operations");
    const worker = page.getByTestId("worker-heartbeat-expedition_reminders");
    await expect(worker).toContainText("Status: failing");
    await expect(worker).toContainText("Consecutive failed runs: 2");
    await expect(page.getByTestId("operations-alerts")).toContainText("repeated failures");
    await successfulRun();
    await page.reload();
    await expect(worker).toContainText("Status: healthy");
    await expect(worker).toContainText("Consecutive failed runs: 0");
  } finally {
    await page.close();
    await sql.end();
  }
});
