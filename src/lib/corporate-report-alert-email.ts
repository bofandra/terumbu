import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { db } from "@/db/client";
import {
  corporatePermissions,
  corporatePrograms,
  corporateReportExports,
  emailLogs,
  roles,
  userNotifications,
  userRoles
} from "@/db/schema";
import { corporateCapabilitiesForPermission } from "@/lib/corporate-permissions";
import { replayResendCorporateDeliveryForProvider } from "@/lib/resend-corporate-webhook";

import { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-email-template";
export { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-email-template";
export const CORPORATE_REPORT_ALERT_EMAIL_BATCH_SIZE = 5;
const CLAIM_MINUTES = 2;
const MAX_ATTEMPTS = 7;
// Resend retains idempotency keys for 24 hours. Do not retry an ambiguous
// delivery beyond that window, when repeating a POST could send twice.
const MAX_DELIVERY_AGE_MS = 23 * 60 * 60 * 1000;

type AlertPayload = {
  notificationId: string;
  reportId: string;
  programId: string;
  exportCode: string;
  failureCount: number;
};

function alertPayload(input: unknown): AlertPayload | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const p = input as Record<string, unknown>;
  if (
    typeof p.notificationId !== "string" ||
    typeof p.reportId !== "string" ||
    typeof p.programId !== "string" ||
    typeof p.exportCode !== "string" ||
    !Number.isSafeInteger(p.failureCount) ||
    Number(p.failureCount) < 1
  ) return null;
  return p as AlertPayload;
}

export function corporateReportEmailDeliveryKey(notificationId: string) {
  return `corporate-report-alert-${notificationId}`;
}

export function corporateReportEmailRetryDelayMinutes(attempt: number) {
  const safeAttempt = Math.max(1, Math.min(7, Number.isSafeInteger(attempt) ? attempt : 1));
  return Math.min(240, 5 * 3 ** (safeAttempt - 1));
}

export function corporateReportAlertEmailRetryable(status: number) {
  return status === 409 || status === 429 || status >= 500;
}

export function corporateReportAlertEmailExpired(createdAt: Date, now: Date) {
  return now.getTime() - createdAt.getTime() >= MAX_DELIVERY_AGE_MS;
}

function buildEmailText(payload: AlertPayload) {
  return [
    "Terumbu.eco — Corporate Reports",
    "",
    `Scheduled PDF report ${payload.exportCode} could not be generated (attempt ${payload.failureCount}).`,
    "Please sign in to the corporate portal, open Reports, and review the next retry and execution history.",
    "",
    "This message was generated automatically. If the report has since succeeded, no action is needed."
  ].join("\n");
}

async function isDeliveryStillRelevant(input: {
  reportId: string;
  programId: string;
  notificationId: string;
  userId: string | null;
}) {
  if (!input.userId) return false;
  const [notification] = await db.select({
    readAt: userNotifications.readAt
  }).from(userNotifications).where(and(
    eq(userNotifications.id, input.notificationId),
    eq(userNotifications.userId, input.userId),
    eq(userNotifications.sourceType, "corporate_report_export"),
    eq(userNotifications.sourceId, input.reportId),
    isNull(userNotifications.readAt)
  )).limit(1);
  if (!notification) return false;

  const [report] = await db.select({ id: corporateReportExports.id })
    .from(corporateReportExports)
    .where(and(
      eq(corporateReportExports.id, input.reportId),
      eq(corporateReportExports.programId, input.programId),
      eq(corporateReportExports.status, "scheduled")
    )).limit(1);
  if (!report) return false;

  const permissions = await db.select({
    permission: corporatePermissions.permission,
    role: roles.key
  }).from(corporatePermissions)
    .innerJoin(corporatePrograms, eq(corporatePrograms.corporateAccountId, corporatePermissions.corporateAccountId))
    .leftJoin(userRoles, eq(userRoles.userId, corporatePermissions.userId))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(
      eq(corporatePermissions.userId, input.userId),
      eq(corporatePrograms.id, input.programId)
    ));
  return !permissions.some((entry) => entry.role === "admin") &&
    permissions.some((entry) => corporateCapabilitiesForPermission(entry.permission).canGenerateReport);
}

type ClaimedEmail = {
  id: string;
  userId: string | null;
  recipientEmail: string;
  subject: string;
  payload: unknown;
  deliveryKey: string | null;
  attemptCount: number;
  createdAt: Date;
};

async function claimPendingEmails(now: Date): Promise<ClaimedEmail[]> {
  return db.transaction(async (tx) => {
    const due = await tx.select({
      id: emailLogs.id,
      userId: emailLogs.userId,
      recipientEmail: emailLogs.recipientEmail,
      subject: emailLogs.subject,
      payload: emailLogs.payload,
      deliveryKey: emailLogs.deliveryKey,
      attemptCount: emailLogs.attemptCount,
      createdAt: emailLogs.createdAt
    }).from(emailLogs).where(and(
      eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE),
      or(
        and(inArray(emailLogs.status, ["queued", "retry"]),
          or(isNull(emailLogs.nextRetryAt), lte(emailLogs.nextRetryAt, now))),
        and(eq(emailLogs.status, "sending"), lte(emailLogs.claimedUntil, now))
      )
    )).orderBy(asc(emailLogs.createdAt), asc(emailLogs.id))
      .limit(CORPORATE_REPORT_ALERT_EMAIL_BATCH_SIZE)
      .for("update", { skipLocked: true });

    for (const entry of due) {
      await tx.update(emailLogs).set({
        status: "sending",
        attemptCount: entry.attemptCount + 1,
        claimedUntil: new Date(now.getTime() + CLAIM_MINUTES * 60_000),
        nextRetryAt: null,
        updatedAt: now
      }).where(eq(emailLogs.id, entry.id));
    }
    return due.map((entry) => ({ ...entry, attemptCount: entry.attemptCount + 1 }));
  });
}

