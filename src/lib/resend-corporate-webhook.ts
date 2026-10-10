import { createHmac, timingSafeEqual } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";

import { db } from "@/db/client";
import { emailLogs, resendWebhookEvents } from "@/db/schema";
import { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-email-template";

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

/**
 * Update only accepted corporate report alerts, never queued/retry/cancelled jobs.
 * A monotonic event timestamp avoids older events overriding a newer result.
 */
export async function reconcileResendCorporateDelivery(event: CorporateEmailDeliveryEvent, now = new Date()) {
  const changed = await db.update(emailLogs).set({
    status: event.status,
    providerEventType: event.type,
    providerEventAt: event.occurredAt,
    deliveryError: corporateProviderDeliveryError(event),
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

function corporateProviderDeliveryError(event: CorporateEmailDeliveryEvent) {
  return event.status === "bounced" || event.status === "complained" ||
    event.status === "provider_failed" || event.status === "suppressed"
    ? event.type.replace(".", "_") : null;
}

/**
 * Store the verified delivery event before returning 200.
 * The insert and attempted reconciliation share one transaction, preventing
 * a successful acknowledgement from losing the event during a send/commit race.
 */
export async function recordResendCorporateDelivery(
  eventId: string,
  event: CorporateEmailDeliveryEvent,
  now = new Date()
) {
  if (!eventId || eventId.length > 256) throw new Error("invalid_event_id");
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(resendWebhookEvents).values({
      eventId,
      providerMessageId: event.emailId,
      eventType: event.type,
      eventAt: event.occurredAt,
      receivedAt: now
    }).onConflictDoNothing().returning({ eventId: resendWebhookEvents.eventId });
    if (inserted.length === 0) return { recorded: false, applied: false };

    const changed = await tx.update(emailLogs).set({
      status: event.status,
      providerEventType: event.type,
      providerEventAt: event.occurredAt,
      deliveryError: corporateProviderDeliveryError(event),
      updatedAt: now
    }).where(and(
      eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE),
      eq(emailLogs.providerMessageId, event.emailId),
      inArray(emailLogs.status, [
        "sent", "delivered", "delivery_delayed", "bounced", "complained", "provider_failed", "suppressed"
      ]),
      or(isNull(emailLogs.providerEventAt), lt(emailLogs.providerEventAt, event.occurredAt))
    )).returning({ id: emailLogs.id });

    if (changed.length > 0) {
      await tx.update(resendWebhookEvents).set({ appliedAt: now })
        .where(eq(resendWebhookEvents.eventId, eventId));
    }
    return { recorded: true, applied: changed.length > 0 };
  });
}

/**
 * Called immediately after a provider ID is saved on an accepted send.
 * If the webhook committed earlier, the most recent stored event is replayed.
 * If it is still in flight, its own conditional update observes the committed
 * "sent" row and applies itself. Both interleavings are safe.
 */
export async function replayResendCorporateDeliveryForProvider(providerMessageId: string, now = new Date()) {
  const [latest] = await db.select({
    eventId: resendWebhookEvents.eventId,
    eventType: resendWebhookEvents.eventType,
    eventAt: resendWebhookEvents.eventAt
  }).from(resendWebhookEvents)
    .where(eq(resendWebhookEvents.providerMessageId, providerMessageId))
    .orderBy(desc(resendWebhookEvents.eventAt), desc(resendWebhookEvents.eventId))
    .limit(1);
  if (!latest || !(latest.eventType in allowedEvents)) return 0;
  const type = latest.eventType as keyof typeof allowedEvents;
  const changed = await reconcileResendCorporateDelivery({
    type, emailId: providerMessageId, occurredAt: latest.eventAt, status: allowedEvents[type]
  }, now);
  if (changed > 0) {
    await db.update(resendWebhookEvents).set({ appliedAt: now })
      .where(eq(resendWebhookEvents.eventId, latest.eventId));
  }
  return changed;
}

/**
 * Recover early events if the send worker accepted the provider ID but
 * crashed before the inline replay. Match at the database boundary so
 * unrelated Resend traffic never enters the retry batch.
 */
export async function reconcilePendingResendCorporateDeliveryEvents(now = new Date()) {
  const pending = await db.select({
    eventId: resendWebhookEvents.eventId,
    eventType: resendWebhookEvents.eventType,
    eventAt: resendWebhookEvents.eventAt,
    providerMessageId: resendWebhookEvents.providerMessageId
  }).from(resendWebhookEvents)
    .innerJoin(emailLogs, eq(emailLogs.providerMessageId, resendWebhookEvents.providerMessageId))
    .where(and(
      isNull(resendWebhookEvents.appliedAt),
      eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE),
      inArray(emailLogs.status, [
        "sent", "delivered", "delivery_delayed", "bounced", "complained", "provider_failed", "suppressed"
      ])
    )).orderBy(asc(resendWebhookEvents.eventAt), asc(resendWebhookEvents.eventId)).limit(200);

  let applied = 0;
  for (const entry of pending) {
    if (!(entry.eventType in allowedEvents)) continue;
    const type = entry.eventType as keyof typeof allowedEvents;
    applied += await reconcileResendCorporateDelivery({
      type, emailId: entry.providerMessageId, occurredAt: entry.eventAt, status: allowedEvents[type]
    }, now);
    // Also mark superseded events processed so they do not starve the queue.
    await db.update(resendWebhookEvents).set({ appliedAt: now })
      .where(and(eq(resendWebhookEvents.eventId, entry.eventId), isNull(resendWebhookEvents.appliedAt)));
  }
  return { checked: pending.length, applied };
}

const EVENT_RETENTION_HOURS = 72;
const EVENT_PRUNE_BATCH = 200;

/** Keep the private journal bounded, without storing raw payloads/PII. */
export async function pruneResendCorporateDeliveryEvents(now = new Date()) {
  const cutoff = new Date(now.getTime() - EVENT_RETENTION_HOURS * 3_600_000);
  const stale = await db.select({ id: resendWebhookEvents.eventId })
    .from(resendWebhookEvents)
    .where(lte(resendWebhookEvents.receivedAt, cutoff))
    .orderBy(asc(resendWebhookEvents.receivedAt))
    .limit(EVENT_PRUNE_BATCH);
  if (stale.length === 0) return 0;
  const removed = await db.delete(resendWebhookEvents)
    .where(inArray(resendWebhookEvents.eventId, stale.map((item) => item.id)))
    .returning({ eventId: resendWebhookEvents.eventId });
  return removed.length;
}
