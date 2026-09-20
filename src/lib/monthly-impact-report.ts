import { buildPdfDocumentPages, PDF_COLORS, pdfRectangleCommand, pdfTextCommand, wrapPdfText } from "@/lib/pdf-document";
import { REPORT_CONTENT_WIDTH, REPORT_CONTENT_X, brandedReportPage, reportMetricCard, reportNoteBox, reportSectionTitle } from "@/lib/terumbu-report-pdf";

export type MonthlyImpactReportRecord = {
  id?: string | null;
  reportMonth: string;
  label: string;
  contributions: number;
  campaignUpdates: number;
  newEvidence: number;
  coralsMonitored: number;
  academyProgress: number;
  generatedAt: Date;
  emailedAt?: Date | null;
  metadata?: unknown;
  userName?: string | null;
  displayName?: string | null;
  userEmail?: string | null;
};

export type MonthlyImpactCampaignDigestItem = {
  title: string;
  slug: string;
  contribution: number;
  updateCount: number;
  evidenceCount: number;
};

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function safeNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function monthlyImpactReportFilename(report: Pick<MonthlyImpactReportRecord, "reportMonth">) {
  const safeMonth = report.reportMonth
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `terumbu-impact-report-${safeMonth || "monthly"}.pdf`;
}

export function monthlyImpactReportDigest(metadata: unknown) {
  const record = metadataRecord(metadata);
  const campaignDigest = Array.isArray(record.campaignDigest)
    ? record.campaignDigest
        .map((item) => {
          const campaign = metadataRecord(item);
          const title = safeString(campaign.title).trim();
          const slug = safeString(campaign.slug).trim();

          if (!title || !slug) {
            return null;
          }

          return {
            title,
            slug,
            contribution: safeNumber(campaign.contribution),
            updateCount: Math.max(0, Math.round(safeNumber(campaign.updateCount))),
            evidenceCount: Math.max(0, Math.round(safeNumber(campaign.evidenceCount)))
          };
        })
        .filter((item): item is MonthlyImpactCampaignDigestItem => Boolean(item))
    : [];

  return {
    generatedBy: safeString(record.generatedBy) || "dashboard_action",
    followedCampaignCount: Math.max(0, Math.round(safeNumber(record.followedCampaignCount))),
    campaignCount: Math.max(campaignDigest.length, Math.round(safeNumber(record.campaignCount))),
    campaignDigest
  };
}

export function monthlyImpactReportHolderName(report: Pick<MonthlyImpactReportRecord, "displayName" | "userName" | "userEmail">) {
  return report.displayName || report.userName || report.userEmail || "Ocean Hero";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    maximumFractionDigits: 0
  }).format(value);
}