/**
 * Finalize provider acceptance with a compare-and-swap against the claimed job.
 * Exposed for transactional integration tests and the real worker, not an API.
 */
export async function completeCorporateReportAlertAcceptance(input: {
  id: string;
  attemptCount: number;
  providerMessageId: string;
  now: Date;
}) {
  const updated = await db.update(emailLogs).set({
    status: "sent",
    deliveryError: null,
    providerMessageId: input.providerMessageId,
    sentAt: input.now,
    claimedUntil: null,
    nextRetryAt: null,
    updatedAt: input.now
  }).where(and(
    eq(emailLogs.id, input.id),
    eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE),
    eq(emailLogs.status, "sending"),
    eq(emailLogs.attemptCount, input.attemptCount)
  )).returning({ id: emailLogs.id });

  if (updated.length) {
    try {
      await replayResendCorporateDeliveryForProvider(input.providerMessageId, input.now);
    } catch {
      // Acceptance is committed: never re-send due to a journal read failure.
      // The authenticated hourly cron will reconcile durable events.
      console.error("Corporate report delivery event replay deferred", { id: input.id });
    }
  }
  return updated.length > 0;
}

async function markDelivery(
  job: ClaimedEmail,
  status: "sent" | "retry" | "failed" | "cancelled",
  now: Date,
  options: { error?: string; providerId?: string } = {}
) {
  if (status === "sent") {
    if (!options.providerId) throw new Error("Missing provider message ID for accepted email");
    await completeCorporateReportAlertAcceptance({
      id: job.id, attemptCount: job.attemptCount, providerMessageId: options.providerId, now
    });
    return;
  }
  const retry = status === "retry";
  await db.update(emailLogs).set({
    status,
    deliveryError: options.error ?? null,
    providerMessageId: null,
    sentAt: null,
    claimedUntil: null,
    nextRetryAt: retry ? new Date(now.getTime() + corporateReportEmailRetryDelayMinutes(job.attemptCount) * 60_000) : null,
    updatedAt: now
  }).where(and(
    eq(emailLogs.id, job.id),
    eq(emailLogs.status, "sending"),
    eq(emailLogs.attemptCount, job.attemptCount)
  ));
}

async function sendClaimedEmail(job: ClaimedEmail, now: Date) {
  const payload = alertPayload(job.payload);
  if (!payload || !job.deliveryKey) {
    await markDelivery(job, "failed", now, { error: "invalid_outbox_payload" });
    return "failed";
  }

  const relevant = await isDeliveryStillRelevant({
    reportId: payload.reportId,
    programId: payload.programId,
    notificationId: payload.notificationId,
    userId: job.userId
  });
  if (!relevant) {
    await markDelivery(job, "cancelled", now);
    return "cancelled";
  }
  if (job.attemptCount > MAX_ATTEMPTS || corporateReportAlertEmailExpired(job.createdAt, now)) {
    await markDelivery(job, "failed", now, { error: "delivery_window_exhausted" });
    return "failed";
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    const terminal = job.attemptCount >= MAX_ATTEMPTS;
    await markDelivery(job, terminal ? "failed" : "retry", now, { error: "missing_resend_config" });
    return terminal ? "failed" : "retry";
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": job.deliveryKey
      },
      body: JSON.stringify({
        from,
        to: job.recipientEmail,
        subject: job.subject,
        text: buildEmailText(payload)
      })
    });
  } catch {
    const terminal = job.attemptCount >= MAX_ATTEMPTS;
    await markDelivery(job, terminal ? "failed" : "retry", now, { error: "resend_transport_error" });
    return terminal ? "failed" : "retry";
  }

  if (response.ok) {
    const data = await response.json().catch(() => null) as { id?: unknown } | null;
    if (typeof data?.id === "string" && data.id.length > 0) {
      await markDelivery(job, "sent", now, { providerId: data.id });
      return "sent";
    }
    // Accepted response without a provider id is ambiguous; the stable
    // idempotency key keeps subsequent retries safe within the 24h window.
    const terminal = job.attemptCount >= MAX_ATTEMPTS;
    await markDelivery(job, terminal ? "failed" : "retry", now, { error: "resend_missing_message_id" });
    return terminal ? "failed" : "retry";
  }

  const retryable = corporateReportAlertEmailRetryable(response.status);
  const terminal = !retryable || job.attemptCount >= MAX_ATTEMPTS;
  await markDelivery(job, terminal ? "failed" : "retry", now, { error: `resend_http_${response.status}` });
  return terminal ? "failed" : "retry";
}

/** Runs after report generation within the already authenticated hourly cron. */
export async function processCorporateReportAlertEmails(now = new Date()) {
  const due = await claimPendingEmails(now);
  const stats = { checked: due.length, sent: 0, retry: 0, failed: 0, cancelled: 0 };
  for (const job of due) {
    try {
      const state = await sendClaimedEmail(job, now);
      stats[state] += 1;
    } catch (error) {
      console.error("Corporate report alert outbox job failed", { id: job.id, error });
      const terminal = job.attemptCount >= MAX_ATTEMPTS;
      await markDelivery(job, terminal ? "failed" : "retry", now, { error: "worker_error" });
      stats[terminal ? "failed" : "retry"] += 1;
    }
  }
  return stats;
}
