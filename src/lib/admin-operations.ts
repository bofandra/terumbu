import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { corporateReportExports, emailLogs, resendWebhookEvents } from "@/db/schema";
import { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-email-template";
import type { AdminOperationsMetrics } from "@/lib/admin-operations-health";

/**
 * Platform-admin-only caller. Aggregate in Postgres and never select email
 * addresses, payloads, message IDs or other personal/provider identifiers.
 * This is a database snapshot, not a cron heartbeat or an inbox-delivery SLA.
 */
export async function getAdminOperationsMetrics(now = new Date()): Promise<AdminOperationsMetrics> {
  const olderThanTwoHours = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const [[reports], [emails], [webhook]] = await Promise.all([
    db.select({
      scheduled: sql<number>`count(*) filter (where ${corporateReportExports.status} = 'scheduled')::int`,
      due: sql<number>`count(*) filter (where ${corporateReportExports.status} = 'scheduled' and ${corporateReportExports.scheduledFor} <= ${now})::int`,
      overdue: sql<number>`count(*) filter (where ${corporateReportExports.status} = 'scheduled' and ${corporateReportExports.scheduledFor} <= ${olderThanTwoHours})::int`,
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
        (${emailLogs.status} = 'queued' and ${emailLogs.createdAt} <= ${olderThanTwoHours})
        or (${emailLogs.status} = 'retry' and ${emailLogs.nextRetryAt} <= ${olderThanTwoHours})
      )::int`,
      expiredClaims: sql<number>`count(*) filter (where ${emailLogs.status} = 'sending' and ${emailLogs.claimedUntil} <= ${now})::int`,
      lastProviderEventAt: sql<Date | null>`max(${emailLogs.providerEventAt})`
    }).from(emailLogs).where(eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE)),
    db.select({
      pending: sql<number>`count(distinct ${resendWebhookEvents.eventId}) filter (where ${resendWebhookEvents.appliedAt} is null)::int`,
      stalePending: sql<number>`count(distinct ${resendWebhookEvents.eventId}) filter (where ${resendWebhookEvents.appliedAt} is null and ${resendWebhookEvents.receivedAt} <= ${olderThanTwoHours})::int`,
      lastReceivedAt: sql<Date | null>`max(${resendWebhookEvents.receivedAt})`
    }).from(resendWebhookEvents)
      .innerJoin(emailLogs, eq(emailLogs.providerMessageId, resendWebhookEvents.providerMessageId))
      .where(eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE))
  ]);

  return {
    checkedAt: now,
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
