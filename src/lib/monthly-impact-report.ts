import { buildPdfDocument, PDF_COLORS, PDF_PAGE_HEIGHT, PDF_PAGE_WIDTH, pdfRectangleCommand, pdfTextCommand, wrapPdfText } from "@/lib/pdf-document";

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
    currency: "IDR",
    currencyDisplay: "code",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function metricCard(label: string, value: string, x: number, y: number, width: number) {
  return [
    pdfRectangleCommand(x, y, width, 78, PDF_COLORS.wash, PDF_COLORS.border),
    pdfTextCommand({ text: label, x: x + 12, y: y + 51, size: 8.5, font: "bold", color: PDF_COLORS.muted }),
    pdfTextCommand({ text: value, x: x + 12, y: y + 25, size: 14, font: "bold", color: PDF_COLORS.ocean })
  ];
}

function addWrappedText(commands: string[], text: string, x: number, y: number, maxWidth: number, size: number, options: { font?: "regular" | "bold"; color?: string; lineHeight?: number } = {}) {
  const lineHeight = options.lineHeight ?? size + 4;
  const lines = wrapPdfText(text, maxWidth, size);

  lines.forEach((line, index) => {
    commands.push(pdfTextCommand({ text: line, x, y: y - index * lineHeight, size, font: options.font, color: options.color }));
  });

  return y - lines.length * lineHeight;
}

export function buildMonthlyImpactReportDownloadPdf(report: MonthlyImpactReportRecord, origin = "https://terumbu.eco") {
  const holderName = monthlyImpactReportHolderName(report);
  const digest = monthlyImpactReportDigest(report.metadata);
  const generatedAt = formatDate(report.generatedAt);
  const reportHref = `${origin}/dashboard#monthly-report`;
  const activityTotal = report.campaignUpdates + report.newEvidence + report.academyProgress;
  const metrics = [
    ["Contributions", formatCurrency(report.contributions)],
    ["Campaign updates", formatNumber(report.campaignUpdates)],
    ["Evidence records", formatNumber(report.newEvidence)],
    ["Corals monitored", formatNumber(report.coralsMonitored)]
  ];
  const commands = [
    pdfRectangleCommand(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, PDF_COLORS.sand),
    pdfRectangleCommand(48, 72, 499, 700, PDF_COLORS.white, PDF_COLORS.border),
    pdfRectangleCommand(48, 628, 499, 144, PDF_COLORS.ocean),
    pdfTextCommand({ text: "Terumbu.eco Monthly Impact Report", x: 76, y: 730, size: 10, font: "bold", color: PDF_COLORS.coral }),
    pdfTextCommand({ text: report.label, x: 76, y: 694, size: 24, font: "bold", color: PDF_COLORS.white }),
    pdfTextCommand({ text: holderName, x: 76, y: 665, size: 14, font: "bold", color: PDF_COLORS.white }),
    pdfTextCommand({ text: `Generated ${generatedAt} / Reporting month ${report.reportMonth}`, x: 76, y: 642, size: 9.5, font: "bold", color: "0.820 0.902 0.898" })
  ];

  metrics.forEach(([label, value], index) => {
    const x = 76 + index * 111;
    commands.push(...metricCard(label, value, x, 520, 101));
  });

  commands.push(pdfTextCommand({ text: "Impact narrative", x: 76, y: 474, size: 13, font: "bold" }));
  addWrappedText(
    commands,
    `${formatNumber(activityTotal)} activity signals were recorded this month, including ${formatNumber(report.academyProgress)} Academy course completion(s) and ${formatNumber(digest.campaignCount)} campaign(s) in this report.`,
    76,
    450,
    443,
    10.5,
    { color: PDF_COLORS.muted, lineHeight: 15 }
  );

  commands.push(pdfRectangleCommand(76, 390, 443, 1, PDF_COLORS.border));
  commands.push(pdfTextCommand({ text: "Campaign digest", x: 76, y: 362, size: 13, font: "bold" }));
  commands.push(pdfTextCommand({ text: `${digest.generatedBy} / ${formatNumber(digest.followedCampaignCount)} followed campaign(s)`, x: 76, y: 342, size: 9, font: "bold", color: PDF_COLORS.muted }));

  let y = 312;
  const campaignRows = digest.campaignDigest.slice(0, 8);

  if (campaignRows.length === 0) {
    addWrappedText(commands, "No followed or supported campaign activity was recorded for this period.", 76, y, 443, 10.5, { color: PDF_COLORS.muted });
  } else {
    for (const [index, campaign] of campaignRows.entries()) {
      const campaignUrl = `${origin}/campaigns/${campaign.slug}`;
      const titleLines = wrapPdfText(campaign.title, 210, 10.5);
      const urlLines = wrapPdfText(campaignUrl, 384, 8.5);
      const rowHeight = titleLines.length * 13 + urlLines.length * 11 + 24;

      if (y - rowHeight < 190) {
        addWrappedText(commands, `${campaignRows.length - index} additional campaign(s) are available in the dashboard.`, 76, y, 443, 9.5, { color: PDF_COLORS.muted });
        break;
      }

      titleLines.forEach((line, lineIndex) => {
        commands.push(pdfTextCommand({ text: line, x: 76, y: y - lineIndex * 13, size: 10.5, font: "bold" }));
      });
      commands.push(pdfTextCommand({ text: formatCurrency(campaign.contribution), x: 312, y, size: 9.5, font: "bold", color: PDF_COLORS.ocean }));
      commands.push(pdfTextCommand({ text: `${formatNumber(campaign.updateCount)} updates / ${formatNumber(campaign.evidenceCount)} evidence`, x: 410, y, size: 8.5, font: "bold", color: PDF_COLORS.muted }));
      y -= titleLines.length * 13 + 2;
      urlLines.forEach((line, lineIndex) => {
        commands.push(pdfTextCommand({ text: line, x: 76, y: y - lineIndex * 11, size: 8.5, color: PDF_COLORS.kelp }));
      });
      y -= urlLines.length * 11;
      commands.push(pdfRectangleCommand(76, y - 5, 443, 0.7, PDF_COLORS.border));
      y -= 22;
    }
  }

  commands.push(pdfRectangleCommand(76, 112, 443, 64, PDF_COLORS.seal));
  addWrappedText(
    commands,
    `This report is generated from Terumbu.eco account activity, followed campaigns, verified evidence, and Academy progress. View the live dashboard at ${reportHref}.`,
    100,
    151,
    393,
    9.5,
    { font: "bold", lineHeight: 13 }
  );
  commands.push(pdfTextCommand({ text: `Terumbu.eco personal impact report / ${report.reportMonth}`, x: 76, y: 90, size: 8.5, color: PDF_COLORS.muted }));

  return buildPdfDocument(commands.join("\n"));
}
