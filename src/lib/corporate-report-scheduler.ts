import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminAuditLogs, corporateReportExports, emailLogs, userNotifications } from "@/db/schema";
import { CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE } from "@/lib/corporate-report-alert-email";

export type DueCorporateReport = {
  id: string;
  programId: string;
  exportCode: string;
  reportType: string;
  exportFormat: string;
  artifactVersion: number;
  scheduledFor: Date | null;
};

type ScheduledArtifacts = {
  fileUrl: string;
  previewUrl: string | null;
  evidenceBundleUrl: string | null;
  generatedAt: Date;
  artifactManifest: { fileCount: number };
  metadata: Record<string, unknown>;
};

/** Generate the PDF while holding the report lock, committing state and audit
 * together. A concurrent caller rechecks scheduled status after the lock.
 * Failed generation rolls back and may be retried safely.
 */
export async function generateDueCorporateReport(input: {
  reportId: string;
  programId: string;
  actorUserId: string;
  source?: "corporate_portal" | "cron";
  generate: (report: DueCorporateReport) => Promise<ScheduledArtifacts>;
  now?: Date;
}) {
  return db.transaction(async (tx) => {
    const [report] = await tx.select({
      id: corporateReportExports.id,
      programId: corporateReportExports.programId,
      exportCode: corporateReportExports.exportCode,
      reportType: corporateReportExports.reportType,
      exportFormat: corporateReportExports.exportFormat,
      artifactVersion: corporateReportExports.artifactVersion,
      scheduledFor: corporateReportExports.scheduledFor,
      metadata: corporateReportExports.metadata
    }).from(corporateReportExports).where(and(
      eq(corporateReportExports.id, input.reportId),
      eq(corporateReportExports.programId, input.programId),
      eq(corporateReportExports.status, "scheduled"),
      lte(corporateReportExports.scheduledFor, input.now ?? new Date())
    )).limit(1).for("update");

    if (!report) return false;
    const artifacts = await input.generate(report);

    const previousMetadata = report.metadata && typeof report.metadata === "object" && !Array.isArray(report.metadata)
      ? report.metadata as Record<string, unknown> : {};

    const [updated] = await tx.update(corporateReportExports).set({
      status: "generated",
      fileUrl: artifacts.fileUrl,
      previewUrl: artifacts.previewUrl,
      evidenceBundleUrl: artifacts.evidenceBundleUrl,
      generatedAt: artifacts.generatedAt,
      artifactManifest: artifacts.artifactManifest,
      metadata: {
        ...previousMetadata,
        ...artifacts.metadata,
        scheduledFor: report.scheduledFor?.toISOString() ?? null,
        generatedFromSchedule: true
      },
      updatedAt: artifacts.generatedAt
    }).where(and(
      eq(corporateReportExports.id, report.id),
      eq(corporateReportExports.programId, input.programId),
      eq(corporateReportExports.status, "scheduled")
    )).returning({ id: corporateReportExports.id });

    if (!updated) throw new Error("Scheduled report changed during generation.");

    // Clear stale failure alerts only when a previously failing scheduled
    // report actually generated successfully; preserve audit history.
    if (Number(previousMetadata.scheduleFailureCount) > 0) {
      await tx.update(userNotifications).set({
        message: `PDF report ${report.exportCode} was generated successfully after a retry. No action is required.`,
        readAt: sql`coalesce(${userNotifications.readAt}, ${artifacts.generatedAt})`,
        updatedAt: artifacts.generatedAt
      }).where(and(
        eq(userNotifications.sourceType, "corporate_report_export"),
        eq(userNotifications.sourceId, report.id),
        sql`${userNotifications.notificationCode} like ${`corporate-report-failure-${report.id}-%`}`
      ));

      await tx.update(emailLogs).set({
        status: "cancelled",
        nextRetryAt: null,
        claimedUntil: null,
        updatedAt: artifacts.generatedAt
      }).where(and(
        eq(emailLogs.template, CORPORATE_REPORT_ALERT_EMAIL_TEMPLATE),
        inArray(emailLogs.status, ["queued", "retry"]),
        sql`${emailLogs.payload}->>'reportId' = ${report.id}`
      ));
    }

    await tx.insert(adminAuditLogs).values({
      actorUserId: input.actorUserId,
      action: "corporate.report.scheduled_generated",
      entityType: "corporate_report_exports",
      entityId: updated.id,
      metadata: {
        source: input.source ?? "corporate_portal",
        programId: report.programId,
        exportCode: report.exportCode,
        reportType: report.reportType,
        exportFormat: report.exportFormat,
        artifactVersion: report.artifactVersion,
        scheduledFor: report.scheduledFor?.toISOString() ?? null,
        fileCount: artifacts.artifactManifest.fileCount
      }
    });
    return true;
  });
}
