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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

  return `terumbu-impact-report-${safeMonth || "monthly"}.html`;
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
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function buildMonthlyImpactReportDownloadHtml(report: MonthlyImpactReportRecord, origin = "https://terumbu.eco") {
  const holderName = monthlyImpactReportHolderName(report);
  const digest = monthlyImpactReportDigest(report.metadata);
  const generatedAt = formatDate(report.generatedAt);
  const reportHref = `${origin}/dashboard#monthly-report`;
  const campaignRows = digest.campaignDigest
    .slice(0, 8)
    .map(
      (campaign) => `<tr>
        <td><a href="${escapeHtml(`${origin}/campaigns/${campaign.slug}`)}">${escapeHtml(campaign.title)}</a></td>
        <td>${escapeHtml(formatCurrency(campaign.contribution))}</td>
        <td>${campaign.updateCount}</td>
        <td>${campaign.evidenceCount}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(report.label)} - Terumbu.eco Monthly Impact Report</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #07343f; background: #f6f0e6; }
    main { max-width: 980px; margin: 40px auto; padding: 40px; background: white; border: 1px solid #d8e4dc; }
    .eyebrow { color: #cc5f45; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
    h1 { font-size: 40px; margin: 12px 0 4px; }
    h2 { font-size: 24px; margin: 28px 0 12px; color: #126f6f; }
    .meta { color: #60737a; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 28px; }
    .card { border: 1px solid #d8e4dc; border-radius: 14px; padding: 16px; background: #f8fbf8; }
    .card strong { display: block; font-size: 24px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #d8e4dc; padding: 12px 8px; text-align: left; }
    th { color: #60737a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    a { color: #126f6f; }
    .seal { margin-top: 32px; padding: 16px; background: #e4f3e9; border-radius: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Terumbu.eco Monthly Impact Report</p>
    <h1>${escapeHtml(report.label)}</h1>
    <p class="meta">${escapeHtml(holderName)} / Generated ${escapeHtml(generatedAt)} / ${escapeHtml(report.reportMonth)}</p>
    <section class="grid" aria-label="Impact summary">
      <div class="card"><strong>${escapeHtml(formatCurrency(report.contributions))}</strong><span>Contributions</span></div>
      <div class="card"><strong>${report.campaignUpdates}</strong><span>Campaign updates</span></div>
      <div class="card"><strong>${report.newEvidence}</strong><span>New evidence records</span></div>
      <div class="card"><strong>${report.coralsMonitored}</strong><span>Corals monitored</span></div>
    </section>
    <h2>Learning progress</h2>
    <p>${report.academyProgress} Academy course completion(s) were recorded for this report month.</p>
    <h2>Campaign digest</h2>
    <p>${digest.campaignCount} campaign(s) contributed to this report, including ${digest.followedCampaignCount} followed campaign(s).</p>
    ${
      campaignRows
        ? `<table>
      <thead><tr><th>Campaign</th><th>Contribution</th><th>Updates</th><th>Evidence</th></tr></thead>
      <tbody>${campaignRows}</tbody>
    </table>`
        : "<p>No followed or supported campaign activity was recorded for this period.</p>"
    }
    <p class="seal">This report is generated from Terumbu.eco account activity, followed campaigns, verified evidence, and Academy progress. View the live dashboard at <a href="${escapeHtml(reportHref)}">${escapeHtml(reportHref)}</a>.</p>
  </main>
</body>
</html>`;
}
