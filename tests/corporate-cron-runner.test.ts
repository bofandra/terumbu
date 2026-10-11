import assert from "node:assert/strict";
import test from "node:test";

import { runCorporateCronStages } from "../src/lib/corporate-cron-runner";

test("successful corporate cron preserves its existing result fields and stage order", async () => {
  const order: string[] = [];
  const outcome = await runCorporateCronStages({
    reports: async () => { order.push("reports"); return { checked: 2, generated: 1, failed: 0 }; },
    emails: async () => { order.push("emails"); return { sent: 1 }; },
    deliveryEvents: async () => { order.push("deliveryEvents"); return { applied: 3 }; },
    prune: async () => { order.push("prune"); return 4; }
  });
  assert.deepEqual(order, ["reports", "emails", "deliveryEvents", "prune"]);
  assert.deepEqual(outcome, {
    ok: true,
    reports: { checked: 2, generated: 1, failed: 0 },
    emails: { sent: 1 },
    deliveryEvents: { applied: 3 },
    removedEvents: 4
  });
});

test("report failure cannot block outbox delivery, event replay, or journal pruning", async () => {
  const order: string[] = [];
  const failures: string[] = [];
  const outcome = await runCorporateCronStages({
    reports: async () => { order.push("reports"); throw new Error("private database connection details"); },
    emails: async () => { order.push("emails"); return { sent: 2 }; },
    deliveryEvents: async () => { order.push("deliveryEvents"); return { applied: 1 }; },
    prune: async () => { order.push("prune"); return 5; }
  }, (stage) => failures.push(stage));

  assert.deepEqual(order, ["reports", "emails", "deliveryEvents", "prune"]);
  assert.deepEqual(failures, ["reports"]);
  assert.deepEqual(outcome, {
    ok: false,
    failedStages: ["reports"],
    stages: { reports: "failed", emails: "ok", deliveryEvents: "ok", prune: "ok" }
  });
  assert.equal(JSON.stringify(outcome).includes("private database"), false);
});

test("each later stage also fails independently without starving unrelated cleanup", async () => {
  const attempted: string[] = [];
  const failures: string[] = [];
  const outcome = await runCorporateCronStages({
    reports: async () => { attempted.push("reports"); return { generated: 1 }; },
    emails: async () => { attempted.push("emails"); throw new Error("provider offline"); },
    deliveryEvents: async () => { attempted.push("deliveryEvents"); throw new Error("journal read failed"); },
    prune: async () => { attempted.push("prune"); return 7; }
  }, (stage) => failures.push(stage));
  assert.deepEqual(attempted, ["reports", "emails", "deliveryEvents", "prune"]);
  assert.deepEqual(failures, ["emails", "deliveryEvents"]);
  assert.deepEqual(outcome, {
    ok: false,
    failedStages: ["emails", "deliveryEvents"],
    stages: { reports: "ok", emails: "failed", deliveryEvents: "failed", prune: "ok" }
  });
});

test("all failed stages are reported without leaking underlying exceptions", async () => {
  const failed = async (): Promise<never> => { throw new Error("sensitive failure"); };
  const outcome = await runCorporateCronStages({
    reports: failed, emails: failed, deliveryEvents: failed, prune: failed
  });
  assert.equal(outcome.ok, false);
  if (outcome.ok) assert.fail("Expected failure");
  assert.deepEqual(outcome.failedStages, ["reports", "emails", "deliveryEvents", "prune"]);
  assert.equal(JSON.stringify(outcome).includes("sensitive"), false);
});
