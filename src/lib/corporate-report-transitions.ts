import { and, eq, ne, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { adminAuditLogs, corporateReportExports } from "@/db/schema";

// Compares the prior status inside the SQL UPDATE rather than relying on a
// previous page render; audit records are committed with the state transition.
export async function transitionCorporateReport(input: {
  reportId: string;
  programId: string;
  actorUserId: string;
  exportCode: string;
  expectedStatus: "generated" | "review" | "approved";
  nextStatus: "review" | "approved" | "published";
  publicSlug?: string;
  publicSnapshot?: Record<string, unknown>;
}) {
  // Refuse invalid jumps even if a future caller bypasses the UI state checks.
  const validStep =
    (input.expectedStatus === "generated" && input.nextStatus === "review") ||
    (input.expectedStatus === "review" && input.nextStatus === "approved") ||
    (input.expectedStatus === "approved" && input.nextStatus === "published");
  if (!validStep || (input.nextStatus === "published" && !input.publicSnapshot)) return false;

  const now = new Date();

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(corporateReportExports)
      .set({
        status: input.nextStatus,
        updatedAt: now,
        ...(input.nextStatus === "approved" ? { approvedByUserId: input.actorUserId, approvedAt: now } : {}),
        ...(input.nextStatus === "published" ? {
          publicSlug: input.publicSlug,
          publishedAt: now,
          // Persist the public-facing data and state change atomically.
          metadata: sql`coalesce(${corporateReportExports.metadata}, '{}'::jsonb) || ${JSON.stringify({ publicSnapshot: input.publicSnapshot })}::jsonb`
        } : {})
      })
      .where(and(
        eq(corporateReportExports.id, input.reportId),
        eq(corporateReportExports.programId, input.programId),
        eq(corporateReportExports.status, input.expectedStatus),
        // Fail closed when the original report creator is unknown. Independent
        // approval must be enforced in SQL, including under concurrent requests.
        ...(input.nextStatus === "approved" ? [
          isNotNull(corporateReportExports.requestedByUserId),
          ne(corporateReportExports.requestedByUserId, input.actorUserId)
        ] : []),
        ...(input.nextStatus === "published" ? [
          eq(corporateReportExports.approvedByUserId, input.actorUserId)
        ] : [])
      ))
      .returning({ id: corporateReportExports.id });

    if (!updated) return false;

    await tx.insert(adminAuditLogs).values({
      actorUserId: input.actorUserId,
      action: input.nextStatus === "review" ? "corporate.report.submitted" : input.nextStatus === "approved" ? "corporate.report.approved" : "corporate.report.published",
      entityType: "corporate_report_exports",
      entityId: updated.id,
      metadata: {
        source: "corporate_portal",
        programId: input.programId,
        exportCode: input.exportCode,
        ...(input.publicSlug ? { publicSlug: input.publicSlug } : {}),
        fromStatus: input.expectedStatus,
        toStatus: input.nextStatus
      }
    });
    return true;
  });
}