function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function projectDigestPage(
  report: MonthlyImpactReportRecord,
  digest: ReturnType<typeof monthlyImpactReportDigest>,
  campaigns: MonthlyImpactCampaignDigestItem[],
  origin: string,
  pageNumber: number,
  totalPages: number
) {
  const holderName = monthlyImpactReportHolderName(report);
  const commands = brandedReportPage({
    section: "Personal impact report",
    title: "Project activity",
    subtitle: `${holderName} / ${report.label}`,
    reportId: `TRB-${report.reportMonth}`,
    generatedAt: report.generatedAt,
    pageNumber,
    totalPages,
    compactHeader: true
  });
  let y = 660;
  y = reportSectionTitle(commands, "Projects in this report", y, `${digest.followedCampaignCount} followed project(s); activity is included only when recorded for this reporting month.`) - 8;

  commands.push(pdfRectangleCommand(REPORT_CONTENT_X, y - 24, REPORT_CONTENT_WIDTH, 28, PDF_COLORS.wash, PDF_COLORS.border));
  commands.push(pdfTextCommand({ text: "PROJECT", x: 72, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "CONTRIBUTION", x: 322, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "UPDATES", x: 420, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "EVIDENCE", x: 490, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  y -= 40;

  campaigns.forEach((campaign, index) => {
    const rowY = y - index * 46;
    const titleLines = wrapPdfText(campaign.title, 230, 8.7).slice(0, 2);
    commands.push(pdfRectangleCommand(REPORT_CONTENT_X, rowY - 30, REPORT_CONTENT_WIDTH, 42, index % 2 === 0 ? PDF_COLORS.white : PDF_COLORS.wash));
    titleLines.forEach((line, lineIndex) => commands.push(pdfTextCommand({ text: line, x: 72, y: rowY - 3 - lineIndex * 11, size: 8.5, font: "bold" })));
    commands.push(pdfTextCommand({ text: formatCurrency(campaign.contribution), x: 322, y: rowY - 6, size: 8.1, font: "bold" }));
    commands.push(pdfTextCommand({ text: formatNumber(campaign.updateCount), x: 438, y: rowY - 6, size: 8.1, font: "bold" }));
    commands.push(pdfTextCommand({ text: formatNumber(campaign.evidenceCount), x: 510, y: rowY - 6, size: 8.1, font: "bold" }));
  });

  if (campaigns.length === 0) {
    commands.push(pdfTextCommand({ text: "No supported or followed project activity was recorded for this period.", x: REPORT_CONTENT_X, y: y - 24, size: 9.5, color: PDF_COLORS.muted }));
  }

  reportNoteBox(
    commands,
    "Traceability",
    `This report summarizes activity stored in Terumbu.eco. The live account remains the source of record. Dashboard: ${origin}/dashboard`,
    150
  );
  return commands.join("\n");
}

export function buildMonthlyImpactReportDownloadPdf(report: MonthlyImpactReportRecord, origin = "https://terumbu.eco") {
  const holderName = monthlyImpactReportHolderName(report);
  const digest = monthlyImpactReportDigest(report.metadata);
  const campaignChunks: MonthlyImpactCampaignDigestItem[][] = [];
  for (let index = 0; index < digest.campaignDigest.length; index += 10) {
    campaignChunks.push(digest.campaignDigest.slice(index, index + 10));
  }
  if (campaignChunks.length === 0) {
    campaignChunks.push([]);
  }

  const totalPages = 1 + campaignChunks.length;
  const reportId = `TRB-${report.reportMonth}`;
  const cover = brandedReportPage({
    section: "Personal impact report",
    title: report.label,
    subtitle: holderName,
    reportId,
    generatedAt: report.generatedAt,
    pageNumber: 1,
    totalPages
  });
  cover.push(pdfTextCommand({ text: holderName, x: REPORT_CONTENT_X, y: 592, size: 13, font: "bold" }));
  cover.push(pdfTextCommand({ text: `Reporting month: ${report.reportMonth}`, x: REPORT_CONTENT_X, y: 570, size: 9.2, font: "bold", color: PDF_COLORS.muted }));

  const metrics = [
    ["Contributions", formatCurrency(report.contributions)],
    ["Project updates", formatNumber(report.campaignUpdates)],
    ["Evidence records", formatNumber(report.newEvidence)],
    ["Corals monitored", formatNumber(report.coralsMonitored)]
  ];
  metrics.forEach(([label, value], index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    cover.push(...reportMetricCard(label, value, REPORT_CONTENT_X + column * 238, 455 - row * 84, 226));
  });

  const activityTotal = report.campaignUpdates + report.newEvidence + report.academyProgress;
  let y = 350;
  y = reportSectionTitle(
    cover,
    "Monthly summary",
    y,
    `${formatNumber(activityTotal)} recorded activity signal(s), ${formatNumber(report.academyProgress)} Academy completion(s), and ${formatNumber(digest.campaignCount)} project(s) represented in this report.`
  ) - 8;
  y = reportSectionTitle(
    cover,
    "Report scope",
    y,
    "Includes paid contributions, project updates, evidence records linked to supported or followed projects, coral monitoring updates, and Academy completions recorded during the month."
  ) - 8;
  reportNoteBox(
    cover,
    "Terumbu reporting note",
    "This PDF is an account activity summary generated from Terumbu.eco records. It does not introduce estimated impact values and is not an independent assurance statement.",
    Math.min(y, 185)
  );

  const pages = [cover.join("\n")];
  campaignChunks.forEach((campaigns) => {
    pages.push(projectDigestPage(report, digest, campaigns, origin, pages.length + 1, totalPages));
  });

  return buildPdfDocumentPages(pages);
}
