import { readFile } from "node:fs/promises";

import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { corporateReportExports } from "@/db/schema";
import {
  corporateReportArtifactContentType,
  corporateReportArtifactDisposition,
  corporateReportArtifactLocalPaths,
  corporateReportArtifactSourceUrl,
  normalizeCorporateReportArtifactKey
} from "@/lib/corporate-report-artifact-links";

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

  if (artifactKey !== "pdf") {
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
  const localPaths = corporateReportArtifactLocalPaths(sourceUrl);

  if (localPaths.length === 0) {
    notFound();
  }

  let artifactFile: Buffer | null = null;

  for (const localPath of localPaths) {
    try {
      artifactFile = await readFile(localPath);
      break;
    } catch {
      // Legacy published reports can fall back to the bundled public artifact.
    }
  }

  if (!artifactFile) {
    notFound();
  }

  return new Response(new Uint8Array(artifactFile), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": corporateReportArtifactDisposition(report.exportCode, artifactKey),
      "Content-Type": corporateReportArtifactContentType(artifactKey),
      "X-Content-Type-Options": "nosniff"
    }
  });
}
