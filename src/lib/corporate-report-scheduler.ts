import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { adminAuditLogs, corporateReportExports } from "@/db/schema";

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
    await tx.insert(adminAuditLogs).values({
      actorUserId: input.actorUserId,
      action: "corporate.report.scheduled_generated",
      entityType: "corporate_report_exports",
      entityId: updated.id,
      metadata: {
        source: "corporate_portal",
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
