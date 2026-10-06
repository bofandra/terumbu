import { createHmac, timingSafeEqual } from "node:crypto";

const sha256HexPattern = /^[0-9a-f]{64}$/i;

export function demoGatewayWebhookSecret(value = process.env.DEMO_GATEWAY_WEBHOOK_SECRET) {
  const secret = value?.trim();
  return secret || null;
}

export function isValidDemoGatewayWebhookSignature(
  body: string,
  signature: string | null,
  secretValue = process.env.DEMO_GATEWAY_WEBHOOK_SECRET
) {
  const secret = demoGatewayWebhookSecret(secretValue);

  if (!secret || !signature || !sha256HexPattern.test(signature)) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
