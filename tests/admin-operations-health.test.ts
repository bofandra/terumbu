import assert from "node:assert/strict";
import test from "node:test";

import { adminOperationsAlerts, type AdminOperationsMetrics } from "../src/lib/admin-operations-health";

const now = new Date("2026-10-11T12:00:00.000Z");

function snapshot(): AdminOperationsMetrics {
  return {
    checkedAt: now,
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
