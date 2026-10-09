import { and, asc, eq, lte, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  corporatePermissions,
  corporatePrograms,
  corporateReportExports,
  roles,
  userRoles
} from "@/db/schema";
import { corporateCapabilitiesForPermission } from "@/lib/corporate-permissions";
import { writeReportArtifacts } from "@/lib/corporate-report-generator";
import { normalizeCorporateReportFormat, normalizeCorporateReportType } from "@/lib/corporate-report-lifecycle";
import { generateDueCorporateReport } from "@/lib/corporate-report-scheduler";
import { getCorporateDashboardData } from "@/lib/queries";

export const CORPORATE_REPORT_CRON_BATCH_SIZE = 10;

export type CorporateReportFailureCode = "requester_not_authorized" | "program_unavailable" | "generation_failed";

class ScheduledReportFailure extends Error {
  constructor(readonly code: CorporateReportFailureCode) {
    super(code);
  }
}

export function corporateReportRetryDelayMinutes(attempts: number) {
  const count = Math.max(1, Math.min(20, Math.floor(Number.isFinite(attempts) ? attempts : 1)));
  return Math.min(1440, 60 * 2 ** (count - 1));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function dueReportRetryEligible(metadata: unknown, now: Date) {
  if (!isRecord(metadata) || typeof metadata.nextRetryAt !== "string") return true;
  const next = Date.parse(metadata.nextRetryAt);
  return Number.isFinite(next) && next <= now.getTime();
}

async function requesterCanGenerate(userId: string | null, programId: string) {
  if (!userId) return false;
  const permissions = await db.select({
    permission: corporatePermissions.permission,
    role: roles.key
  }).from(corporatePermissions)
    .innerJoin(corporatePrograms, eq(corporatePrograms.corporateAccountId, corporatePermissions.corporateAccountId))
    .innerJoin(userRoles, eq(userRoles.userId, corporatePermissions.userId))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(
      eq(corporatePermissions.userId, userId),
      eq(corporatePrograms.id, programId)
    ));

  const roleKeys = new Set(permissions.map((entry) => entry.role));
  return roleKeys.has("corporate_admin") && !roleKeys.has("admin") &&
    permissions.some((entry) => corporateCapabilitiesForPermission(entry.permission).canGenerateReport);
}

async function recordScheduledFailure(input: {
  reportId: string;
  programId: string;
  requestedByUserId: string | null;
  code: CorporateReportFailureCode;
  now: Date;
}) {
  await db.transaction(async (tx) => {
    const [locked] = await tx.select({
      id: corporateReportExports.id,
      exportCode: corporateReportExports.exportCode,
      metadata: corporateReportExports.metadata
    }).from(corporateReportExports).where(and(
      eq(corporateReportExports.id, input.reportId),
      eq(corporateReportExports.programId, input.programId),
      eq(corporateReportExports.status, "scheduled")
    )).limit(1).for("update");
    // Another cron instance may have recorded the same failure meanwhile.
    // The row lock and retry eligibility guard prevent duplicate failure audits.
    if (!locked || !dueReportRetryEligible(locked.metadata, input.now)) return;

    const previous = isRecord(locked.metadata) ? locked.metadata : {};
    const oldCount = Number(previous.scheduleFailureCount);
    const failureCount = Math.max(0, Number.isFinite(oldCount) ? oldCount : 0) + 1;
    const nextRetryAt = new Date(input.now.getTime() + corporateReportRetryDelayMinutes(failureCount) * 60_000);

    await tx.update(corporateReportExports).set({
      metadata: {
        ...previous,
        scheduleFailureCount: failureCount,
        scheduleLastFailure: input.code,
        scheduleLastFailedAt: input.now.toISOString(),
        nextRetryAt: nextRetryAt.toISOString()
      },
      updatedAt: input.now
    }).where(and(
      eq(corporateReportExports.id, input.reportId),
      eq(corporateReportExports.programId, input.programId),
      eq(corporateReportExports.status, "scheduled")
    ));

    await tx.insert(adminAuditLogs).values({
      actorUserId: input.requestedByUserId,
      action: "corporate.report.scheduled_failed",
      entityType: "corporate_report_exports",
      entityId: locked.id,
      metadata: {
        source: "cron",
        programId: input.programId,
        exportCode: locked.exportCode,
        reason: input.code,
        failureCount,
        nextRetryAt: nextRetryAt.toISOString()
      }
    });
  });
}

/** Processes due reports across all programs. Never publishes or approves them. */
export async function processDueCorporateReports(now = new Date()) {
  const due = await db.select({
    id: corporateReportExports.id,
    programId: corporateReportExports.programId,
    requestedByUserId: corporateReportExports.requestedByUserId
  }).from(corporateReportExports).where(and(
    eq(corporateReportExports.status, "scheduled"),
    lte(corporateReportExports.scheduledFor, now),
    sql`coalesce(${corporateReportExports.metadata}->>'nextRetryAt', '') <= ${now.toISOString()}`
  )).orderBy(asc(corporateReportExports.scheduledFor), asc(corporateReportExports.id))
    .limit(CORPORATE_REPORT_CRON_BATCH_SIZE);

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const report of due) {
    try {
      if (!(await requesterCanGenerate(report.requestedByUserId, report.programId))) {
        throw new ScheduledReportFailure("requester_not_authorized");
      }

      const processed = await generateDueCorporateReport({
        reportId: report.id,
        programId: report.programId,
        actorUserId: report.requestedByUserId!,
        source: "cron",
        now,
        generate: async (locked) => {
          const data = await getCorporateDashboardData(report.requestedByUserId!, locked.programId);
          if (!data || data.program.programId !== locked.programId) {
            throw new ScheduledReportFailure("program_unavailable");
          }
          return writeReportArtifacts({
            exportCode: locked.exportCode,
            reportType: normalizeCorporateReportType(locked.reportType),
            exportFormat: normalizeCorporateReportFormat(locked.exportFormat),
            artifactVersion: Math.max(1, locked.artifactVersion),
            accountName: data.program.accountName,
            programName: data.program.programName,
            data
          });
        }
      });
      if (processed) generated += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      const code = error instanceof ScheduledReportFailure ? error.code : "generation_failed";
      console.error("Corporate scheduled report cron failure", { reportId: report.id, code, error });
      await recordScheduledFailure({
        reportId: report.id,
        programId: report.programId,
        requestedByUserId: report.requestedByUserId,
        code,
        now
      });
    }
  }

  return { checked: due.length, generated, failed, skipped, batchSize: CORPORATE_REPORT_CRON_BATCH_SIZE };
}
