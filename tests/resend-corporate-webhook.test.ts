import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  parseResendCorporateDeliveryEvent,
  verifyResendCorporateWebhook
} from "../src/lib/resend-corporate-webhook";

const secret = `whsec_${Buffer.from("terumbu-webhook-test-key-2026!").toString("base64")}`;
const now = new Date("2026-10-10T01:00:00.000Z");
const timestamp = String(Math.floor(now.getTime() / 1000));
const payload = JSON.stringify({
  type: "email.delivered",
  created_at: "2026-10-10T00:59:58.000Z",
  data: { email_id: "provider-email-123", to: ["recipient@example.com"] }
});

function headers(body: string, id = "msg_abc", ts = timestamp, key = secret) {
  const signature = createHmac("sha256", Buffer.from(key.slice(6), "base64"))
    .update(`${id}.${ts}.${body}`).digest("base64");
  return new Headers({
    "svix-id": id,
    "svix-timestamp": ts,
    "svix-signature": `v1,${signature}`
  });
}

test("verified Resend webhook signature binds raw bytes, message id and time", () => {
  assert.equal(verifyResendCorporateWebhook(payload, headers(payload), secret, now), true);
  assert.equal(verifyResendCorporateWebhook(payload + " ", headers(payload), secret, now), false);
  assert.equal(verifyResendCorporateWebhook(payload, headers(payload, "other"), secret, now), true);
  assert.equal(verifyResendCorporateWebhook(payload, headers(payload), "whsec_invalid", now), false);
  assert.equal(verifyResendCorporateWebhook(payload, headers(payload), undefined, now), false);
  assert.equal(verifyResendCorporateWebhook(payload, new Headers(), secret, now), false);
  assert.equal(verifyResendCorporateWebhook(payload, headers(payload, "msg_abc", String(Number(timestamp) - 301)), secret, now), false);
  assert.equal(verifyResendCorporateWebhook(payload, headers(payload, "msg_abc", String(Number(timestamp) + 301)), secret, now), false);
});

test("multiple rotated signatures are accepted if a valid v1 signature exists", () => {
  const valid = headers(payload);
  valid.set("svix-signature", "v1,not-base64! " + valid.get("svix-signature"));
  assert.equal(verifyResendCorporateWebhook(payload, valid, secret, now), true);
  valid.set("svix-signature", "v1,aaaa");
  assert.equal(verifyResendCorporateWebhook(payload, valid, secret, now), false);
});

test("only explicit delivery outcomes with a provider email ID are processed", () => {
  const delivered = parseResendCorporateDeliveryEvent(payload);
  assert.deepEqual(delivered, {
    type: "email.delivered", emailId: "provider-email-123",
    occurredAt: new Date("2026-10-10T00:59:58.000Z"), status: "delivered"
  });
  for (const [type, expected] of [
    ["email.delivery_delayed", "delivery_delayed"],
    ["email.bounced", "bounced"],
    ["email.complained", "complained"],
    ["email.failed", "provider_failed"],
    ["email.suppressed", "suppressed"]
  ]) {
    assert.equal(parseResendCorporateDeliveryEvent(JSON.stringify({
      type, created_at: "2026-10-10T00:59:58Z", data: { email_id: "provider-email-123" }
    }))?.status, expected);
  }
  assert.equal(parseResendCorporateDeliveryEvent("{broken"), null);
  assert.equal(parseResendCorporateDeliveryEvent(JSON.stringify({
    type: "email.opened", created_at: now.toISOString(), data: { email_id: "provider-email-123" }
  })), null);
  assert.equal(parseResendCorporateDeliveryEvent(JSON.stringify({
    type: "email.delivered", created_at: "invalid", data: { email_id: "provider-email-123" }
  })), null);
});
