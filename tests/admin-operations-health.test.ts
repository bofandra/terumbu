import assert from "node:assert/strict";
import test from "node:test";

import { adminOperationsAlerts, type AdminOperationsMetrics } from "../src/lib/admin-operations-health";

const now = new Date("2026-10-11T12:00:00.000Z");

function snapshot(): AdminOperationsMetrics {
  return {
    checkedAt: now,
    workers: [],
    reports: { scheduled: 0, due: 0, overdue: 0, retrying: 0, lastScheduledGenerationAt: null },
    emails: {
      queued: 0, sending: 0, retry: 0, failed: 0, accepted: 0,
      delivered: 0, deliveryIssues: 0, staleQueued: 0, expiredClaims: 0,
      lastProviderEventAt: null
    },
    webhook: { pending: 0, stalePending: 0, lastReceivedAt: null }
  };
}

test("an empty database snapshot has no actionable alerts", () => {
  assert.deepEqual(adminOperationsAlerts(snapshot()), []);
});

test("normal scheduled work, emails and fresh webhook events are not falsely alerted", () => {
  const data = snapshot();
  data.reports.scheduled = 7;
  data.reports.due = 3;
  data.emails.queued = 3;
  data.emails.retry = 2;
  data.emails.accepted = 4;
  data.emails.delivered = 8;
  data.webhook.pending = 2;
  assert.deepEqual(adminOperationsAlerts(data), []);
});

test("the monitor flags only actionable backlog and terminal delivery failures", () => {
  const data = snapshot();
  data.reports.overdue = 2;
  data.reports.retrying = 3;
  data.emails.failed = 1;
  data.emails.deliveryIssues = 5;
  data.emails.staleQueued = 4;
  data.emails.expiredClaims = 2;
  data.webhook.stalePending = 6;
  assert.deepEqual(adminOperationsAlerts(data).map((entry) => [entry.key, entry.count]), [
    ["overdue-reports", 2],
    ["report-retries", 3],
    ["email-failures", 1],
    ["delivery-problems", 5],
    ["stale-emails", 4],
    ["expired-email-leases", 2],
    ["unreconciled-events", 6]
  ]);
});

test("invalid and zero threshold values do not create alerts", () => {
  const data = snapshot();
  data.reports.overdue = Number.NaN;
  data.emails.failed = -1;
  data.webhook.stalePending = 0;
  assert.equal(adminOperationsAlerts(data).length, 0);
});

test("worker health flags missing, stale, and consecutive failed invocations", () => {
  const data = snapshot();
  data.workers = [
    { name: "corporate_reports", health: "stale", consecutiveFailures: 0, lastStartedAt: now, lastFinishedAt: null, lastSucceededAt: null, lastFailedAt: null },
    { name: "expedition_reminders", health: "failing", consecutiveFailures: 3, lastStartedAt: now, lastFinishedAt: now, lastSucceededAt: null, lastFailedAt: now }
  ];
  assert.deepEqual(adminOperationsAlerts(data).slice(0, 2).map((alert) => [alert.key, alert.count]), [
    ["corporate_reports-stale", 1], ["expedition_reminders-failing", 3]
  ]);
  data.workers[0].health = "not_observed";
  assert.equal(adminOperationsAlerts(data)[0].key, "corporate_reports-unobserved");
});
