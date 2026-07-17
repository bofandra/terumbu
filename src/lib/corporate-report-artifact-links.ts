import path from "node:path";

export const corporateReportArtifactKeys = ["preview", "data", "evidence", "pdf", "workbook", "portfolio-csv", "evidence-csv", "manifest"] as const;

export type CorporateReportArtifactKey = (typeof corporateReportArtifactKeys)[number];

export type CorporateReportArtifactSource = {
  id?: string;
  exportCode: string;
  fileUrl?: string | null;
  previewUrl?: string | null;
  evidenceBundleUrl?: string | null;
  artifactManifest?: unknown;
  metadata?: unknown;
};

type ArtifactDefinition = {
  label: string;
  suffix: string;
  extension: string;
  contentType: string;
  disposition: "inline" | "attachment";
  format?: string;
  labelIncludes?: string;
  topLevelUrl?: keyof Pick<CorporateReportArtifactSource, "fileUrl" | "previewUrl" | "evidenceBundleUrl">;
  metadataUrl?: string;
};

export const corporateReportArtifactDefinitions: Record<CorporateReportArtifactKey, ArtifactDefinition> = {
  preview: {
    label: "Preview",
    suffix: "preview",
    extension: "html",
    contentType: "text/html; charset=utf-8",
    disposition: "inline",
    format: "html",
    topLevelUrl: "previewUrl"
  },
  data: {
    label: "Report JSON",
    suffix: "report-data",
    extension: "json",
    contentType: "application/json; charset=utf-8",
    disposition: "attachment",
    format: "json",
    labelIncludes: "report",
    topLevelUrl: "fileUrl"
  },
  evidence: {
    label: "Evidence JSON",
    suffix: "evidence-bundle",
    extension: "json",
    contentType: "application/json; charset=utf-8",
    disposition: "attachment",
    format: "json",
    labelIncludes: "evidence",
    topLevelUrl: "evidenceBundleUrl"
  },
  pdf: {
    label: "PDF",
    suffix: "snapshot",
    extension: "pdf",
    contentType: "application/pdf",
    disposition: "attachment",
    format: "pdf",
    metadataUrl: "pdfUrl"
  },
  workbook: {
    label: "Excel workbook",
    suffix: "workbook",
    extension: "xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    disposition: "attachment",
    format: "xlsx",
    metadataUrl: "workbookUrl"
  },
  "portfolio-csv": {
    label: "Portfolio CSV",
    suffix: "portfolio",
    extension: "csv",
    contentType: "text/csv; charset=utf-8",
    disposition: "attachment",
    format: "csv",
    labelIncludes: "portfolio",
    metadataUrl: "portfolioCsvUrl"
  },
  "evidence-csv": {
    label: "Evidence CSV",
    suffix: "evidence",
    extension: "csv",
    contentType: "text/csv; charset=utf-8",
    disposition: "attachment",
    format: "csv",
    labelIncludes: "evidence",
    metadataUrl: "evidenceCsvUrl"
  },
  manifest: {
    label: "Manifest",
    suffix: "manifest",
    extension: "json",
    contentType: "application/json; charset=utf-8",
    disposition: "attachment",
    metadataUrl: "manifestUrl"
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeCorporateReportArtifactKey(value: string | null | undefined): CorporateReportArtifactKey | null {
  return corporateReportArtifactKeys.includes(value as CorporateReportArtifactKey) ? (value as CorporateReportArtifactKey) : null;
}

function manifestFiles(manifest: unknown) {
  if (!isRecord(manifest) || !Array.isArray(manifest.files)) {
    return [];
  }

  return manifest.files
    .filter((file): file is Record<string, unknown> => isRecord(file))
    .map((file) => ({
      label: typeof file.label === "string" ? file.label : "Artifact",
      format: typeof file.format === "string" ? file.format : "file",
      url: typeof file.url === "string" ? file.url : null,
      required: file.required === true
    }))
    .filter((file) => file.url);
}

function manifestUrl(manifest: unknown, key: CorporateReportArtifactKey) {
  if (!isRecord(manifest)) {
    return null;
  }

  if (key === "manifest" && typeof manifest.manifestUrl === "string") {
    return manifest.manifestUrl;
  }

  const definition = corporateReportArtifactDefinitions[key];

  if (!definition.format) {
    return null;
  }

  return (
    manifestFiles(manifest).find(
      (file) => file.format === definition.format && (!definition.labelIncludes || file.label.toLowerCase().includes(definition.labelIncludes))
    )?.url ?? null
  );
}

function metadataUrl(metadata: unknown, key: CorporateReportArtifactKey) {
  const definition = corporateReportArtifactDefinitions[key];

  if (!definition.metadataUrl || !isRecord(metadata)) {
    return null;
  }

  const value = metadata[definition.metadataUrl];

  return typeof value === "string" ? value : null;
}

export function corporateReportArtifactSourceUrl(report: CorporateReportArtifactSource, key: CorporateReportArtifactKey) {
  const definition = corporateReportArtifactDefinitions[key];
  const topLevelUrl = definition.topLevelUrl ? report[definition.topLevelUrl] : null;

  return topLevelUrl ?? manifestUrl(report.artifactManifest, key) ?? metadataUrl(report.metadata, key);
}

export function corporateReportArtifactRoute(reportId: string, key: CorporateReportArtifactKey) {
  return `/corporate/reports/${encodeURIComponent(reportId)}/artifact/${key}`;
}

function safeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "corporate-report";
}

export function corporateReportArtifactFilename(exportCode: string, key: CorporateReportArtifactKey) {
  const definition = corporateReportArtifactDefinitions[key];

  return `${safeFilenamePart(exportCode)}-${definition.suffix}.${definition.extension}`;
}

export function corporateReportArtifactContentType(key: CorporateReportArtifactKey) {
  return corporateReportArtifactDefinitions[key].contentType;
}

export function corporateReportArtifactDisposition(exportCode: string, key: CorporateReportArtifactKey) {
  const definition = corporateReportArtifactDefinitions[key];
  const filename = corporateReportArtifactFilename(exportCode, key);

  return `${definition.disposition}; filename="${filename}"`;
}

export function corporateReportArtifactLocalPath(url: string | null | undefined) {
  if (!url || !url.startsWith("/generated/corporate-reports/")) {
    return null;
  }

  let decodedPath = "";

  try {
    decodedPath = decodeURIComponent(url.split("?")[0] ?? "");
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, "");
  const publicRoot = path.join(process.cwd(), "public");
  const reportsRoot = path.join(publicRoot, "generated", "corporate-reports");
  const resolvedPath = path.join(publicRoot, relativePath);
  const relation = path.relative(reportsRoot, resolvedPath);

  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    return null;
  }

  return resolvedPath;
}
