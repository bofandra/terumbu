import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { corporateReportExports, emailLogs, resendWebhookEvents, workerHeartbeats } from "@/db/schema";
import { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-email-template";
import type { AdminOperationsMetrics } from "@/lib/admin-operations-health";
import { HOURLY_WORKERS, workerHeartbeatHealth, type WorkerHeartbeatRow } from "@/lib/worker-heartbeat";

/**
 * Platform-admin-only caller. Aggregate in Postgres and never select email
 * addresses, payloads, message IDs or other personal/provider identifiers.
 * Heartbeat status is stored durably, but this is not an inbox-delivery SLA.
 */
export async function getAdminOperationsMetrics(now = new Date()): Promise<AdminOperationsMetrics> {
  // Raw SQL parameters must be timestamp strings: Drizzle column encoders do not
  // run for values interpolated directly inside sql templates.
  const nowIso = now.toISOString();
  const olderThanTwoHoursIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const [[reports], [emails], [webhook], heartbeatRows] = await Promise.all([
    db.select({
      scheduled: sql<number>`count(*) filter (where ${corporateReportExports.status} = 'scheduled')::int`,
      due: sql<number>`count(*) filter (where ${corporateReportExports.status} = 'scheduled' and ${corporateReportExports.scheduledFor} <= ${nowIso}::timestamptz)::int`,
      overdue: sql<number>`count(*) filter (where ${corporateReportExports.status} = 'scheduled' and ${corporateReportExports.scheduledFor} <= ${olderThanTwoHoursIso}::timestamptz)::int`,
      retrying: sql<number>`count(*) filter (where ${corporateReportExports.status} = 'scheduled' and coalesce(${corporateReportExports.metadata}->>'scheduleFailureCount', '0') <> '0')::int`,
      lastScheduledGenerationAt: sql<Date | null>`max(${corporateReportExports.generatedAt}) filter (where ${corporateReportExports.metadata}->>'generatedFromSchedule' = 'true')`
    }).from(corporateReportExports),
    db.select({
      queued: sql<number>`count(*) filter (where ${emailLogs.status} = 'queued')::int`,
      sending: sql<number>`count(*) filter (where ${emailLogs.status} = 'sending')::int`,
      retry: sql<number>`count(*) filter (where ${emailLogs.status} = 'retry')::int`,
      failed: sql<number>`count(*) filter (where ${emailLogs.status} = 'failed')::int`,
      accepted: sql<number>`count(*) filter (where ${emailLogs.status} = 'sent')::int`,
      delivered: sql<number>`count(*) filter (where ${emailLogs.status} = 'delivered')::int`,
      deliveryIssues: sql<number>`count(*) filter (where ${emailLogs.status} in ('bounced', 'complained', 'provider_failed', 'suppressed'))::int`,
      staleQueued: sql<number>`count(*) filter (where
        (${emailLogs.status} = 'queued' and ${emailLogs.createdAt} <= ${olderThanTwoHoursIso}::timestamptz)
        or (${emailLogs.status} = 'retry' and ${emailLogs.nextRetryAt} <= ${olderThanTwoHoursIso}::timestamptz)
      )::int`,
      expiredClaims: sql<number>`count(*) filter (where ${emailLogs.status} = 'sending' and ${emailLogs.claimedUntil} <= ${nowIso}::timestamptz)::int`,
      lastProviderEventAt: sql<Date | null>`max(${emailLogs.providerEventAt})`
    }).from(emailLogs).where(eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE)),
    db.select({
      pending: sql<number>`count(distinct ${resendWebhookEvents.eventId}) filter (where ${resendWebhookEvents.appliedAt} is null)::int`,
      stalePending: sql<number>`count(distinct ${resendWebhookEvents.eventId}) filter (where ${resendWebhookEvents.appliedAt} is null and ${resendWebhookEvents.receivedAt} <= ${olderThanTwoHoursIso}::timestamptz)::int`,
      lastReceivedAt: sql<Date | null>`max(${resendWebhookEvents.receivedAt})`
    }).from(resendWebhookEvents)
      .innerJoin(emailLogs, eq(emailLogs.providerMessageId, resendWebhookEvents.providerMessageId))
      .where(eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE)),
    db.select({
      workerName: workerHeartbeats.workerName,
      lastStatus: workerHeartbeats.lastStatus,
      lastStartedAt: workerHeartbeats.lastStartedAt,
      lastFinishedAt: workerHeartbeats.lastFinishedAt,
      lastSucceededAt: workerHeartbeats.lastSucceededAt,
      lastFailedAt: workerHeartbeats.lastFailedAt,
      consecutiveFailures: workerHeartbeats.consecutiveFailures
    }).from(workerHeartbeats).where(inArray(workerHeartbeats.workerName, [...HOURLY_WORKERS]))
  ]);

  return {
    checkedAt: now,
    workers: HOURLY_WORKERS.map((name) => {
      const row = heartbeatRows.find((item) => item.workerName === name);
      const heartbeat = row ? { ...row, workerName: name } satisfies WorkerHeartbeatRow : null;
      return {
        name,
        health: workerHeartbeatHealth(heartbeat, now),
        consecutiveFailures: heartbeat?.consecutiveFailures ?? 0,
        lastStartedAt: heartbeat?.lastStartedAt ?? null,
        lastFinishedAt: heartbeat?.lastFinishedAt ?? null,
        lastSucceededAt: heartbeat?.lastSucceededAt ?? null,
        lastFailedAt: heartbeat?.lastFailedAt ?? null
      };
    }),
    reports: {
      scheduled: reports.scheduled,
      due: reports.due,
      overdue: reports.overdue,
      retrying: reports.retrying,
      lastScheduledGenerationAt: reports.lastScheduledGenerationAt
    },
    emails: {
      queued: emails.queued,
      sending: emails.sending,
      retry: emails.retry,
      failed: emails.failed,
      accepted: emails.accepted,
      delivered: emails.delivered,
      deliveryIssues: emails.deliveryIssues,
      staleQueued: emails.staleQueued,
      expiredClaims: emails.expiredClaims,
      lastProviderEventAt: emails.lastProviderEventAt
    },
    webhook: {
      pending: webhook.pending,
      stalePending: webhook.stalePending,
      lastReceivedAt: webhook.lastReceivedAt
    }
  };
}
