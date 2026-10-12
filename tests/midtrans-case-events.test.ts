import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import {
  parseCompensationCaseEvent,
  CASE_EVENT_LABELS
} from "../src/lib/midtrans-case-events";

const valid = {
  eventId: randomUUID(),
  operationId: randomUUID(),
  eventType: "contact_attempted",
  channel: "support_ticket",
  ticketReference: "SUPPORT-123456"
};

test("accept minimal case events without storing PII and reject arbitrary free-text evidence", () => {
  assert.deepEqual(parseCompensationCaseEvent(valid), valid);
  for (const ticketReference of [
    "x", "name@example.org", "123 456", "https://support.example",
    "+62812345678", "a".repeat(65)
  ]) {
    assert.equal(parseCompensationCaseEvent({ ...valid, ticketReference }), null);
  }
  assert.equal(parseCompensationCaseEvent({ ...valid, eventId: "not-a-uuid" }), null);
  assert.equal(parseCompensationCaseEvent({ ...valid, eventType: "provider_refunded" }), null);
});

test("customer confirmation can only be logged from customer communication, never provider portal", () => {
  assert.equal(parseCompensationCaseEvent({
    ...valid, eventType: "customer_reports_received", channel: "provider_portal"
  }), null);
  assert.notEqual(parseCompensationCaseEvent({
    ...valid, eventType: "customer_reports_received", channel: "verified_email"
  }), null);
  assert.match(CASE_EVENT_LABELS.customer_reports_received, /unverified/i);
  assert.equal(parseCompensationCaseEvent({
    ...valid, eventType: "provider_trace_requested", channel: "verified_phone"
  }), null);
});
