"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  campaignActivities,
  campaigns,
  corporateAccounts,
  corporateContributions,
  corporateEmployeeEventRegistrations,
  corporateEmployeeEvents,
  corporateEmployees,
  corporateEmployeeInvites,
  corporateEvidenceCenter,
  corporateIntegrations,
  corporatePermissions,
  corporateProgramBudgets,
  corporatePrograms,
  corporateProjectPortfolio,
  corporateReportExports,
  corporateSecuritySettings,
  evidenceReviewEvents,
  projectEvidence,
  users
} from "@/db/schema";
import { requireUser, safeRedirectPath } from "@/lib/auth";
import {
  normalizeCorporateIntegrationStatus,
  normalizeCorporateIntegrationType
} from "@/lib/corporate-governance";
import {
  canAssignCorporateEmployeeRole,
  corporateCapabilitiesForPermission,
  normalizeCorporateEmployeeRole,
  permissionForCorporateEmployeeRole
} from "@/lib/corporate-permissions";
import {
  canAcceptCorporateEmployeeInvite,
  corporateEventRegistrationAvailability,
  corporateInviteExpiresAt,
  normalizeCorporateEmployeeEventStatus,
  normalizeCorporateEmployeeEventType,
  normalizeCorporateProgramStatus
} from "@/lib/corporate-lifecycle";
import {
  buildCorporateReportPdf,
  buildCorporateReportWorkbookXlsx,
  corporateReportEvidenceCsv,
  corporateReportPortfolioCsv,
  type CorporateReportArtifactInput
} from "@/lib/corporate-report-artifacts";
import {
  buildCorporateReportArtifactManifest,
  corporateReportFormatLabel,
  corporateReportTypeLabel,
  normalizeCorporateReportFormat,
  normalizeCorporateReportType
} from "@/lib/corporate-report-lifecycle";
import {
  evidenceReviewActionForTransition,
  evidenceReviewNoteRequired,
  normalizeEvidenceVerificationStatus
} from "@/lib/evidence-review-workflow";
import {
  buildCorporateContributionReference,
  campaignRaisedDelta,
  normalizeCorporateContributionStatus,
  normalizeCorporateContributionType
} from "@/lib/corporate-contributions";
import { getCorporateDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

function exportCode() {
  return `TRB-ESG-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function nextArtifactVersion(existingCount: number) {
  return Math.max(1, existingCount + 1);
}

function toSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "corporate-impact";
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function redirectWithResult(path: string, key: "error" | "saved", value: string): never {
  const separator = path.includes("?") ? "&" : "?";

  redirect(`${path}${separator}${key}=${encodeURIComponent(value)}`);
}

async function corporateContext(userId: string, requestedProgramId?: string | null) {
  const contextRows = await db
    .select({
      accountId: corporateAccounts.id,
      accountName: corporateAccounts.name,
      accountSlug: corporateAccounts.slug,
      programId: corporatePrograms.id,
      programName: corporatePrograms.name,
      permission: corporatePermissions.permission
    })
    .from(corporatePermissions)
    .innerJoin(corporateAccounts, eq(corporatePermissions.corporateAccountId, corporateAccounts.id))
    .innerJoin(corporatePrograms, eq(corporatePrograms.corporateAccountId, corporateAccounts.id))
    .where(eq(corporatePermissions.userId, userId))
    .orderBy(desc(corporatePrograms.startsAt), desc(corporatePrograms.createdAt));
  const context = requestedProgramId ? contextRows.find((item) => item.programId === requestedProgramId) : contextRows[0];

  return context ?? null;
}

function parsePositiveAmount(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .replace(/[^\d.]/g, "")
    .trim();
  const amount = Number(normalized);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseNonNegativeAmount(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .replace(/[^\d.]/g, "")
    .trim();

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);

  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function dateValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  const parsed = text ? new Date(text) : null;

  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function textValue(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function auditMetadata(values: Record<string, unknown>) {
  return {
    source: "corporate_portal",
    ...values
  };
}

async function writeAuditLog(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(adminAuditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: auditMetadata(input.metadata ?? {})
  });
}

function formatReportDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function formatReportNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function clampPercent(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : 0)));
}

function corporateReportStatusTone(value: string | null | undefined) {
  const label = String(value ?? "").toLowerCase();

  if (label.includes("risk") || label.includes("rejected")) {
    return "danger";
  }

  if (label.includes("attention") || label.includes("review") || label.includes("clarification") || label.includes("awaiting")) {
    return "warn";
  }

  if (label.includes("verified") || label.includes("track") || label.includes("complete")) {
    return "good";
  }

  return "neutral";
}

function corporateReportPresentation(reportType: string) {
  const normalizedType = normalizeCorporateReportType(reportType);

  if (normalizedType === "csr") {
    return {
      label: "CSR Impact Report",
      eyebrow: "Corporate social responsibility",
      headline: "Community and coastal restoration outcomes",
      summary:
        "A board-ready summary of conservation funding, employee engagement, partner delivery, and verified community-facing impact."
    };
  }

  if (normalizedType === "evidence") {
    return {
      label: "Evidence Assurance Bundle",
      eyebrow: "Evidence and verification",
      headline: "Reportable field records and source traceability",
      summary:
        "A source-led package for reviewers, auditors, and finance teams that need to trace claims back to verified campaign evidence."
    };
  }

  return {
    label: "ESG Impact Report",
    eyebrow: "Environmental, social, and governance",
    headline: "Verified blue-carbon and coastal conservation performance",
    summary:
      "A professional ESG package covering committed funding, utilization, field evidence, risk posture, and reportable restoration outputs."
  };
}

function reportHtml(input: {
  exportCode: string;
  reportType: string;
  exportFormat: string;
  artifactVersion: number;
  generatedAt: Date;
  accountName: string;
  programName: string;
  data: NonNullable<Awaited<ReturnType<typeof getCorporateDashboardData>>>;
}) {
  const { data } = input;
  const presentation = corporateReportPresentation(input.reportType);
  const verifiedEvidenceCount = data.evidence.filter((item) => item.verificationStatus === "verified").length;
  const evidenceRate = data.evidence.length > 0 ? Math.round((verifiedEvidenceCount / data.evidence.length) * 100) : 0;
  const atRiskCount = data.portfolio.filter((project) => ["At Risk", "Needs Attention"].includes(project.statusLabel)).length;
  const primaryMetrics = [
    {
      label: "Committed funding",
      value: formatCurrency(data.financials.committedFunding),
      support: "Approved corporate program budget"
    },
    {
      label: "Verified utilization",
      value: formatCurrency(data.financials.verifiedUtilization),
      support: `${clampPercent(data.financials.verifiedUtilizationRate)}% matched to verified evidence`
    },
    {
      label: "Restoration units",
      value: formatReportNumber(data.impactOutputs.restorationUnits),
      support: "Coral, mangrove, and ecosystem units supported"
    },
    {
      label: "Evidence readiness",
      value: `${evidenceRate}%`,
      support: `${formatReportNumber(verifiedEvidenceCount)} of ${formatReportNumber(data.evidence.length)} records verified`
    }
  ];
  const portfolioRows = data.portfolio
    .slice(0, 14)
    .map(
      (project) => `
        <tr>
          <td>
            <strong>${escapeHtml(project.campaignTitle)}</strong>
            <span>${escapeHtml(project.organizationName)} / ${escapeHtml(project.region)}</span>
          </td>
          <td>${escapeHtml(formatCurrency(project.allocationValue))}</td>
          <td>
            <div class="progress" aria-label="${escapeHtml(project.utilization)}% utilization">
              <span style="width: ${clampPercent(project.utilization)}%"></span>
            </div>
            <small>${escapeHtml(project.utilization)}% utilized</small>
          </td>
          <td>${escapeHtml(formatReportNumber(project.impactTarget))} ${escapeHtml(project.impactUnit)}</td>
          <td><span class="status ${corporateReportStatusTone(project.statusLabel)}">${escapeHtml(project.statusLabel)}</span></td>
        </tr>`
    )
    .join("");
  const evidenceRows = data.evidence
    .slice(0, 16)
    .map(
      (item) => `
        <tr>
          <td><strong>${escapeHtml(item.evidenceCode)}</strong><span>${escapeHtml(item.evidenceType)}</span></td>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.campaignTitle)}</td>
          <td>${escapeHtml(item.metricLabel ?? "Source record")}${item.metricValue ? `<span>${escapeHtml(item.metricValue)}</span>` : ""}</td>
          <td><span class="status ${corporateReportStatusTone(item.verificationStatus)}">${escapeHtml(item.statusLabel)}</span></td>
        </tr>`
    )
    .join("");
  const financialRows = [
    ["Committed funding", formatCurrency(data.financials.committedFunding), "Approved program ceiling"],
    ["Funds disbursed", formatCurrency(data.financials.fundsDisbursed), `${clampPercent(data.financials.disbursementRate)}% of commitment`],
    ["Verified utilization", formatCurrency(data.financials.verifiedUtilization), `${clampPercent(data.financials.verifiedUtilizationRate)}% of disbursed funds`],
    ["Pending verification", formatCurrency(data.financials.pendingVerification), "Awaiting evidence or reviewer closure"],
    ["Remaining commitment", formatCurrency(data.financials.remainingCommitment), "Available for future project allocation"]
  ];
  const impactRows = [
    ["Restoration units", formatReportNumber(data.impactOutputs.restorationUnits), "Total reportable ecosystem units"],
    ["Coral units", formatReportNumber(data.impactOutputs.coralUnits), "Coral-focused restoration activity"],
    ["Mangrove units", formatReportNumber(data.impactOutputs.mangroveUnits), "Mangrove-focused restoration activity"],
    ["Volunteer hours", formatReportNumber(data.impactOutputs.volunteerHours), "Recorded employee or community participation"],
    ["Activity records", formatReportNumber(data.impactOutputs.activityCount), "Combined portfolio, evidence, and engagement records"]
  ];
  const sdgRows = data.sdgAlignment
    .map(
      (goal) => `
        <div class="sdg">
          <strong>${escapeHtml(goal.code)}</strong>
          <span>${escapeHtml(goal.label)}</span>
          <div class="progress"><span style="width: ${clampPercent(goal.progress)}%"></span></div>
        </div>`
    )
    .join("");
  const benchmarkRows = data.benchmarks
    .slice(0, 3)
    .map(
      (benchmark) => `
        <li>
          <strong>${escapeHtml(benchmark.label)}</strong>
          <span>${escapeHtml(benchmark.current)}${escapeHtml(benchmark.unit)} current / ${escapeHtml(benchmark.benchmark)}${escapeHtml(benchmark.unit)} benchmark</span>
          <em>${escapeHtml(benchmark.insight)}</em>
        </li>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.accountName)} ${escapeHtml(presentation.label)}</title>
  <style>
    :root { color-scheme: light; --ink: #0b2f37; --muted: #5f7378; --line: #dbe6e0; --paper: #ffffff; --wash: #f5f7f3; --deep: #063746; --accent: #c85d43; --green: #18775f; --amber: #93651d; --red: #a33f32; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--wash); color: var(--ink); font-family: Inter, Arial, sans-serif; line-height: 1.45; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 24px 48px; }
    h1, h2, h3, p { margin: 0; }
    h1 { max-width: 760px; font-size: clamp(34px, 5vw, 58px); line-height: .96; letter-spacing: 0; }
    h2 { font-size: 22px; letter-spacing: 0; }
    h3 { font-size: 15px; }
    .cover { overflow: hidden; border-radius: 22px; background: var(--deep); color: #fff; box-shadow: 0 24px 60px rgba(6, 55, 70, .18); }
    .cover-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; padding: 36px; }
    .eyebrow { color: #f3b49f; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    .cover .summary { max-width: 720px; margin-top: 20px; color: rgba(255,255,255,.76); font-size: 17px; }
    .meta-panel { align-self: stretch; border: 1px solid rgba(255,255,255,.18); border-radius: 16px; background: rgba(255,255,255,.08); padding: 18px; }
    .meta-panel dl { display: grid; gap: 14px; margin: 0; }
    .meta-panel dt { color: rgba(255,255,255,.56); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .meta-panel dd { margin: 4px 0 0; font-weight: 800; }
    .section { margin-top: 20px; border: 1px solid var(--line); border-radius: 18px; background: var(--paper); padding: 24px; box-shadow: 0 12px 34px rgba(7, 52, 63, .07); }
    .section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
    .section-head p { max-width: 640px; color: var(--muted); font-weight: 700; }
    .badge { display: inline-flex; align-items: center; min-height: 32px; border-radius: 999px; background: #eef6f1; color: var(--green); padding: 0 12px; font-size: 12px; font-weight: 800; white-space: nowrap; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 28px; }
    .metric { min-height: 150px; border: 1px solid var(--line); border-radius: 16px; background: linear-gradient(180deg, #fff, #f8fbf8); padding: 16px; }
    .metric span { display: block; color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 12px; font-size: 27px; line-height: 1.05; }
    .metric p { margin-top: 10px; color: var(--muted); font-size: 13px; font-weight: 700; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { border-bottom: 1px solid var(--line); color: var(--muted); font-size: 11px; letter-spacing: .08em; padding: 0 10px 10px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid #edf2ee; padding: 14px 10px; vertical-align: top; }
    td strong, td span, td small { display: block; }
    td span, td small { margin-top: 3px; color: var(--muted); font-size: 12px; font-weight: 700; }
    .status { display: inline-flex; border-radius: 999px; padding: 5px 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .status.good { background: #e7f4ed; color: var(--green); }
    .status.warn { background: #fff3d9; color: var(--amber); }
    .status.danger { background: #ffe7e0; color: var(--red); }
    .status.neutral { background: #edf4f2; color: var(--deep); }
    .progress { height: 8px; width: 100%; overflow: hidden; border-radius: 999px; background: #e4ece8; }
    .progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--green), #58a790); }
    .summary-table td:first-child { width: 38%; font-weight: 800; }
    .summary-table td:nth-child(2) { width: 28%; font-weight: 900; }
    .sdg-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .sdg { border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
    .sdg strong, .sdg span { display: block; }
    .sdg span { min-height: 40px; margin: 4px 0 12px; color: var(--muted); font-size: 13px; font-weight: 700; }
    .note-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .note-list li { border-left: 4px solid var(--accent); background: #fff8f5; padding: 12px 14px; }
    .note-list strong, .note-list span, .note-list em { display: block; }
    .note-list span { margin-top: 4px; color: var(--muted); font-size: 13px; font-weight: 700; }
    .note-list em { margin-top: 3px; color: var(--deep); font-size: 12px; font-style: normal; font-weight: 800; }
    .empty { color: var(--muted); font-weight: 700; text-align: center; }
    footer { margin-top: 20px; color: var(--muted); font-size: 12px; font-weight: 700; text-align: center; }
    @media (max-width: 860px) {
      main { padding: 20px 14px 32px; }
      .cover-grid, .two-col, .metric-grid, .sdg-grid { grid-template-columns: 1fr; }
      .cover-grid { padding: 24px; }
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
      <div class="cover-grid">
        <div>
          <p class="eyebrow">${escapeHtml(presentation.eyebrow)}</p>
          <h1>${escapeHtml(input.accountName)} ${escapeHtml(presentation.label)}</h1>
          <p class="summary">${escapeHtml(presentation.summary)}</p>
        </div>
        <aside class="meta-panel" aria-label="Report metadata">
          <dl>
            <div><dt>Program</dt><dd>${escapeHtml(input.programName)}</dd></div>
            <div><dt>Export code</dt><dd>${escapeHtml(input.exportCode)}</dd></div>
            <div><dt>Generated</dt><dd>${escapeHtml(formatReportDate(input.generatedAt))}</dd></div>
            <div><dt>Period</dt><dd>${escapeHtml(formatReportDate(data.program.startsAt))} - ${escapeHtml(formatReportDate(data.program.endsAt))}</dd></div>
            <div><dt>Package</dt><dd>${escapeHtml(corporateReportFormatLabel(input.exportFormat))} / v${escapeHtml(input.artifactVersion)}</dd></div>
          </dl>
        </aside>
      </div>
    </header>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(presentation.headline)}</h2>
          <p>Generated from Terumbu.eco corporate program data, funding ledgers, partner project status, and verified evidence records.</p>
        </div>
        <span class="badge">ready artifact</span>
      </div>
      <div class="metric-grid">
        ${primaryMetrics.map((metric) => `<article class="metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><p>${escapeHtml(metric.support)}</p></article>`).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Executive summary</h2>
          <p>Core report metrics for finance, sustainability, and program governance review.</p>
        </div>
        <span class="badge">${formatReportNumber(data.portfolio.length)} projects / ${formatReportNumber(data.evidence.length)} evidence records</span>
      </div>
      <div class="two-col">
        <table class="summary-table">
          <thead><tr><th>Financial metric</th><th>Value</th><th>Interpretation</th></tr></thead>
          <tbody>${financialRows.map(([label, value, note]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td><td>${escapeHtml(note)}</td></tr>`).join("")}</tbody>
        </table>
        <table class="summary-table">
          <thead><tr><th>Impact metric</th><th>Value</th><th>Interpretation</th></tr></thead>
          <tbody>${impactRows.map(([label, value, note]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td><td>${escapeHtml(note)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Project portfolio</h2>
          <p>Funded conservation campaigns, utilization progress, and delivery status for the reporting period.</p>
        </div>
        <span class="badge">${formatReportNumber(atRiskCount)} items need attention</span>
      </div>
      <table>
        <thead><tr><th>Project</th><th>Allocation</th><th>Utilization</th><th>Impact target</th><th>Status</th></tr></thead>
        <tbody>${portfolioRows || `<tr><td class="empty" colspan="5">No funded project rows are available for this report period.</td></tr>`}</tbody>
      </table>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Evidence register</h2>
          <p>Source records used to support reportable claims, finance utilization, and campaign progress.</p>
        </div>
        <span class="badge">${formatReportNumber(verifiedEvidenceCount)} verified</span>
      </div>
      <table>
        <thead><tr><th>Code</th><th>Evidence</th><th>Campaign</th><th>Metric</th><th>Status</th></tr></thead>
        <tbody>${evidenceRows || `<tr><td class="empty" colspan="5">No evidence records are linked to this report period yet.</td></tr>`}</tbody>
      </table>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>SDG alignment and benchmarks</h2>
          <p>Directional reporting indicators for sustainability narratives and governance follow-up.</p>
        </div>
        <span class="badge">Next report ${escapeHtml(formatReportDate(data.reporting.nextReportingDeadline))}</span>
      </div>
      <div class="two-col">
        <div class="sdg-grid">${sdgRows}</div>
        <ul class="note-list">${benchmarkRows}</ul>
      </div>
    </section>

    <section class="section">
      <h2>Evidence bundle</h2>
      <p>This package is designed for audit review. The JSON data file contains the full report payload, the evidence bundle contains source evidence records, and CSV/XLSX artifacts provide analysis-ready extracts for finance and sustainability teams.</p>
    </section>
    <footer>Terumbu.eco generated report / ${escapeHtml(input.exportCode)} / ${escapeHtml(formatReportDate(input.generatedAt))}</footer>
  </main>
</body>
</html>`;
}

async function writeReportArtifacts(input: {
  exportCode: string;
  reportType: string;
  exportFormat: string;
  artifactVersion: number;
  accountName: string;
  programName: string;
  data: NonNullable<Awaited<ReturnType<typeof getCorporateDashboardData>>>;
}) {
  const generatedAt = new Date();
  const folder = path.join(process.cwd(), "public", "generated", "corporate-reports");
  const baseName = input.exportCode.toLowerCase();
  const reportPayload = {
    exportCode: input.exportCode,
    reportType: input.reportType,
    exportFormat: input.exportFormat,
    artifactVersion: input.artifactVersion,
    generatedAt: generatedAt.toISOString(),
    account: input.accountName,
    program: input.programName,
    executiveMetrics: input.data.executiveMetrics,
    financials: input.data.financials,
    impactOutputs: input.data.impactOutputs,
    contributions: input.data.contributions,
    portfolio: input.data.portfolio,
    evidence: input.data.evidence,
    reporting: input.data.reporting
  };
  const evidencePayload = {
    exportCode: input.exportCode,
    reportType: input.reportType,
    exportFormat: input.exportFormat,
    artifactVersion: input.artifactVersion,
    generatedAt: generatedAt.toISOString(),
    evidence: input.data.evidence.map((item) => ({
      evidenceCode: item.evidenceCode,
      title: item.title,
      evidenceType: item.evidenceType,
      verificationStatus: item.verificationStatus,
      campaignTitle: item.campaignTitle,
      sourceHref: item.sourceHref,
      fileUrl: item.fileUrl
    }))
  };
  const artifactInput: CorporateReportArtifactInput = {
    exportCode: input.exportCode,
    reportTypeLabel: corporateReportTypeLabel(input.reportType),
    accountName: input.accountName,
    programName: input.programName,
    generatedAt,
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
  const fileUrl = `/generated/corporate-reports/${baseName}.json`;
  const previewUrl = `/generated/corporate-reports/${baseName}.html`;
  const evidenceBundleUrl = `/generated/corporate-reports/${baseName}-evidence.json`;
  const pdfUrl = `/generated/corporate-reports/${baseName}.pdf`;
  const workbookUrl = `/generated/corporate-reports/${baseName}.xlsx`;
  const portfolioCsvUrl = `/generated/corporate-reports/${baseName}-portfolio.csv`;
  const evidenceCsvUrl = `/generated/corporate-reports/${baseName}-evidence.csv`;
  const manifest = buildCorporateReportArtifactManifest({
    exportCode: input.exportCode,
    reportType: input.reportType,
    exportFormat: input.exportFormat,
    artifactVersion: input.artifactVersion,
    generatedAt,
    files: [
      { label: "Report data", format: "json", url: fileUrl, required: true },
      { label: "HTML preview", format: "html", url: previewUrl, required: input.exportFormat !== "evidence_json" },
      { label: "Evidence bundle", format: "json", url: evidenceBundleUrl, required: input.exportFormat !== "html_json" },
      { label: "PDF snapshot", format: "pdf", url: pdfUrl, required: input.exportFormat !== "evidence_json" },
      { label: "Excel workbook", format: "xlsx", url: workbookUrl, required: input.exportFormat === "full_archive" },
      { label: "Portfolio CSV", format: "csv", url: portfolioCsvUrl, required: input.exportFormat === "full_archive" },
      { label: "Evidence CSV", format: "csv", url: evidenceCsvUrl, required: input.exportFormat !== "html_json" }
    ]
  });

  await mkdir(folder, { recursive: true });
  await Promise.all([
    writeFile(path.join(folder, `${baseName}.json`), `${JSON.stringify(reportPayload, null, 2)}\n`, "utf8"),
    writeFile(path.join(folder, `${baseName}.html`), reportHtml({ ...input, generatedAt }), "utf8"),
    writeFile(path.join(folder, `${baseName}-evidence.json`), `${JSON.stringify(evidencePayload, null, 2)}\n`, "utf8"),
    writeFile(path.join(folder, `${baseName}.pdf`), buildCorporateReportPdf(artifactInput)),
    writeFile(path.join(folder, `${baseName}.xlsx`), buildCorporateReportWorkbookXlsx(artifactInput)),
    writeFile(path.join(folder, `${baseName}-portfolio.csv`), corporateReportPortfolioCsv(artifactInput), "utf8"),
    writeFile(path.join(folder, `${baseName}-evidence.csv`), corporateReportEvidenceCsv(artifactInput), "utf8"),
    writeFile(path.join(folder, `${baseName}-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  ]);

  return {
    fileUrl,
    previewUrl,
    evidenceBundleUrl,
    generatedAt,
    artifactManifest: {
      ...manifest,
      manifestUrl: `/generated/corporate-reports/${baseName}-manifest.json`
    },
    metadata: {
      portfolioCount: input.data.portfolio.length,
      evidenceCount: input.data.evidence.length,
      verifiedOutputs: input.data.impactOutputs.verifiedOutputs,
      committedFunding: input.data.financials.committedFunding,
      generatedBy: "corporate_report_generator",
      exportFormat: input.exportFormat,
      artifactVersion: input.artifactVersion,
      pdfUrl,
      workbookUrl,
      portfolioCsvUrl,
      evidenceCsvUrl
    }
  };
}

export async function createCorporateProgramAction(formData: FormData) {
  const user = await requireUser("/corporate/programs");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManagePrograms) {
    redirect("/corporate/programs?error=permission");
  }

  const name = textValue(formData.get("name"), 220);
  const startsAt = dateValue(formData.get("startsAt"));
  const endsAt = dateValue(formData.get("endsAt"));
  const budgetAmount = parsePositiveAmount(formData.get("budgetAmount"));
  const currency = textValue(formData.get("currency"), 8).toUpperCase() || "IDR";
  const status = normalizeCorporateProgramStatus(textValue(formData.get("status"), 80));

  if (!name || !startsAt || !endsAt || startsAt >= endsAt || !budgetAmount) {
    redirect("/corporate/programs?error=program");
  }

  const slug = `${context.accountSlug}-${toSlug(name)}-${startsAt.getUTCFullYear()}-${randomBytes(2).toString("hex")}`;
  const [program] = await db
    .insert(corporatePrograms)
    .values({
      corporateAccountId: context.accountId,
      name,
      slug,
      startsAt,
      endsAt,
      budgetAmount: budgetAmount.toFixed(2),
      currency,
      status
    })
    .returning({ id: corporatePrograms.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.program.created",
    entityType: "corporate_programs",
    entityId: program?.id,
    metadata: {
      accountId: context.accountId,
      programId: program?.id ?? null,
      name,
      status,
      budgetAmount,
      currency
    }
  });

  redirect("/corporate/programs?saved=program");
}

export async function updateCorporateProgramAction(formData: FormData) {
  const user = await requireUser("/corporate/programs");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManagePrograms) {
    redirect("/corporate/programs?error=permission");
  }

  const programId = textValue(formData.get("programId"), 80);
  const name = textValue(formData.get("name"), 220);
  const startsAt = dateValue(formData.get("startsAt"));
  const endsAt = dateValue(formData.get("endsAt"));
  const budgetAmount = parsePositiveAmount(formData.get("budgetAmount"));
  const currency = textValue(formData.get("currency"), 8).toUpperCase() || "IDR";
  const status = normalizeCorporateProgramStatus(textValue(formData.get("status"), 80));

  if (!programId || !isUuid(programId) || !name || !startsAt || !endsAt || startsAt >= endsAt || !budgetAmount) {
    redirect("/corporate/programs?error=program");
  }

  const [program] = await db
    .update(corporatePrograms)
    .set({
      name,
      startsAt,
      endsAt,
      budgetAmount: budgetAmount.toFixed(2),
      currency,
      status
    })
    .where(and(eq(corporatePrograms.id, programId), eq(corporatePrograms.corporateAccountId, context.accountId)))
    .returning({ id: corporatePrograms.id });

  if (!program) {
    redirect("/corporate/programs?error=program");
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.program.updated",
    entityType: "corporate_programs",
    entityId: program.id,
    metadata: {
      accountId: context.accountId,
      programId: program.id,
      name,
      status,
      budgetAmount,
      currency
    }
  });

  redirect("/corporate/programs?saved=program");
}

export async function createCorporateReportExportAction(formData: FormData) {
  const user = await requireUser("/corporate");
  const context = await corporateContext(user.id);

  if (!context) {
    redirect("/corporate?error=program");
  }

  const capabilities = corporateCapabilitiesForPermission(context.permission);

  if (!capabilities.canGenerateReport) {
    redirect("/corporate/reports?error=permission");
  }

  const reportType = normalizeCorporateReportType(String(formData.get("reportType") ?? "esg").toLowerCase());
  const exportFormat = normalizeCorporateReportFormat(String(formData.get("exportFormat") ?? "html_json").toLowerCase());
  const scheduledFor = dateValue(formData.get("scheduledFor"));
  const now = new Date();
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    redirect("/corporate?error=program");
  }

  const [{ count: existingCount }] = await db
    .select({ count: sql<number>`count(${corporateReportExports.id})` })
    .from(corporateReportExports)
    .where(and(eq(corporateReportExports.programId, context.programId), eq(corporateReportExports.reportType, reportType)));
  const code = exportCode();
  const artifactVersion = nextArtifactVersion(Number(existingCount ?? 0));

  if (scheduledFor && scheduledFor.getTime() > now.getTime()) {
    const manifest = buildCorporateReportArtifactManifest({
      exportCode: code,
      reportType,
      exportFormat,
      artifactVersion,
      generatedAt: null,
      scheduledFor,
      files: []
    });

    const [report] = await db
      .insert(corporateReportExports)
      .values({
        programId: context.programId,
        requestedByUserId: user.id,
        exportCode: code,
        reportType,
        exportFormat,
        artifactVersion,
        status: "scheduled",
        scheduledFor,
        artifactManifest: manifest,
        metadata: {
          exportFormat,
          artifactVersion,
          scheduledFor: scheduledFor.toISOString(),
          scheduledByUserId: user.id
        },
        createdAt: now,
        updatedAt: now
      })
      .returning({ id: corporateReportExports.id });

    await writeAuditLog({
      actorUserId: user.id,
      action: "corporate.report.scheduled",
      entityType: "corporate_report_exports",
      entityId: report?.id,
      metadata: {
        programId: context.programId,
        exportCode: code,
        reportType,
        exportFormat,
        artifactVersion,
        scheduledFor: scheduledFor.toISOString()
      }
    });

    redirect("/corporate/reports?saved=scheduled");
  }

  const artifacts = await writeReportArtifacts({
    exportCode: code,
    reportType,
    exportFormat,
    artifactVersion,
    accountName: context.accountName,
    programName: context.programName,
    data
  });

  const [report] = await db.insert(corporateReportExports).values({
      programId: context.programId,
      requestedByUserId: user.id,
      exportCode: code,
      reportType,
      exportFormat,
      artifactVersion,
      status: "generated",
      fileUrl: artifacts.fileUrl,
      previewUrl: artifacts.previewUrl,
      evidenceBundleUrl: artifacts.evidenceBundleUrl,
      generatedAt: artifacts.generatedAt,
      artifactManifest: artifacts.artifactManifest,
      metadata: artifacts.metadata,
      createdAt: artifacts.generatedAt,
      updatedAt: artifacts.generatedAt
    })
    .returning({ id: corporateReportExports.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.report.generated",
    entityType: "corporate_report_exports",
    entityId: report?.id,
    metadata: {
      programId: context.programId,
      exportCode: code,
      reportType,
      exportFormat,
      artifactVersion,
      fileCount: artifacts.artifactManifest.fileCount
    }
  });

  redirect("/corporate/reports?saved=export");
}

export async function runDueCorporateReportExportsAction(_formData: FormData) {
  void _formData;

  const user = await requireUser("/corporate/reports");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canGenerateReport) {
    redirect("/corporate/reports?error=permission");
  }

  const now = new Date();
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    redirect("/corporate/reports?error=program");
  }

  const dueReports = await db
    .select({
      id: corporateReportExports.id,
      exportCode: corporateReportExports.exportCode,
      reportType: corporateReportExports.reportType,
      exportFormat: corporateReportExports.exportFormat,
      artifactVersion: corporateReportExports.artifactVersion,
      scheduledFor: corporateReportExports.scheduledFor
    })
    .from(corporateReportExports)
    .where(and(eq(corporateReportExports.programId, context.programId), eq(corporateReportExports.status, "scheduled"), lte(corporateReportExports.scheduledFor, now)));

  for (const report of dueReports) {
    const reportType = normalizeCorporateReportType(report.reportType);
    const exportFormat = normalizeCorporateReportFormat(report.exportFormat);
    const artifactVersion = Math.max(1, report.artifactVersion);
    const artifacts = await writeReportArtifacts({
      exportCode: report.exportCode,
      reportType,
      exportFormat,
      artifactVersion,
      accountName: context.accountName,
      programName: context.programName,
      data
    });

    await db
      .update(corporateReportExports)
      .set({
        status: "generated",
        reportType,
        exportFormat,
        artifactVersion,
        fileUrl: artifacts.fileUrl,
        previewUrl: artifacts.previewUrl,
        evidenceBundleUrl: artifacts.evidenceBundleUrl,
        generatedAt: artifacts.generatedAt,
        artifactManifest: artifacts.artifactManifest,
        metadata: {
          ...artifacts.metadata,
          scheduledFor: report.scheduledFor?.toISOString() ?? null,
          generatedFromSchedule: true
        },
        updatedAt: artifacts.generatedAt
      })
      .where(eq(corporateReportExports.id, report.id));

    await writeAuditLog({
      actorUserId: user.id,
      action: "corporate.report.scheduled_generated",
      entityType: "corporate_report_exports",
      entityId: report.id,
      metadata: {
        programId: context.programId,
        exportCode: report.exportCode,
        reportType,
        exportFormat,
        artifactVersion,
        scheduledFor: report.scheduledFor?.toISOString() ?? null,
        fileCount: artifacts.artifactManifest.fileCount
      }
    });
  }

  redirect(`/corporate/reports?saved=scheduled-run&generated=${dueReports.length}`);
}

export async function fundCorporateProjectAction(formData: FormData) {
  const user = await requireUser("/corporate/projects");
  const requestedProgramId = textValue(formData.get("programId"), 80);
  const context = await corporateContext(user.id, requestedProgramId);
  const returnPath = context ? `/corporate/projects?programId=${encodeURIComponent(context.programId)}` : "/corporate/projects";

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageProjects) {
    redirect("/corporate/projects?error=permission");
  }

  const campaignId = textValue(formData.get("campaignId"), 80);
  const allocationAmount = parsePositiveAmount(formData.get("allocationAmount"));
  const requestedPortfolioStatus = textValue(formData.get("status"), 80);
  const portfolioStatus = ["funded", "monitoring", "review", "completed"].includes(requestedPortfolioStatus) ? requestedPortfolioStatus : "funded";
  const contributionType = normalizeCorporateContributionType(textValue(formData.get("contributionType"), 80));
  const contributionStatus = normalizeCorporateContributionStatus(textValue(formData.get("contributionStatus"), 80));
  const countsTowardCampaignGoal = formData.get("countsTowardCampaignGoal") === "on";
  const notes = textValue(formData.get("notes"), 500) || null;

  if (!campaignId || !isUuid(campaignId) || !allocationAmount) {
    redirect(`${returnPath}&error=project`);
  }

  const [campaign] = await db
    .select({
      id: campaigns.id,
      slug: campaigns.slug,
      title: campaigns.title
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    redirect(`${returnPath}&error=project`);
  }

  const [previousContribution] = await db
    .select({
      id: corporateContributions.id,
      amount: corporateContributions.amount,
      status: corporateContributions.status,
      countsTowardCampaignGoal: corporateContributions.countsTowardCampaignGoal
    })
    .from(corporateContributions)
    .where(
      and(
        eq(corporateContributions.programId, context.programId),
        eq(corporateContributions.campaignId, campaign.id),
        eq(corporateContributions.contributionType, contributionType)
      )
    )
    .limit(1);

  const now = new Date();
  const baseReferenceCode = buildCorporateContributionReference({
    accountSlug: context.accountSlug,
    campaignSlug: campaign.slug,
    contributionType,
    date: now
  });
  const referenceCode = previousContribution?.id ? undefined : `${baseReferenceCode}-${context.programId.slice(0, 8).toUpperCase()}`;

  const [portfolioRow] = await db
    .insert(corporateProjectPortfolio)
    .values({
      programId: context.programId,
      campaignId: campaign.id,
      allocationAmount: allocationAmount.toFixed(2),
      status: portfolioStatus
    })
    .onConflictDoUpdate({
      target: [corporateProjectPortfolio.programId, corporateProjectPortfolio.campaignId],
      set: {
        allocationAmount: allocationAmount.toFixed(2),
        status: portfolioStatus
      }
    })
    .returning({ id: corporateProjectPortfolio.id });

  const [contributionRow] = await db
    .insert(corporateContributions)
    .values({
      corporateAccountId: context.accountId,
      programId: context.programId,
      campaignId: campaign.id,
      createdByUserId: user.id,
      referenceCode: referenceCode ?? `${context.programId}-${campaign.id}-${contributionType}`,
      contributionType,
      amount: allocationAmount.toFixed(2),
      currency: "IDR",
      status: contributionStatus,
      countsTowardCampaignGoal,
      contributionDate: now,
      notes,
      metadata: {
        source: "corporate_projects_form",
        portfolioStatus
      },
      updatedAt: now,
      createdAt: now
    })
    .onConflictDoUpdate({
      target: [corporateContributions.programId, corporateContributions.campaignId, corporateContributions.contributionType],
      set: {
        amount: allocationAmount.toFixed(2),
        status: contributionStatus,
        countsTowardCampaignGoal,
        contributionDate: now,
        notes,
        metadata: {
          source: "corporate_projects_form",
          portfolioStatus
        },
        updatedAt: now
      }
    })
    .returning({ id: corporateContributions.id });

  const raisedDelta = campaignRaisedDelta(
    previousContribution
      ? {
          amount: Number(previousContribution.amount),
          status: previousContribution.status,
          countsTowardCampaignGoal: previousContribution.countsTowardCampaignGoal
        }
      : null,
    {
      amount: allocationAmount,
      status: contributionStatus,
      countsTowardCampaignGoal
    }
  );

  if (raisedDelta !== 0) {
    await db
      .update(campaigns)
      .set({
        raisedAmount: sql`greatest(0, ${campaigns.raisedAmount} + ${raisedDelta.toFixed(2)}::numeric)`,
        updatedAt: now
      })
      .where(eq(campaigns.id, campaign.id));
  }

  const evidenceRows = await db
    .select({
      id: projectEvidence.id
    })
    .from(projectEvidence)
    .where(eq(projectEvidence.campaignId, campaign.id));

  if (evidenceRows.length > 0) {
    await db
      .insert(corporateEvidenceCenter)
      .values(
        evidenceRows.map((evidence) => ({
          programId: context.programId,
          evidenceId: evidence.id,
          visibility: "reportable"
        }))
      )
      .onConflictDoNothing({
        target: [corporateEvidenceCenter.programId, corporateEvidenceCenter.evidenceId]
      });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.project.contribution_recorded",
    entityType: "corporate_contributions",
    entityId: contributionRow?.id,
    metadata: {
      programId: context.programId,
      portfolioId: portfolioRow?.id ?? null,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      contributionType,
      contributionStatus,
      allocationAmount,
      countsTowardCampaignGoal,
      raisedDelta,
      portfolioStatus,
      evidenceLinked: evidenceRows.length
    }
  });

  redirect(`${returnPath}&saved=project`);
}

export async function createCorporateEmployeeEventAction(formData: FormData) {
  const user = await requireUser("/corporate/employees");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageEmployees) {
    redirect("/corporate/employees?error=permission");
  }

  const title = textValue(formData.get("title"), 220);
  const eventType = normalizeCorporateEmployeeEventType(textValue(formData.get("eventType"), 80));
  const status = normalizeCorporateEmployeeEventStatus(textValue(formData.get("status"), 80));
  const startsAt = dateValue(formData.get("startsAt"));
  const endsAt = dateValue(formData.get("endsAt"));
  const location = textValue(formData.get("location"), 220) || null;
  const capacity = Number.parseInt(textValue(formData.get("capacity"), 12), 10);
  const waitlistEnabled = formData.get("waitlistEnabled") === "on";
  const description = textValue(formData.get("description"), 1200) || null;

  if (!title || !startsAt || !endsAt || endsAt.getTime() <= startsAt.getTime() || !Number.isFinite(capacity) || capacity <= 0) {
    redirect("/corporate/employees?error=event");
  }

  const now = new Date();
  const [event] = await db
    .insert(corporateEmployeeEvents)
    .values({
      corporateAccountId: context.accountId,
      programId: context.programId,
      createdByUserId: user.id,
      title,
      eventType,
      status,
      startsAt,
      endsAt,
      location,
      capacity,
      waitlistEnabled,
      description,
      metadata: {
        createdFrom: "corporate_portal"
      },
      createdAt: now,
      updatedAt: now
    })
    .returning({ id: corporateEmployeeEvents.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.employee_event.created",
    entityType: "corporate_employee_events",
    entityId: event?.id,
    metadata: {
      accountId: context.accountId,
      programId: context.programId,
      title,
      eventType,
      status,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      capacity,
      waitlistEnabled
    }
  });

  redirect("/corporate/employees?saved=event");
}

export async function registerCorporateEmployeeEventAction(formData: FormData) {
  const user = await requireUser("/corporate/employees");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageEmployees) {
    redirect("/corporate/employees?error=permission");
  }

  const eventId = textValue(formData.get("eventId"), 80);
  const employeeId = textValue(formData.get("employeeId"), 80);

  if (!isUuid(eventId) || !isUuid(employeeId)) {
    redirect("/corporate/employees?error=registration");
  }

  const [event] = await db
    .select({
      id: corporateEmployeeEvents.id,
      title: corporateEmployeeEvents.title,
      status: corporateEmployeeEvents.status,
      capacity: corporateEmployeeEvents.capacity,
      waitlistEnabled: corporateEmployeeEvents.waitlistEnabled
    })
    .from(corporateEmployeeEvents)
    .where(
      and(
        eq(corporateEmployeeEvents.id, eventId),
        eq(corporateEmployeeEvents.corporateAccountId, context.accountId),
        eq(corporateEmployeeEvents.programId, context.programId)
      )
    )
    .limit(1);

  const [employee] = await db
    .select({
      id: corporateEmployees.id,
      name: corporateEmployees.name,
      email: corporateEmployees.email,
      status: corporateEmployees.status
    })
    .from(corporateEmployees)
    .where(and(eq(corporateEmployees.id, employeeId), eq(corporateEmployees.corporateAccountId, context.accountId)))
    .limit(1);

  if (!event || !employee || employee.status === "suspended") {
    redirect("/corporate/employees?error=registration");
  }

  const [existingRegistration] = await db
    .select({
      id: corporateEmployeeEventRegistrations.id,
      status: corporateEmployeeEventRegistrations.status
    })
    .from(corporateEmployeeEventRegistrations)
    .where(
      and(
        eq(corporateEmployeeEventRegistrations.eventId, eventId),
        eq(corporateEmployeeEventRegistrations.employeeId, employeeId)
      )
    )
    .limit(1);

  if (existingRegistration && ["registered", "attended", "waitlisted"].includes(existingRegistration.status)) {
    redirect("/corporate/employees?saved=registration");
  }

  const [{ count: registeredCount }] = await db
    .select({ count: sql<number>`count(${corporateEmployeeEventRegistrations.id})` })
    .from(corporateEmployeeEventRegistrations)
    .where(
      and(
        eq(corporateEmployeeEventRegistrations.eventId, eventId),
        inArray(corporateEmployeeEventRegistrations.status, ["registered", "attended"])
      )
    );
  const availability = corporateEventRegistrationAvailability({
    status: event.status,
    capacity: event.capacity,
    registeredCount: Number(registeredCount ?? 0),
    waitlistEnabled: event.waitlistEnabled
  });

  if (!availability.canRegister) {
    redirect("/corporate/employees?error=registration");
  }

  const now = new Date();
  const registrationStatus = availability.willWaitlist ? "waitlisted" : "registered";
  const [registration] = await db
    .insert(corporateEmployeeEventRegistrations)
    .values({
      eventId,
      employeeId,
      registeredByUserId: user.id,
      status: registrationStatus,
      checkedInAt: null,
      attendanceHours: "0",
      notes: null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [corporateEmployeeEventRegistrations.eventId, corporateEmployeeEventRegistrations.employeeId],
      set: {
        registeredByUserId: user.id,
        status: registrationStatus,
        checkedInAt: null,
        attendanceHours: "0",
        updatedAt: now
      }
    })
    .returning({ id: corporateEmployeeEventRegistrations.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.employee_event.registered",
    entityType: "corporate_employee_event_registrations",
    entityId: registration?.id,
    metadata: {
      accountId: context.accountId,
      programId: context.programId,
      eventId,
      eventTitle: event.title,
      employeeId,
      employeeEmail: employee.email,
      status: registrationStatus,
      availableSeats: availability.availableSeats
    }
  });

  redirect(`/corporate/employees?saved=${registrationStatus}`);
}

export async function checkInCorporateEmployeeEventAction(formData: FormData) {
  const user = await requireUser("/corporate/employees");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageEmployees) {
    redirect("/corporate/employees?error=permission");
  }

  const registrationId = textValue(formData.get("registrationId"), 80);

  if (!isUuid(registrationId)) {
    redirect("/corporate/employees?error=attendance");
  }

  const [registration] = await db
    .select({
      id: corporateEmployeeEventRegistrations.id,
      eventId: corporateEmployeeEventRegistrations.eventId,
      employeeId: corporateEmployeeEventRegistrations.employeeId,
      currentStatus: corporateEmployeeEventRegistrations.status,
      eventTitle: corporateEmployeeEvents.title,
      startsAt: corporateEmployeeEvents.startsAt,
      endsAt: corporateEmployeeEvents.endsAt,
      employeeEmail: corporateEmployees.email
    })
    .from(corporateEmployeeEventRegistrations)
    .innerJoin(corporateEmployeeEvents, eq(corporateEmployeeEventRegistrations.eventId, corporateEmployeeEvents.id))
    .innerJoin(corporateEmployees, eq(corporateEmployeeEventRegistrations.employeeId, corporateEmployees.id))
    .where(
      and(
        eq(corporateEmployeeEventRegistrations.id, registrationId),
        eq(corporateEmployeeEvents.corporateAccountId, context.accountId),
        eq(corporateEmployeeEvents.programId, context.programId)
      )
    )
    .limit(1);

  if (!registration || registration.currentStatus === "cancelled") {
    redirect("/corporate/employees?error=attendance");
  }

  const submittedHours = parseNonNegativeAmount(formData.get("attendanceHours"));
  const defaultHours = Math.max(0, (registration.endsAt.getTime() - registration.startsAt.getTime()) / 3_600_000);
  const attendanceHours = submittedHours ?? defaultHours;
  const notes = textValue(formData.get("notes"), 600) || null;
  const now = new Date();

  await db
    .update(corporateEmployeeEventRegistrations)
    .set({
      status: "attended",
      checkedInAt: now,
      attendanceHours: attendanceHours.toFixed(2),
      notes,
      updatedAt: now
    })
    .where(eq(corporateEmployeeEventRegistrations.id, registrationId));

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.employee_event.checked_in",
    entityType: "corporate_employee_event_registrations",
    entityId: registrationId,
    metadata: {
      accountId: context.accountId,
      programId: context.programId,
      eventId: registration.eventId,
      eventTitle: registration.eventTitle,
      employeeId: registration.employeeId,
      employeeEmail: registration.employeeEmail,
      attendanceHours
    }
  });

  redirect("/corporate/employees?saved=attendance");
}

export async function cancelCorporateEmployeeEventRegistrationAction(formData: FormData) {
  const user = await requireUser("/corporate/employees");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageEmployees) {
    redirect("/corporate/employees?error=permission");
  }

  const registrationId = textValue(formData.get("registrationId"), 80);

  if (!isUuid(registrationId)) {
    redirect("/corporate/employees?error=attendance");
  }

  const [registration] = await db
    .select({
      id: corporateEmployeeEventRegistrations.id,
      eventId: corporateEmployeeEventRegistrations.eventId,
      employeeId: corporateEmployeeEventRegistrations.employeeId,
      eventTitle: corporateEmployeeEvents.title,
      employeeEmail: corporateEmployees.email
    })
    .from(corporateEmployeeEventRegistrations)
    .innerJoin(corporateEmployeeEvents, eq(corporateEmployeeEventRegistrations.eventId, corporateEmployeeEvents.id))
    .innerJoin(corporateEmployees, eq(corporateEmployeeEventRegistrations.employeeId, corporateEmployees.id))
    .where(
      and(
        eq(corporateEmployeeEventRegistrations.id, registrationId),
        eq(corporateEmployeeEvents.corporateAccountId, context.accountId),
        eq(corporateEmployeeEvents.programId, context.programId)
      )
    )
    .limit(1);

  if (!registration) {
    redirect("/corporate/employees?error=attendance");
  }

  const notes = textValue(formData.get("notes"), 600) || null;
  const now = new Date();

  await db
    .update(corporateEmployeeEventRegistrations)
    .set({
      status: "cancelled",
      checkedInAt: null,
      attendanceHours: "0",
      notes,
      updatedAt: now
    })
    .where(eq(corporateEmployeeEventRegistrations.id, registrationId));

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.employee_event.registration_cancelled",
    entityType: "corporate_employee_event_registrations",
    entityId: registrationId,
    metadata: {
      accountId: context.accountId,
      programId: context.programId,
      eventId: registration.eventId,
      eventTitle: registration.eventTitle,
      employeeId: registration.employeeId,
      employeeEmail: registration.employeeEmail
    }
  });

  redirect("/corporate/employees?saved=cancelled");
}

export async function inviteCorporateEmployeeAction(formData: FormData) {
  const user = await requireUser("/corporate/employees");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageEmployees) {
    redirect("/corporate/employees?error=permission");
  }

  const name = textValue(formData.get("name"), 160);
  const email = textValue(formData.get("email"), 255).toLowerCase();
  const department = textValue(formData.get("department"), 120) || null;
  const requestedRole = textValue(formData.get("role"), 120);
  const role = normalizeCorporateEmployeeRole(requestedRole);
  const requestedStatus = textValue(formData.get("status"), 80);
  const status = ["active", "invited", "suspended"].includes(requestedStatus) ? requestedStatus : "invited";

  if (!canAssignCorporateEmployeeRole(context.permission, role)) {
    redirect("/corporate/employees?error=permission");
  }

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/corporate/employees?error=employee");
  }

  const [linkedUser] = await db
    .select({
      id: users.id
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const now = new Date();
  const [employee] = await db
    .insert(corporateEmployees)
    .values({
      corporateAccountId: context.accountId,
      userId: status === "active" ? linkedUser?.id : null,
      email,
      name,
      department,
      role,
      status
    })
    .onConflictDoUpdate({
      target: [corporateEmployees.corporateAccountId, corporateEmployees.email],
      set: {
        userId: status === "active" ? linkedUser?.id : null,
        name,
        department,
        role,
        status
      }
    })
    .returning({ id: corporateEmployees.id });

  const permission = permissionForCorporateEmployeeRole(role);
  let inviteToken: string | null = null;

  if (status === "active" && linkedUser) {
    await db
      .insert(corporatePermissions)
      .values({
        corporateAccountId: context.accountId,
        userId: linkedUser.id,
        permission
      })
      .onConflictDoNothing({
        target: [corporatePermissions.corporateAccountId, corporatePermissions.userId, corporatePermissions.permission]
      });
  }

  if (status === "invited" && employee?.id) {
    inviteToken = randomBytes(24).toString("hex");
    await db
      .update(corporateEmployeeInvites)
      .set({
        status: "superseded",
        updatedAt: now
      })
      .where(and(eq(corporateEmployeeInvites.employeeId, employee.id), eq(corporateEmployeeInvites.status, "pending")));

    await db.insert(corporateEmployeeInvites).values({
      corporateAccountId: context.accountId,
      employeeId: employee.id,
      invitedByUserId: user.id,
      email,
      token: inviteToken,
      permission,
      status: "pending",
      expiresAt: corporateInviteExpiresAt(now),
      createdAt: now,
      updatedAt: now
    });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.employee.invited",
    entityType: "corporate_employees",
    entityId: employee?.id,
    metadata: {
      accountId: context.accountId,
      email,
      role,
      status,
      linkedUserId: linkedUser?.id ?? null,
      inviteCreated: Boolean(inviteToken)
    }
  });

  redirect("/corporate/employees?saved=employee");
}

export async function acceptCorporateEmployeeInviteAction(formData: FormData) {
  const token = textValue(formData.get("token"), 160);
  const user = await requireUser(token ? `/corporate/invite/${token}` : "/corporate");

  if (!token) {
    redirect("/corporate?error=invite");
  }

  const [invite] = await db
    .select({
      id: corporateEmployeeInvites.id,
      corporateAccountId: corporateEmployeeInvites.corporateAccountId,
      employeeId: corporateEmployeeInvites.employeeId,
      email: corporateEmployeeInvites.email,
      permission: corporateEmployeeInvites.permission,
      status: corporateEmployeeInvites.status,
      expiresAt: corporateEmployeeInvites.expiresAt
    })
    .from(corporateEmployeeInvites)
    .where(eq(corporateEmployeeInvites.token, token))
    .limit(1);

  if (!invite) {
    redirect(`/corporate/invite/${token}?error=missing`);
  }

  const decision = canAcceptCorporateEmployeeInvite({
    inviteEmail: invite.email,
    userEmail: user.email,
    inviteStatus: invite.status,
    expiresAt: invite.expiresAt
  });

  if (!decision.ok) {
    redirect(`/corporate/invite/${token}?error=${decision.reason}`);
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(corporateEmployees)
      .set({
        userId: user.id,
        status: "active"
      })
      .where(eq(corporateEmployees.id, invite.employeeId));

    await tx
      .update(corporateEmployeeInvites)
      .set({
        status: "accepted",
        acceptedByUserId: user.id,
        acceptedAt: now,
        updatedAt: now
      })
      .where(eq(corporateEmployeeInvites.id, invite.id));

    await tx
      .insert(corporatePermissions)
      .values({
        corporateAccountId: invite.corporateAccountId,
        userId: user.id,
        permission: invite.permission
      })
      .onConflictDoNothing({
        target: [corporatePermissions.corporateAccountId, corporatePermissions.userId, corporatePermissions.permission]
      });

    await tx.insert(adminAuditLogs).values({
      actorUserId: user.id,
      action: "corporate.employee.invite_accepted",
      entityType: "corporate_employee_invites",
      entityId: invite.id,
      metadata: auditMetadata({
        accountId: invite.corporateAccountId,
        employeeId: invite.employeeId,
        email: invite.email,
        permission: invite.permission
      })
    });
  });

  redirect("/corporate?saved=invite-accepted");
}

export async function updateCorporateBudgetAction(formData: FormData) {
  const user = await requireUser("/corporate/funding");
  const requestedProgramId = textValue(formData.get("programId"), 80);
  const context = await corporateContext(user.id, requestedProgramId);
  const returnPath = context ? `/corporate/funding?programId=${encodeURIComponent(context.programId)}` : "/corporate/funding";

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageFunding) {
    redirect("/corporate/funding?error=permission");
  }

  const category = textValue(formData.get("category"), 120);
  const allocatedAmount = parsePositiveAmount(formData.get("allocatedAmount"));

  if (!category || !allocatedAmount) {
    redirect(`${returnPath}&error=budget`);
  }

  const [budget] = await db
    .insert(corporateProgramBudgets)
    .values({
      programId: context.programId,
      category,
      allocatedAmount: allocatedAmount.toFixed(2),
      spentAmount: "0.00",
      metadata: {
        updatedFrom: "corporate_portal"
      }
    })
    .onConflictDoUpdate({
      target: [corporateProgramBudgets.programId, corporateProgramBudgets.category],
      set: {
        allocatedAmount: allocatedAmount.toFixed(2),
        metadata: {
          updatedFrom: "corporate_portal"
        }
      }
    })
    .returning({ id: corporateProgramBudgets.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.budget.updated",
    entityType: "corporate_program_budgets",
    entityId: budget?.id,
      metadata: {
        programId: context.programId,
        category,
        allocatedAmount
      }
    });

  redirect(`${returnPath}&saved=budget`);
}

export async function updateCorporateEvidenceSpendAction(formData: FormData) {
  const requestedProgramId = textValue(formData.get("programId"), 80);
  const fallbackReturnPath = requestedProgramId ? `/corporate/funding?programId=${encodeURIComponent(requestedProgramId)}` : "/corporate/funding";
  const returnPath = safeRedirectPath(formData.get("returnTo"), fallbackReturnPath);
  const user = await requireUser(returnPath);
  const context = await corporateContext(user.id, requestedProgramId);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageFunding) {
    redirectWithResult(returnPath, "error", "permission");
  }

  const evidenceId = textValue(formData.get("evidenceId"), 80);
  const category = textValue(formData.get("category"), 120);
  const spendAmount = parsePositiveAmount(formData.get("spendAmount"));

  if (!evidenceId || !isUuid(evidenceId) || !category || !spendAmount) {
    redirectWithResult(returnPath, "error", "spend");
  }

  const [budget] = await db
    .select({ id: corporateProgramBudgets.id })
    .from(corporateProgramBudgets)
    .where(and(eq(corporateProgramBudgets.programId, context.programId), eq(corporateProgramBudgets.category, category)))
    .limit(1);

  if (!budget) {
    redirectWithResult(returnPath, "error", "spend");
  }

  const [evidence] = await db
    .select({
      id: projectEvidence.id,
      evidenceCode: projectEvidence.evidenceCode,
      title: projectEvidence.title,
      verificationStatus: projectEvidence.verificationStatus,
      metadata: projectEvidence.metadata
    })
    .from(corporateEvidenceCenter)
    .innerJoin(projectEvidence, eq(corporateEvidenceCenter.evidenceId, projectEvidence.id))
    .where(and(eq(corporateEvidenceCenter.programId, context.programId), eq(corporateEvidenceCenter.evidenceId, evidenceId)))
    .limit(1);

  if (!evidence || evidence.verificationStatus !== "verified") {
    redirectWithResult(returnPath, "error", "spend");
  }

  const now = new Date();
  const metadata = {
    ...metadataObject(evidence.metadata),
    financeCategory: category,
    financeSpendAmount: spendAmount,
    financeSpendCurrency: "IDR",
    financeSpendRecordedAt: now.toISOString(),
    financeSpendRecordedByUserId: user.id
  };

  await db
    .update(projectEvidence)
    .set({
      metadata,
      updatedAt: now
    })
    .where(eq(projectEvidence.id, evidence.id));

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.evidence.spend_recorded",
    entityType: "project_evidence",
    entityId: evidence.id,
    metadata: {
      programId: context.programId,
      evidenceCode: evidence.evidenceCode,
      evidenceTitle: evidence.title,
      category,
      spendAmount
    }
  });

  redirectWithResult(returnPath, "saved", "spend");
}

export async function updateCorporateEvidenceStatusAction(formData: FormData) {
  const requestedProgramId = textValue(formData.get("programId"), 80);
  const fallbackReturnPath = requestedProgramId ? `/corporate/evidence?programId=${encodeURIComponent(requestedProgramId)}` : "/corporate/evidence";
  const returnPath = safeRedirectPath(formData.get("returnTo"), fallbackReturnPath);
  const user = await requireUser(returnPath);
  const context = await corporateContext(user.id, requestedProgramId);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canUpdateEvidenceStatus) {
    redirectWithResult(returnPath, "error", "permission");
  }

  const evidenceId = textValue(formData.get("evidenceId"), 80);
  const requestedStatus = textValue(formData.get("verificationStatus"), 80);
  const verificationStatus = normalizeEvidenceVerificationStatus(requestedStatus, "submitted");
  const reviewNote = textValue(formData.get("reviewNote"), 1000);

  if (!evidenceId || !isUuid(evidenceId)) {
    redirectWithResult(returnPath, "error", "evidence");
  }

  if (evidenceReviewNoteRequired(verificationStatus) && !reviewNote) {
    redirectWithResult(returnPath, "error", "evidence");
  }

  const [evidenceAccess] = await db
    .select({
      id: corporateEvidenceCenter.id,
      currentStatus: projectEvidence.verificationStatus,
      assignedReviewerUserId: projectEvidence.assignedReviewerUserId,
      evidenceCode: projectEvidence.evidenceCode
    })
    .from(corporateEvidenceCenter)
    .innerJoin(projectEvidence, eq(corporateEvidenceCenter.evidenceId, projectEvidence.id))
    .where(and(eq(corporateEvidenceCenter.programId, context.programId), eq(corporateEvidenceCenter.evidenceId, evidenceId)))
    .limit(1);

  if (!evidenceAccess) {
    redirectWithResult(returnPath, "error", "evidence");
  }

  const now = new Date();
  const assignedReviewerUserId = evidenceAccess.assignedReviewerUserId ?? user.id;
  const reviewAction = evidenceReviewActionForTransition({
    fromStatus: evidenceAccess.currentStatus,
    toStatus: verificationStatus,
    assignedReviewerChanged: assignedReviewerUserId !== evidenceAccess.assignedReviewerUserId
  });

  await db.transaction(async (tx) => {
    await tx
      .update(projectEvidence)
      .set({
        verificationStatus,
        verifiedAt: verificationStatus === "verified" ? now : null,
        assignedReviewerUserId,
        reviewedByUserId: user.id,
        reviewedAt: now,
        clarificationNote: verificationStatus === "needs_clarification" ? reviewNote : verificationStatus === "verified" ? null : undefined,
        clarificationRequestedAt: verificationStatus === "needs_clarification" ? now : undefined,
        clarificationResolvedAt: evidenceAccess.currentStatus === "needs_clarification" && verificationStatus !== "needs_clarification" ? now : undefined,
        rejectionReason: verificationStatus === "rejected" ? reviewNote : null,
        updatedAt: now
      })
      .where(eq(projectEvidence.id, evidenceId));

    await tx
      .update(campaignActivities)
      .set({
        verificationStatus,
        verifiedAt: verificationStatus === "verified" ? now : null,
        metadata: {
          reviewedByUserId: user.id,
          reviewedAt: now.toISOString(),
          reviewAction,
          reviewNote: reviewNote || null,
          source: "corporate_portal"
        }
      })
      .where(eq(campaignActivities.sourceEvidenceId, evidenceId));

    await tx
      .update(corporateEvidenceCenter)
      .set({
        visibility: verificationStatus === "verified" ? "reportable" : "internal"
      })
      .where(and(eq(corporateEvidenceCenter.programId, context.programId), eq(corporateEvidenceCenter.evidenceId, evidenceId)));

    await tx.insert(evidenceReviewEvents).values({
      evidenceId,
      actorUserId: user.id,
      assignedToUserId: assignedReviewerUserId,
      action: reviewAction,
      fromStatus: evidenceAccess.currentStatus,
      toStatus: verificationStatus,
      note: reviewNote || null,
      visibility: verificationStatus === "in_review" ? "internal" : "partner_visible",
      metadata: {
        evidenceCode: evidenceAccess.evidenceCode,
        programId: context.programId,
        source: "corporate_portal"
      }
    });
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.evidence.status_updated",
    entityType: "project_evidence",
    entityId: evidenceId,
    metadata: {
      programId: context.programId,
      verificationStatus,
      reviewAction,
      reviewNote: reviewNote || null
    }
  });

  redirectWithResult(returnPath, "saved", "evidence");
}


function parseRetentionDays(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(3650, Math.round(parsed));
}

export async function updateCorporateIntegrationAction(formData: FormData) {
  const user = await requireUser("/corporate/settings");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageSettings) {
    redirect("/corporate/settings?error=permission");
  }

  const integrationType = normalizeCorporateIntegrationType(textValue(formData.get("integrationType"), 80));
  const providerName = textValue(formData.get("providerName"), 160);
  const owner = textValue(formData.get("owner"), 160);
  const status = normalizeCorporateIntegrationStatus(textValue(formData.get("status"), 80));
  const nextAction = textValue(formData.get("nextAction"), 240);
  const lastSyncRaw = textValue(formData.get("lastSyncAt"), 40);
  const lastSyncAt = lastSyncRaw ? new Date(lastSyncRaw) : null;

  if (!providerName || !owner || !nextAction || (lastSyncAt && Number.isNaN(lastSyncAt.getTime()))) {
    redirect("/corporate/settings?error=integration");
  }

  const now = new Date();
  const [integration] = await db
    .insert(corporateIntegrations)
    .values({
      corporateAccountId: context.accountId,
      integrationType,
      providerName,
      owner,
      status,
      nextAction,
      lastSyncAt,
      metadata: {
        updatedFrom: "corporate_settings"
      },
      updatedAt: now,
      createdAt: now
    })
    .onConflictDoUpdate({
      target: [corporateIntegrations.corporateAccountId, corporateIntegrations.integrationType, corporateIntegrations.providerName],
      set: {
        owner,
        status,
        nextAction,
        lastSyncAt,
        metadata: {
          updatedFrom: "corporate_settings"
        },
        updatedAt: now
      }
    })
    .returning({ id: corporateIntegrations.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.integration.updated",
    entityType: "corporate_integrations",
    entityId: integration?.id,
    metadata: {
      accountId: context.accountId,
      programId: context.programId,
      integrationType,
      providerName,
      status
    }
  });

  redirect("/corporate/settings?saved=integration");
}

export async function updateCorporateSecuritySettingsAction(formData: FormData) {
  const user = await requireUser("/corporate/settings");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageSettings) {
    redirect("/corporate/settings?error=permission");
  }

  const mfaRequired = formData.get("mfaRequired") === "on";
  const exportLoggingEnabled = formData.get("exportLoggingEnabled") === "on";
  const sessionHistoryEnabled = formData.get("sessionHistoryEnabled") === "on";
  const retentionPolicyDays = parseRetentionDays(formData.get("retentionPolicyDays"));
  const domainRestrictionEnabled = formData.get("domainRestrictionEnabled") === "on";
  const allowedEmailDomains = textValue(formData.get("allowedEmailDomains"), 1000)
    .split(/[\n,]+/)
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
    .join("\n") || null;

  if (domainRestrictionEnabled && !allowedEmailDomains) {
    redirect("/corporate/settings?error=security");
  }

  const now = new Date();
  const [settings] = await db
    .insert(corporateSecuritySettings)
    .values({
      corporateAccountId: context.accountId,
      mfaRequired,
      exportLoggingEnabled,
      sessionHistoryEnabled,
      retentionPolicyDays,
      domainRestrictionEnabled,
      allowedEmailDomains,
      updatedByUserId: user.id,
      updatedAt: now,
      createdAt: now
    })
    .onConflictDoUpdate({
      target: [corporateSecuritySettings.corporateAccountId],
      set: {
        mfaRequired,
        exportLoggingEnabled,
        sessionHistoryEnabled,
        retentionPolicyDays,
        domainRestrictionEnabled,
        allowedEmailDomains,
        updatedByUserId: user.id,
        updatedAt: now
      }
    })
    .returning({ id: corporateSecuritySettings.id });

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.security.updated",
    entityType: "corporate_security_settings",
    entityId: settings?.id,
    metadata: {
      accountId: context.accountId,
      programId: context.programId,
      status: "configured",
      mfaRequired,
      exportLoggingEnabled,
      sessionHistoryEnabled,
      retentionPolicyDays,
      domainRestrictionEnabled,
      allowedEmailDomainCount: allowedEmailDomains ? allowedEmailDomains.split("\n").length : 0
    }
  });

  redirect("/corporate/settings?saved=security");
}

async function reportForUser(userId: string, reportId: string) {
  const context = await corporateContext(userId);

  if (!context) {
    return null;
  }

  const [report] = await db
    .select({
      id: corporateReportExports.id,
      programId: corporateReportExports.programId,
      exportCode: corporateReportExports.exportCode,
      status: corporateReportExports.status,
      publicSlug: corporateReportExports.publicSlug
    })
    .from(corporateReportExports)
    .where(and(eq(corporateReportExports.id, reportId), eq(corporateReportExports.programId, context.programId)))
    .limit(1);

  return report ? { context, report } : null;
}

export async function submitCorporateReportForApprovalAction(formData: FormData) {
  const user = await requireUser("/corporate/reports");
  const reportId = String(formData.get("reportId") ?? "");
  const access = await reportForUser(user.id, reportId);

  if (!access || !corporateCapabilitiesForPermission(access.context.permission).canSubmitReport) {
    redirect("/corporate/reports?error=permission");
  }

  if (access.report.status !== "generated") {
    redirect("/corporate/reports?error=status");
  }

  const now = new Date();

  await db
    .update(corporateReportExports)
    .set({
      status: "review",
      updatedAt: now
    })
    .where(eq(corporateReportExports.id, access.report.id));

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.report.submitted",
    entityType: "corporate_report_exports",
    entityId: access.report.id,
    metadata: {
      programId: access.context.programId,
      exportCode: access.report.exportCode,
      fromStatus: access.report.status,
      toStatus: "review"
    }
  });

  redirect("/corporate/reports?saved=review");
}

export async function approveCorporateReportAction(formData: FormData) {
  const user = await requireUser("/corporate/reports");
  const reportId = String(formData.get("reportId") ?? "");
  const access = await reportForUser(user.id, reportId);

  if (!access || !corporateCapabilitiesForPermission(access.context.permission).canApproveReport) {
    redirect("/corporate/reports?error=permission");
  }

  if (access.report.status !== "review") {
    redirect("/corporate/reports?error=status");
  }

  const now = new Date();

  await db
    .update(corporateReportExports)
    .set({
      status: "approved",
      approvedByUserId: user.id,
      approvedAt: now,
      updatedAt: now
    })
    .where(eq(corporateReportExports.id, access.report.id));

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.report.approved",
    entityType: "corporate_report_exports",
    entityId: access.report.id,
    metadata: {
      programId: access.context.programId,
      exportCode: access.report.exportCode,
      fromStatus: access.report.status,
      toStatus: "approved"
    }
  });

  redirect("/corporate/reports?saved=approved");
}

export async function publishCorporateReportAction(formData: FormData) {
  const user = await requireUser("/corporate/reports");
  const reportId = String(formData.get("reportId") ?? "");
  const access = await reportForUser(user.id, reportId);

  if (!access || !corporateCapabilitiesForPermission(access.context.permission).canPublishReport) {
    redirect("/corporate/reports?error=permission");
  }

  if (!["approved", "published"].includes(access.report.status)) {
    redirect("/corporate/reports?error=approval");
  }

  const now = new Date();
  const publicSlug =
    access.report.publicSlug ??
    `${toSlug(access.context.accountName)}-${toSlug(access.context.programName)}-${access.report.exportCode.toLowerCase()}`;

  await db
    .update(corporateReportExports)
    .set({
      status: "published",
      publicSlug,
      publishedAt: now,
      updatedAt: now
    })
    .where(eq(corporateReportExports.id, access.report.id));

  await writeAuditLog({
    actorUserId: user.id,
    action: "corporate.report.published",
    entityType: "corporate_report_exports",
    entityId: access.report.id,
    metadata: {
      programId: access.context.programId,
      exportCode: access.report.exportCode,
      publicSlug,
      fromStatus: access.report.status,
      toStatus: "published"
    }
  });

  redirect("/corporate/reports?saved=published");
}
