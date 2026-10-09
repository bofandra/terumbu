import assert from "node:assert/strict";
import test from "node:test";

import {
  corporateReportAlertEmailExpired,
  corporateReportAlertEmailRetryable,
  corporateReportEmailDeliveryKey,
  corporateReportEmailRetryDelayMinutes
} from "../src/lib/corporate-report-alert-email";

test("email outbox keys are stable per notification rather than per retry", () => {
  const id = "89c28a26-1124-49fa-838d-67c5dfcb3456";
  assert.equal(corporateReportEmailDeliveryKey(id), `corporate-report-alert-${id}`);
  assert.equal(corporateReportEmailDeliveryKey(id), corporateReportEmailDeliveryKey(id));
});

test("delivery retries back off with a cap and do not exceed the provider deduplication window", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(corporateReportEmailRetryDelayMinutes),
    [5, 15, 45, 135, 240, 240, 240]);
  const createdAt = new Date("2026-10-10T00:00:00.000Z");
  assert.equal(corporateReportAlertEmailExpired(createdAt, new Date("2026-10-10T22:59:59.000Z")), false);
  assert.equal(corporateReportAlertEmailExpired(createdAt, new Date("2026-10-10T23:00:00.000Z")), true);
});

test("only provider rate limits, conflicts, and server errors are retryable", () => {
  for (const status of [409, 429, 500, 502, 503]) {
    assert.equal(corporateReportAlertEmailRetryable(status), true);
  }
  for (const status of [400, 401, 403, 404, 422]) {
    assert.equal(corporateReportAlertEmailRetryable(status), false);
  }
});
