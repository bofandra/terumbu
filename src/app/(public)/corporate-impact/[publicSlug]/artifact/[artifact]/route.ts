import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { corporateReportExports } from "@/db/schema";
import {
  corporateReportArtifactContentType,
  corporateReportArtifactDisposition,
  corporateReportArtifactSourceUrl,
  isPublicCorporateReportArtifactKey,
  normalizeCorporateReportArtifactKey
} from "@/lib/corporate-report-artifact-links";
import { CorporateReportStorageUnavailable, readCorporateReportArtifact } from "@/lib/corporate-report-storage";

export const dynamic = "force-dynamic";

type PublicCorporateReportArtifactRouteProps = {
  params: Promise<{
    publicSlug: string;
    artifact: string;
  }>;
};

export async function GET(_request: Request, { params }: PublicCorporateReportArtifactRouteProps) {
  const { publicSlug, artifact } = await params;
  const artifactKey = normalizeCorporateReportArtifactKey(artifact);

  if (!artifactKey || !isPublicCorporateReportArtifactKey(artifactKey)) {
    notFound();
  }

  const [report] = await db
    .select({
      exportCode: corporateReportExports.exportCode,
      fileUrl: corporateReportExports.fileUrl,
      previewUrl: corporateReportExports.previewUrl,
      evidenceBundleUrl: corporateReportExports.evidenceBundleUrl,
      artifactManifest: corporateReportExports.artifactManifest,
      metadata: corporateReportExports.metadata
    })
    .from(corporateReportExports)
    .where(
      and(
        eq(corporateReportExports.publicSlug, publicSlug),
        eq(corporateReportExports.status, "published")
      )
    )
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
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": corporateReportArtifactDisposition(report.exportCode, artifactKey),
      "Content-Type": corporateReportArtifactContentType(artifactKey),
      "X-Content-Type-Options": "nosniff"
    }
  });
}
