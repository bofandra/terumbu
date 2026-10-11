import assert from "node:assert/strict";
import test from "node:test";

import { workerHeartbeatHealth, WORKER_STALE_AFTER_MINUTES, type WorkerHeartbeatRow } from "../src/lib/worker-heartbeat";

const now = new Date("2026-10-11T12:00:00.000Z");
function row(): WorkerHeartbeatRow {
  return {
    workerName: "corporate_reports", lastStatus: "success",
    lastStartedAt: new Date("2026-10-11T11:00:00.000Z"),
    lastFinishedAt: new Date("2026-10-11T11:01:00.000Z"),
    lastSucceededAt: new Date("2026-10-11T11:01:00.000Z"),
    lastFailedAt: null, consecutiveFailures: 0
  };
}

test("worker heartbeat uses actual authenticated invocation rather than inferred work", () => {
  assert.equal(workerHeartbeatHealth(null, now), "not_observed");
  assert.equal(workerHeartbeatHealth(row(), now), "healthy");
  const active = row();
  active.lastStatus = "running";
  assert.equal(workerHeartbeatHealth(active, now), "running");
  assert.equal(WORKER_STALE_AFTER_MINUTES, 150);
});

test("failed and stale workers are distinguished and recover on success", () => {
  const firstFailure = row();
  firstFailure.lastStatus = "failed";
  firstFailure.consecutiveFailures = 1;
  assert.equal(workerHeartbeatHealth(firstFailure, now), "degraded");
  firstFailure.consecutiveFailures = 2;
  assert.equal(workerHeartbeatHealth(firstFailure, now), "failing");
  firstFailure.lastStartedAt = new Date(now.getTime() - 151 * 60_000);
  assert.equal(workerHeartbeatHealth(firstFailure, now), "stale");
  firstFailure.lastStartedAt = new Date(now.getTime() - 149 * 60_000);
  firstFailure.lastStatus = "success";
  firstFailure.consecutiveFailures = 0;
  assert.equal(workerHeartbeatHealth(firstFailure, now), "healthy");
});
