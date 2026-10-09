import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { corporatePermissions, corporatePrograms, corporateReportExports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  corporateReportArtifactContentType,
  corporateReportArtifactDisposition,
  corporateReportArtifactSourceUrl,
  normalizeCorporateReportArtifactKey
} from "@/lib/corporate-report-artifact-links";
import { CorporateReportStorageUnavailable, readCorporateReportArtifact } from "@/lib/corporate-report-storage";

export const dynamic = "force-dynamic";

type CorporateReportArtifactRouteProps = {
  params: Promise<{
    reportId: string;
    artifact: string;
  }>;
};

export async function GET(_request: Request, { params }: CorporateReportArtifactRouteProps) {
  const user = await requireUser("/corporate");
  const { reportId, artifact } = await params;
  const artifactKey = normalizeCorporateReportArtifactKey(artifact);

  if (!artifactKey) {
    notFound();
  }

  const [report] = await db
    .select({
      id: corporateReportExports.id,
      exportCode: corporateReportExports.exportCode,
      fileUrl: corporateReportExports.fileUrl,
      previewUrl: corporateReportExports.previewUrl,
      evidenceBundleUrl: corporateReportExports.evidenceBundleUrl,
      artifactManifest: corporateReportExports.artifactManifest,
      metadata: corporateReportExports.metadata
    })
    .from(corporateReportExports)
    .innerJoin(corporatePrograms, eq(corporateReportExports.programId, corporatePrograms.id))
    .innerJoin(
      corporatePermissions,
      and(eq(corporatePermissions.corporateAccountId, corporatePrograms.corporateAccountId), eq(corporatePermissions.userId, user.id))
    )
    .where(eq(corporateReportExports.id, reportId))
    .limit(1);

  if (!report) {
    notFound();
  }

  const sourceUrl = corporateReportArtifactSourceUrl(report, artifactKey);
  let artifactFile: Uint8Array | null;
  try {
    const metadata = report.metadata && typeof report.metadata === "object" && !Array.isArray(report.metadata)
      ? report.metadata as Record<string, unknown>
      : {};
    artifactFile = await readCorporateReportArtifact({
      sourceUrl,
      expectedSha256: artifactKey === "pdf" && typeof metadata.pdfSha256 === "string" ? metadata.pdfSha256 : null
    });
  } catch (error) {
    if (error instanceof CorporateReportStorageUnavailable) {
      return Response.json({ error: "Report file storage is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
  if (!artifactFile) notFound();

  return new Response(new Uint8Array(artifactFile), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": corporateReportArtifactDisposition(report.exportCode, artifactKey),
      "Content-Type": corporateReportArtifactContentType(artifactKey),
      "X-Content-Type-Options": "nosniff"
    }
  });
}
