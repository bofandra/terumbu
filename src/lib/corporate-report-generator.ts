import { buildCorporateReportPdf, type CorporateReportArtifactInput } from "@/lib/corporate-report-artifacts";
import { storeCorporateReportPdf } from "@/lib/corporate-report-storage";
import { buildCorporateReportArtifactManifest, corporateReportTypeLabel } from "@/lib/corporate-report-lifecycle";
import { corporatePublicSnapshotFromDashboard } from "@/lib/corporate-report-snapshot";
import type { getCorporateDashboardData } from "@/lib/queries";

export async function writeReportArtifacts(input: {
  exportCode: string;
  reportType: string;
  exportFormat: string;
  artifactVersion: number;
  accountName: string;
  programName: string;
  data: NonNullable<Awaited<ReturnType<typeof getCorporateDashboardData>>>;
}) {
  const generatedAt = new Date();
  const artifactInput: CorporateReportArtifactInput = {
    exportCode: input.exportCode,
    reportTypeLabel: corporateReportTypeLabel(input.reportType),
    accountName: input.accountName,
    programName: input.programName,
    generatedAt,
    periodStart: input.data.program.startsAt,
    periodEnd: input.data.program.endsAt,
    executiveMetrics: input.data.executiveMetrics,
    financials: input.data.financials,
    impactOutputs: input.data.impactOutputs,
    portfolio: input.data.portfolio.map((project) => ({
      campaignTitle: project.campaignTitle,
      region: project.region,
      allocationValue: project.allocationValue,
      utilization: project.utilization,
      statusLabel: project.statusLabel,
      organizationName: project.organizationName
    })),
    evidence: input.data.evidence.map((item) => ({
      evidenceCode: item.evidenceCode,
      title: item.title,
      evidenceType: item.evidenceType,
      verificationStatus: item.verificationStatus,
      campaignTitle: item.campaignTitle,
      sourceHref: item.sourceHref
    }))
  };
  const stored = await storeCorporateReportPdf({
    exportCode: input.exportCode,
    pdf: buildCorporateReportPdf(artifactInput),
    now: generatedAt
  });
  const pdfUrl = stored.url;
  const manifest = buildCorporateReportArtifactManifest({
    exportCode: input.exportCode,
    reportType: input.reportType,
    exportFormat: "pdf",
    artifactVersion: input.artifactVersion,
    generatedAt,
    files: [{ label: "Terumbu PDF report", format: "pdf", url: pdfUrl, required: true }]
  });

  return {
    fileUrl: pdfUrl,
    previewUrl: null,
    evidenceBundleUrl: null,
    generatedAt,
    artifactManifest: manifest,
    metadata: {
      portfolioCount: input.data.portfolio.length,
      evidenceCount: input.data.evidence.length,
      verifiedOutputs: input.data.impactOutputs.verifiedOutputs,
      committedFunding: input.data.financials.committedFunding,
      generationSnapshot: corporatePublicSnapshotFromDashboard(input.data),
      generatedBy: "corporate_report_generator",
      exportFormat: "pdf",
      artifactVersion: input.artifactVersion,
      pdfUrl,
      pdfSha256: stored.sha256,
      pdfByteLength: stored.byteLength,
      artifactStorageProvider: stored.provider
    }
  };
}

