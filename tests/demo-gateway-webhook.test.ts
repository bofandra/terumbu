import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  demoGatewayWebhookSecret,
  isValidDemoGatewayWebhookSignature
} from "../src/lib/demo-gateway-webhook";

const body = JSON.stringify({
  providerReference: "DEMO-2026-ABC123",
  status: "paid"
});
const secret = "test-webhook-secret";

function signatureFor(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("hex");
}

test("demo gateway webhook requires a configured non-empty secret", () => {
  assert.equal(demoGatewayWebhookSecret(undefined), null);
  assert.equal(demoGatewayWebhookSecret("   "), null);
  assert.equal(demoGatewayWebhookSecret("  configured-secret  "), "configured-secret");
  assert.equal(isValidDemoGatewayWebhookSignature(body, signatureFor(body, secret), undefined), false);
});

test("demo gateway webhook rejects missing, malformed, and incorrect signatures", () => {
  assert.equal(isValidDemoGatewayWebhookSignature(body, null, secret), false);
  assert.equal(isValidDemoGatewayWebhookSignature(body, "not-hex", secret), false);
  assert.equal(isValidDemoGatewayWebhookSignature(body, "ab".repeat(31), secret), false);
  assert.equal(isValidDemoGatewayWebhookSignature(body, "00".repeat(32), secret), false);
});

test("demo gateway webhook accepts only the HMAC SHA-256 signature for the exact payload", () => {
  const signature = signatureFor(body, secret);

  assert.equal(isValidDemoGatewayWebhookSignature(body, signature, secret), true);
  assert.equal(isValidDemoGatewayWebhookSignature(body, signature.toUpperCase(), secret), true);
  assert.equal(isValidDemoGatewayWebhookSignature(`${body} `, signature, secret), false);
});
