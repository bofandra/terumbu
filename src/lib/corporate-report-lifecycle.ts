export const corporateReportTypes = ["esg", "csr", "evidence", "donations", "expeditions"] as const;
export type CorporateReportType = (typeof corporateReportTypes)[number];

export const corporateReportFormats = ["pdf"] as const;
export type CorporateReportFormat = (typeof corporateReportFormats)[number];

export const corporateReportStatuses = ["scheduled", "generated", "review", "approved", "published", "archived"] as const;
export type CorporateReportStatus = (typeof corporateReportStatuses)[number];

export type CorporateReportArtifactFile = {
  label: string;
  format: "html" | "json" | "csv" | "pdf" | "xlsx";
  url: string;
  required: boolean;
};

export function normalizeCorporateReportType(value: string | null | undefined, fallback: CorporateReportType = "esg"): CorporateReportType {
  return corporateReportTypes.includes(value as CorporateReportType) ? (value as CorporateReportType) : fallback;
}

export function normalizeCorporateReportFormat(_value: string | null | undefined, fallback: CorporateReportFormat = "pdf"): CorporateReportFormat {
  return fallback;
}

export function normalizeCorporateReportStatus(value: string | null | undefined, fallback: CorporateReportStatus = "generated"): CorporateReportStatus {
  return corporateReportStatuses.includes(value as CorporateReportStatus) ? (value as CorporateReportStatus) : fallback;
}

export function corporateReportTypeLabel(type: string | null | undefined) {
  return {
    esg: "ESG Report",
    csr: "CSR Impact Report",
    evidence: "Activity Bundle",
    donations: "Donation Activity Report",
    expeditions: "Expedition Activity Report"
  }[normalizeCorporateReportType(type)];
}

export function corporateReportFormatLabel(_format: string | null | undefined) {
  void _format;
  return "PDF";
}

export function scheduledReportIsDue(scheduledFor: Date | null | undefined, now = new Date()) {
  return Boolean(scheduledFor && scheduledFor.getTime() <= now.getTime());
}

export function buildCorporateReportArtifactManifest(input: {
  exportCode: string;
  reportType: string;
  exportFormat: string;
  artifactVersion: number;
  generatedAt: Date | null;
  scheduledFor?: Date | null;
  files: CorporateReportArtifactFile[];
}) {
  const reportType = normalizeCorporateReportType(input.reportType);
  const exportFormat = normalizeCorporateReportFormat(input.exportFormat);
  const requiredFiles = input.files.filter((file) => file.required);
  const availableRequiredFiles = requiredFiles.filter((file) => file.url);

  return {
    exportCode: input.exportCode,
    reportType,
    reportTypeLabel: corporateReportTypeLabel(reportType),
    exportFormat,
    exportFormatLabel: corporateReportFormatLabel(exportFormat),
    artifactVersion: Math.max(1, Math.round(input.artifactVersion || 1)),
    generatedAt: input.generatedAt?.toISOString() ?? null,
    scheduledFor: input.scheduledFor?.toISOString() ?? null,
    readiness: requiredFiles.length === availableRequiredFiles.length ? "ready" : input.scheduledFor ? "scheduled" : "incomplete",
    fileCount: input.files.filter((file) => file.url).length,
    files: input.files
  };
}
