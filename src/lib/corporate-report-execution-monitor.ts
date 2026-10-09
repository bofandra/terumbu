import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  corporatePermissions,
  corporatePrograms,
  corporateReportExports
} from "@/db/schema";

type ReportRow = {
  id: string;
  status: string;
  metadata: unknown;
  scheduledFor: Date | null;
};

export type CorporateReportExecutionState = {
  statusLabel: string;
  scheduled: boolean;
  due: boolean;
  needsAttention: boolean;
  failureCount: number;
  lastFailure: string | null;
  lastFailedAt: Date | null;
  nextRetryAt: Date | null;
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
  const zeroSummary = { scheduled: 0, awaitingGeneration: 0, needAttention: 0 };
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

  const states = Object.values(byReportId);
  return {
    byReportId,
    summary: {
      scheduled: states.filter((state) => state.scheduled).length,
      awaitingGeneration: states.filter((state) => state.due && !state.needsAttention).length,
      needAttention: states.filter((state) => state.needsAttention).length
    }
  };
}
