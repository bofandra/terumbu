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
  return value.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function buildMonthlyImpactReportDownloadHtml(report: MonthlyImpactReportRecord, origin = "https://terumbu.eco") {
  const holderName = monthlyImpactReportHolderName(report);
  const digest = monthlyImpactReportDigest(report.metadata);
  const generatedAt = formatDate(report.generatedAt);
  const reportHref = `${origin}/dashboard#monthly-report`;
  const activityTotal = report.campaignUpdates + report.newEvidence + report.academyProgress;
  const campaignRows = digest.campaignDigest
    .slice(0, 8)
    .map(
      (campaign) => `<tr>
        <td><a href="${escapeHtml(`${origin}/campaigns/${campaign.slug}`)}">${escapeHtml(campaign.title)}</a></td>
        <td>${escapeHtml(formatCurrency(campaign.contribution))}</td>
        <td>${formatNumber(campaign.updateCount)}</td>
        <td>${formatNumber(campaign.evidenceCount)}</td>
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
    :root { color-scheme: light; --ink: #0b2f37; --muted: #60737a; --line: #d8e4dc; --paper: #ffffff; --wash: #f4f6f0; --deep: #063746; --green: #14735d; --accent: #c95f43; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: var(--wash); font-family: Arial, sans-serif; line-height: 1.5; }
    main { max-width: 1040px; margin: 0 auto; padding: 32px 22px 46px; }
    h1, h2, h3, p { margin: 0; }
    h1 { max-width: 720px; font-size: clamp(34px, 5vw, 56px); line-height: .98; letter-spacing: 0; }
    h2 { font-size: 23px; letter-spacing: 0; }
    a { color: var(--green); font-weight: 800; }
    .cover { overflow: hidden; border-radius: 22px; background: var(--deep); color: #fff; box-shadow: 0 24px 58px rgba(6, 55, 70, .16); }
    .cover-inner { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 28px; padding: 36px; }
    .eyebrow { color: #f2b39d; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    .meta { margin-top: 18px; color: rgba(255,255,255,.72); font-weight: 700; }
    .identity { border: 1px solid rgba(255,255,255,.18); border-radius: 16px; background: rgba(255,255,255,.08); padding: 18px; }
    .identity span { display: block; color: rgba(255,255,255,.58); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .identity strong { display: block; margin-top: 6px; font-size: 18px; }
    .identity p { margin-top: 14px; color: rgba(255,255,255,.68); font-size: 13px; font-weight: 700; }
    .section { margin-top: 20px; border: 1px solid var(--line); border-radius: 18px; background: var(--paper); padding: 24px; box-shadow: 0 12px 34px rgba(7, 52, 63, .07); }
    .section-head { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
    .section-head p { max-width: 640px; color: var(--muted); font-weight: 700; }
    .badge { display: inline-flex; align-items: center; min-height: 32px; border-radius: 999px; background: #e8f5ef; color: var(--green); padding: 0 12px; font-size: 12px; font-weight: 900; white-space: nowrap; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .card { min-height: 140px; border: 1px solid var(--line); border-radius: 16px; background: linear-gradient(180deg, #fff, #f8fbf8); padding: 16px; }
    .card span { display: block; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .card strong { display: block; margin-top: 12px; font-size: 28px; line-height: 1.05; }
    .card p { margin-top: 10px; color: var(--muted); font-size: 13px; font-weight: 700; }
    .two-col { display: grid; grid-template-columns: .9fr 1.1fr; gap: 16px; }
    .narrative { border-left: 4px solid var(--accent); background: #fff8f5; padding: 16px; }
    .narrative strong, .narrative span { display: block; }
    .narrative span { margin-top: 8px; color: var(--muted); font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { border-bottom: 1px solid var(--line); color: var(--muted); font-size: 11px; letter-spacing: .08em; padding: 0 10px 10px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid #edf2ee; padding: 13px 10px; vertical-align: top; }
    .seal { margin-top: 20px; border: 1px solid #cfe7d9; border-radius: 16px; background: #e9f6ef; padding: 16px; color: var(--deep); font-weight: 800; }
    footer { margin-top: 20px; color: var(--muted); font-size: 12px; font-weight: 700; text-align: center; }
    @media (max-width: 820px) {
      main { padding: 18px 12px 30px; }
      .cover-inner, .grid, .two-col { grid-template-columns: 1fr; }
      .cover-inner { padding: 24px; }
      .section { padding: 18px; overflow-x: auto; }
      .section-head { display: block; }
      .badge { margin-top: 12px; }
    }
    @media print {
      body { background: #fff; }
      main { max-width: none; padding: 0; }
      .cover, .section { box-shadow: none; break-inside: avoid; }
      .cover { border-radius: 0; }
    }
  </style>
</head>
<body>
  <main>
    <header class="cover">
      <div class="cover-inner">
        <div>
          <p class="eyebrow">Terumbu.eco Monthly Impact Report</p>
          <h1>${escapeHtml(report.label)}</h1>
          <p class="meta">${escapeHtml(holderName)} / Generated ${escapeHtml(generatedAt)} / Reporting month ${escapeHtml(report.reportMonth)}</p>
        </div>
        <aside class="identity">
          <span>Report holder</span>
          <strong>${escapeHtml(holderName)}</strong>
          <p>Personal impact summary generated from contributions, followed campaigns, evidence activity, monitored corals, and Academy progress.</p>
        </aside>
      </div>
    </header>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Impact summary</h2>
          <p>A compact monthly view of the activity that contributed to this account's conservation record.</p>
        </div>
        <span class="badge">${formatNumber(activityTotal)} activity signals</span>
      </div>
      <div class="grid" aria-label="Impact summary">
        <article class="card"><span>Contributions</span><strong>${escapeHtml(formatCurrency(report.contributions))}</strong><p>Recorded financial support for the month.</p></article>
        <article class="card"><span>Campaign updates</span><strong>${formatNumber(report.campaignUpdates)}</strong><p>New updates from supported or followed campaigns.</p></article>
        <article class="card"><span>Evidence records</span><strong>${formatNumber(report.newEvidence)}</strong><p>Evidence linked to this month's activity.</p></article>
        <article class="card"><span>Corals monitored</span><strong>${formatNumber(report.coralsMonitored)}</strong><p>Monitoring-linked coral records this period.</p></article>
      </div>
    </section>

    <section class="section">
      <div class="two-col">
        <article class="narrative">
          <strong>Learning progress</strong>
          <span>${formatNumber(report.academyProgress)} Academy course completion(s) were recorded for this report month.</span>
        </article>
        <article class="narrative">
          <strong>Campaign coverage</strong>
          <span>${formatNumber(digest.campaignCount)} campaign(s) contributed to this report, including ${formatNumber(digest.followedCampaignCount)} followed campaign(s).</span>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Campaign digest</h2>
          <p>Campaign-level detail behind this monthly personal impact summary.</p>
        </div>
        <span class="badge">${escapeHtml(digest.generatedBy)}</span>
      </div>
      ${
        campaignRows
          ? `<table>
        <thead><tr><th>Campaign</th><th>Contribution</th><th>Updates</th><th>Evidence</th></tr></thead>
        <tbody>${campaignRows}</tbody>
      </table>`
          : "<p>No followed or supported campaign activity was recorded for this period.</p>"
      }
    </section>

    <p class="seal">This report is generated from Terumbu.eco account activity, followed campaigns, verified evidence, and Academy progress. View the live dashboard at <a href="${escapeHtml(reportHref)}">${escapeHtml(reportHref)}</a>.</p>
    <footer>Terumbu.eco personal impact report / ${escapeHtml(report.reportMonth)} / ${escapeHtml(generatedAt)}</footer>
  </main>
</body>
</html>`;
}
