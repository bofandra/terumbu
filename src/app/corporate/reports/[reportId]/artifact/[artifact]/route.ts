import { readFile } from "node:fs/promises";

import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { corporatePermissions, corporatePrograms, corporateReportExports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  corporateReportArtifactContentType,
  corporateReportArtifactDisposition,
  corporateReportArtifactLocalPath,
  corporateReportArtifactSourceUrl,
  normalizeCorporateReportArtifactKey
} from "@/lib/corporate-report-artifact-links";

export const dynamic = "force-dynamic";

type CorporateReportArtifactRouteProps = {
  params: Promise<{
    reportId: string;
    artifact: string;
  }>;
};

export async function GET(_request: Request, { params }: CorporateReportArtifactRouteProps) {
  const user = await requireUser("/corporate/reports");
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
  const localPath = corporateReportArtifactLocalPath(sourceUrl);

  if (!localPath) {
    notFound();
  }

  let artifactFile: Buffer;

  try {
    artifactFile = await readFile(localPath);
  } catch {
    notFound();
  }

  return new Response(new Uint8Array(artifactFile), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": corporateReportArtifactDisposition(report.exportCode, artifactKey),
      "Content-Type": corporateReportArtifactContentType(artifactKey)
    }
  });
}
