import { createHmac, timingSafeEqual } from "node:crypto";

import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";

import { db } from "@/db/client";
import { emailLogs } from "@/db/schema";
import { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-alert-email";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const allowedEvents = {
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "provider_failed",
  "email.suppressed": "suppressed"
} as const;

export type CorporateEmailDeliveryEvent = {
  type: keyof typeof allowedEvents;
  emailId: string;
  occurredAt: Date;
  status: (typeof allowedEvents)[keyof typeof allowedEvents];
};

export function verifyResendCorporateWebhook(
  rawBody: string,
  headers: Headers,
  secret: string | undefined,
  now = new Date()
) {
  if (!secret?.startsWith("whsec_")) return false;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || id.length > 256 || !timestamp || !/^\d{10,11}$/.test(timestamp) || !signature) return false;
  const signedAt = Number(timestamp) * 1000;
  if (!Number.isSafeInteger(signedAt) || Math.abs(now.getTime() - signedAt) > MAX_CLOCK_SKEW_MS) return false;

  const encodedKey = secret.slice("whsec_".length);
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(encodedKey)) return false;
  const key = Buffer.from(encodedKey.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (key.length < 16) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signature.split(/\s+/).some((item) => {
    if (!item.startsWith("v1,")) return false;
    const encoded = item.slice(3);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
    const actual = Buffer.from(encoded, "base64");
    return actual.length === expected.length && timingSafeEqual(expected, actual);
  });
}

export function parseResendCorporateDeliveryEvent(rawBody: string): CorporateEmailDeliveryEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const input = payload as Record<string, unknown>;
  if (typeof input.type !== "string" || !(input.type in allowedEvents)) return null;
  const type = input.type as keyof typeof allowedEvents;
  const data = input.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const emailId = (data as Record<string, unknown>).email_id;
  if (typeof emailId !== "string" || emailId.length < 1 || emailId.length > 255) return null;
  if (typeof input.created_at !== "string") return null;
  const occurredAt = new Date(input.created_at);
  if (!Number.isFinite(occurredAt.getTime())) return null;
  return { type, emailId, occurredAt, status: allowedEvents[type] };
}

/** Update only previously accepted corporate report alert emails.
 * The event timestamp guard makes retried and out-of-order webhooks harmless.
 * This never schedules a second email or changes the worker retry state.
 */
export async function reconcileResendCorporateDelivery(event: CorporateEmailDeliveryEvent, now = new Date()) {
  const changed = await db.update(emailLogs).set({
    status: event.status,
    providerEventType: event.type,
    providerEventAt: event.occurredAt,
    deliveryError: event.status === "bounced" || event.status === "complained" ||
      event.status === "provider_failed" || event.status === "suppressed"
      ? event.type.replace(".", "_") : null,
    updatedAt: now
  }).where(and(
    eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE),
    eq(emailLogs.providerMessageId, event.emailId),
    inArray(emailLogs.status, [
      "sent", "delivered", "delivery_delayed", "bounced", "complained", "provider_failed", "suppressed"
    ]),
    or(isNull(emailLogs.providerEventAt), lt(emailLogs.providerEventAt, event.occurredAt))
  )).returning({ id: emailLogs.id });
  return changed.length;
}
