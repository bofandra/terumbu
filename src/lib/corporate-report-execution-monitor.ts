import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  corporatePermissions,
  corporatePrograms,
  corporateReportExports,
  emailLogs
} from "@/db/schema";
import { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-alert-email";

type ReportRow = {
  id: string;
  status: string;
  metadata: unknown;
  scheduledFor: Date | null;
};

export type CorporateReportEmailState = {
  queued: number;
  sending: number;
  retry: number;
  accepted: number;
  delivered: number;
  delayed: number;
  bounced: number;
  complained: number;
  providerFailed: number;
  suppressed: number;
  failed: number;
  cancelled: number;
  total: number;
};

/** Provider acceptance is not confirmed delivery to the recipient's inbox. */
export function summarizeCorporateReportEmailStatuses(rows: Array<{ status: string; count: number }>): CorporateReportEmailState {
  const summary: CorporateReportEmailState = {
    queued: 0, sending: 0, retry: 0, accepted: 0, delivered: 0, delayed: 0,
    bounced: 0, complained: 0, providerFailed: 0, suppressed: 0, failed: 0, cancelled: 0, total: 0
  };
  for (const row of rows) {
    if (!Number.isSafeInteger(row.count) || row.count <= 0) continue;
    const mapping: Record<string, keyof CorporateReportEmailState> = {
      queued: "queued", sending: "sending", retry: "retry", sent: "accepted",
      delivered: "delivered", delivery_delayed: "delayed",
      bounced: "bounced", complained: "complained", provider_failed: "providerFailed",
      suppressed: "suppressed", failed: "failed", cancelled: "cancelled"
    };
    const key = mapping[row.status];
    if (!key) continue;
    summary[key] += row.count;
    summary.total += row.count;
  }
  return summary;
}

export type CorporateReportExecutionState = {
  statusLabel: string;
  scheduled: boolean;
  due: boolean;
  needsAttention: boolean;
  failureCount: number;
  lastFailure: string | null;
  lastFailedAt: Date | null;
  nextRetryAt: Date | null;
  alertEmails: CorporateReportEmailState;
  events: Array<{
    id: string;
    label: string;
    source: string;
    detail: string | null;
    occurredAt: Date;
  }>;
};

function metadataRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function safeDate(input: unknown): Date | null {
  if (typeof input !== "string") return null;
  const parsed = new Date(input);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function failureCount(input: unknown) {
  if (typeof input !== "number" || !Number.isSafeInteger(input)) return 0;
  return Math.max(0, input);
}

export function corporateReportFailureDescription(input: unknown) {
  if (input === "requester_not_authorized") {
    return "The original requester no longer has permission to generate this report.";
  }
  if (input === "program_unavailable") {
    return "The corporate program could not be accessed.";
  }
  if (input === "generation_failed") {
    return "The PDF could not be generated. The worker will retry automatically.";
  }
  return "The scheduled report could not be generated.";
}

export function corporateReportExecutionState(report: ReportRow, now: Date): CorporateReportExecutionState {
  const metadata = metadataRecord(report.metadata);
  const count = failureCount(metadata.scheduleFailureCount);
  const lastFailedAt = safeDate(metadata.scheduleLastFailedAt);
  const nextRetryAt = safeDate(metadata.nextRetryAt);
  const scheduled = report.status === "scheduled";
  const due = scheduled && Boolean(report.scheduledFor && report.scheduledFor <= now);
  const needsAttention = scheduled && count > 0;
  const retryPending = needsAttention && Boolean(nextRetryAt && nextRetryAt > now);

  let statusLabel = "Not scheduled";
  if (scheduled) {
    if (retryPending) statusLabel = "Waiting for retry";
    else if (needsAttention && due) statusLabel = "Retry eligible";
    else if (due) statusLabel = "Awaiting generation";
    else statusLabel = "Scheduled";
  } else if (metadata.generatedFromSchedule === true) {
    statusLabel = report.status === "generated" ? "Generated from schedule" : "Scheduled generation completed";
  }

  return {
    statusLabel,
    scheduled,
    due,
    needsAttention,
    failureCount: count,
    lastFailure: count > 0 ? corporateReportFailureDescription(metadata.scheduleLastFailure) : null,
    lastFailedAt,
    nextRetryAt: scheduled && count > 0 ? nextRetryAt : null,
    alertEmails: summarizeCorporateReportEmailStatuses([]),
    events: []
  };
}

const actions = [
  "corporate.report.scheduled",
  "corporate.report.scheduled_generated",
  "corporate.report.scheduled_failed"
] as const;

function eventLabel(action: string) {
  if (action === "corporate.report.scheduled_generated") return "PDF generated";
  if (action === "corporate.report.scheduled_failed") return "Generation failed";
  return "Report scheduled";
}

/** Program isolation is enforced again at the SQL boundary, not only by the calling page. */
export async function getCorporateReportExecutionMonitor(
  userId: string,
  programId: string,
  reports: ReportRow[],
  now = new Date()
) {
  const zeroSummary = {
    scheduled: 0, awaitingGeneration: 0, needAttention: 0,
    alertEmailPending: 0, alertEmailFailed: 0, alertEmailAccepted: 0,
    alertEmailDelivered: 0, alertEmailDeliveryIssues: 0
  };
  if (reports.length === 0) return { byReportId: {}, summary: zeroSummary };

  const [authorized] = await db.select({ id: corporatePrograms.id })
    .from(corporatePrograms)
    .innerJoin(corporatePermissions, eq(corporatePermissions.corporateAccountId, corporatePrograms.corporateAccountId))
    .where(and(eq(corporatePrograms.id, programId), eq(corporatePermissions.userId, userId)))
    .limit(1);
  if (!authorized) return { byReportId: {}, summary: zeroSummary };

  const byReportId: Record<string, CorporateReportExecutionState> = {};
  for (const report of reports) {
    byReportId[report.id] = corporateReportExecutionState(report, now);
  }

  if (reports.length > 0) {
    const accessiblePrograms = db.select({ id: corporatePrograms.id })
      .from(corporatePrograms)
      .innerJoin(corporatePermissions, eq(corporatePermissions.corporateAccountId, corporatePrograms.corporateAccountId))
      .where(eq(corporatePermissions.userId, userId));

    const history = await db.select({
      id: adminAuditLogs.id,
      reportId: corporateReportExports.id,
      action: adminAuditLogs.action,
      metadata: adminAuditLogs.metadata,
      createdAt: adminAuditLogs.createdAt
    })
      .from(adminAuditLogs)
      .innerJoin(corporateReportExports, eq(corporateReportExports.id, adminAuditLogs.entityId))
      .where(and(
        eq(adminAuditLogs.entityType, "corporate_report_exports"),
        inArray(adminAuditLogs.action, [...actions]),
        eq(corporateReportExports.programId, programId),
        inArray(corporateReportExports.programId, accessiblePrograms),
        inArray(corporateReportExports.id, reports.map((report) => report.id))
      ))
      .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
      .limit(200);

    for (const item of history) {
      const record = byReportId[item.reportId];
      if (!record || record.events.length >= 5) continue;
      const metadata = metadataRecord(item.metadata);
      const source = metadata.source === "cron"
        ? "Automatic worker"
        : metadata.source === "corporate_portal"
          ? "Corporate portal"
          : "Corporate portal";
      record.events.push({
        id: item.id,
        label: eventLabel(item.action),
        source,
        detail: item.action === "corporate.report.scheduled_failed"
          ? corporateReportFailureDescription(metadata.reason)
          : null,
        occurredAt: item.createdAt
      });
    }
  }

  // Only aggregate statuses; never expose recipient addresses or provider IDs.
  // Both the export and the outbox payload must match the selected program.
  const deliveryCounts = await db.select({
    reportId: corporateReportExports.id,
    status: emailLogs.status,
    count: sql<number>`count(*)::int`
  }).from(emailLogs)
    .innerJoin(corporateReportExports,
      sql`${emailLogs.payload}->>'reportId' = ${corporateReportExports.id}::text`)
    .where(and(
      eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE),
      eq(corporateReportExports.programId, programId),
      eq(sql<string>`${emailLogs.payload}->>'programId'`, programId),
      inArray(corporateReportExports.id, reports.map((report) => report.id))
    ))
    .groupBy(corporateReportExports.id, emailLogs.status);

  const deliveriesByReport = new Map<string, Array<{ status: string; count: number }>>();
  for (const row of deliveryCounts) {
    const existing = deliveriesByReport.get(row.reportId) ?? [];
    existing.push({ status: row.status, count: row.count });
    deliveriesByReport.set(row.reportId, existing);
  }
  for (const [reportId, deliveryRows] of deliveriesByReport) {
    if (byReportId[reportId]) {
      byReportId[reportId].alertEmails = summarizeCorporateReportEmailStatuses(deliveryRows);
    }
  }

  const states = Object.values(byReportId);
  return {
    byReportId,
    summary: {
      scheduled: states.filter((state) => state.scheduled).length,
      awaitingGeneration: states.filter((state) => state.due && !state.needsAttention).length,
      needAttention: states.filter((state) => state.needsAttention).length,
      alertEmailPending: states.reduce((total, state) => total + state.alertEmails.queued + state.alertEmails.sending + state.alertEmails.retry, 0),
      alertEmailFailed: states.reduce((total, state) => total + state.alertEmails.failed, 0),
      alertEmailAccepted: states.reduce((total, state) => total + state.alertEmails.accepted, 0),
      alertEmailDelivered: states.reduce((total, state) => total + state.alertEmails.delivered, 0),
      alertEmailDeliveryIssues: states.reduce((total, state) =>
        total + state.alertEmails.bounced + state.alertEmails.complained +
        state.alertEmails.providerFailed + state.alertEmails.suppressed, 0)
    }
  };
}
