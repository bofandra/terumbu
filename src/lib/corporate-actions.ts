"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { corporateAccounts, corporatePermissions, corporatePrograms, corporateReportExports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

function exportCode() {
  return `TRB-ESG-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function toSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return slug || "corporate-impact";
}

function roleCapabilities(permission: string | null | undefined) {
  const value = permission ?? "";
  const isManager = value === "program.manage" || value === "esg_manager";
  const isFinance = value === "finance_reviewer";
  const isExecutive = value === "executive_viewer";
  const isAuditor = value === "auditor";

  return {
    canGenerate: isManager,
    canSubmit: isManager,
    canApprove: isManager || isFinance,
    canPublish: isManager,
    canPreview: isManager || isFinance || isExecutive || isAuditor || value === "employee_engagement"
  };
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

async function corporateContext(userId: string) {
  const [context] = await db
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
    .limit(1);

  return context ?? null;
}

function reportHtml(input: {
  exportCode: string;
  reportType: string;
  generatedAt: Date;
  accountName: string;
  programName: string;
  data: NonNullable<Awaited<ReturnType<typeof getCorporateDashboardData>>>;
}) {
  const { data } = input;
  const rows = data.portfolio
    .map(
      (project) => `
        <tr>
          <td>${escapeHtml(project.campaignTitle)}</td>
          <td>${escapeHtml(project.region)}</td>
          <td>${escapeHtml(formatCurrency(project.allocationValue))}</td>
          <td>${escapeHtml(project.utilization)}%</td>
          <td>${escapeHtml(project.statusLabel)}</td>
        </tr>`
    )
    .join("");
  const evidenceRows = data.evidence
    .slice(0, 12)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.evidenceCode)}</td>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.verificationStatus)}</td>
          <td>${escapeHtml(item.campaignTitle)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.accountName)} ${escapeHtml(input.reportType.toUpperCase())} Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; color: #07343f; background: #f5f8fb; }
    main { max-width: 1040px; margin: 0 auto; padding: 40px 24px; }
    header, section { background: white; border: 1px solid rgba(7,52,63,.12); border-radius: 16px; padding: 24px; margin-bottom: 18px; }
    h1, h2 { margin: 0; letter-spacing: 0; }
    .eyebrow { color: #db6f4d; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: .14em; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .metric { background: #f7fbf9; border-radius: 12px; padding: 16px; }
    .metric strong { display: block; font-size: 22px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; border-bottom: 1px solid rgba(7,52,63,.12); padding: 10px 8px; }
    th { color: rgba(7,52,63,.62); font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">Terumbu.eco corporate report</p>
      <h1>${escapeHtml(input.accountName)} / ${escapeHtml(input.programName)}</h1>
      <p>${escapeHtml(input.reportType.toUpperCase())} report ${escapeHtml(input.exportCode)} generated ${escapeHtml(input.generatedAt.toLocaleDateString("id-ID", { dateStyle: "medium" }))}.</p>
    </header>
    <section>
      <h2>Executive metrics</h2>
      <div class="grid">
        ${data.executiveMetrics.map((metric) => `<div class="metric"><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.label)}</span><p>${escapeHtml(metric.support)}</p></div>`).join("")}
      </div>
    </section>
    <section>
      <h2>Project portfolio</h2>
      <table>
        <thead><tr><th>Project</th><th>Region</th><th>Allocation</th><th>Utilization</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
    <section>
      <h2>Evidence bundle</h2>
      <table>
        <thead><tr><th>Code</th><th>Evidence</th><th>Status</th><th>Campaign</th></tr></thead>
        <tbody>${evidenceRows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

async function writeReportArtifacts(input: {
  exportCode: string;
  reportType: string;
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
    generatedAt: generatedAt.toISOString(),
    account: input.accountName,
    program: input.programName,
    executiveMetrics: input.data.executiveMetrics,
    financials: input.data.financials,
    impactOutputs: input.data.impactOutputs,
    portfolio: input.data.portfolio,
    evidence: input.data.evidence,
    reporting: input.data.reporting
  };
  const evidencePayload = {
    exportCode: input.exportCode,
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

  await mkdir(folder, { recursive: true });
  await Promise.all([
    writeFile(path.join(folder, `${baseName}.json`), `${JSON.stringify(reportPayload, null, 2)}\n`, "utf8"),
    writeFile(path.join(folder, `${baseName}.html`), reportHtml({ ...input, generatedAt }), "utf8"),
    writeFile(path.join(folder, `${baseName}-evidence.json`), `${JSON.stringify(evidencePayload, null, 2)}\n`, "utf8")
  ]);

  return {
    fileUrl: `/generated/corporate-reports/${baseName}.json`,
    previewUrl: `/generated/corporate-reports/${baseName}.html`,
    evidenceBundleUrl: `/generated/corporate-reports/${baseName}-evidence.json`,
    generatedAt,
    metadata: {
      portfolioCount: input.data.portfolio.length,
      evidenceCount: input.data.evidence.length,
      verifiedOutputs: input.data.impactOutputs.verifiedOutputs,
      committedFunding: input.data.financials.committedFunding,
      generatedBy: "corporate_report_generator"
    }
  };
}

export async function createCorporateReportExportAction(formData: FormData) {
  const user = await requireUser("/corporate");
  const context = await corporateContext(user.id);

  if (!context) {
    redirect("/corporate?error=program");
  }

  const capabilities = roleCapabilities(context.permission);

  if (!capabilities.canGenerate) {
    redirect("/corporate/reports?error=permission");
  }

  const reportTypeValue = String(formData.get("reportType") ?? "esg").toLowerCase();
  const reportType = ["esg", "csr", "evidence"].includes(reportTypeValue) ? reportTypeValue : "esg";
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    redirect("/corporate?error=program");
  }

  const code = exportCode();
  const artifacts = await writeReportArtifacts({
    exportCode: code,
    reportType,
    accountName: context.accountName,
    programName: context.programName,
    data
  });

  await db.insert(corporateReportExports).values({
    programId: context.programId,
    requestedByUserId: user.id,
    exportCode: code,
    reportType,
    status: "generated",
    fileUrl: artifacts.fileUrl,
    previewUrl: artifacts.previewUrl,
    evidenceBundleUrl: artifacts.evidenceBundleUrl,
    metadata: artifacts.metadata,
    createdAt: artifacts.generatedAt,
    updatedAt: artifacts.generatedAt
  });

  redirect("/corporate/reports?saved=export");
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

  if (!access || !roleCapabilities(access.context.permission).canSubmit) {
    redirect("/corporate/reports?error=permission");
  }

  await db
    .update(corporateReportExports)
    .set({
      status: "review",
      updatedAt: new Date()
    })
    .where(eq(corporateReportExports.id, access.report.id));

  redirect("/corporate/reports?saved=review");
}

export async function approveCorporateReportAction(formData: FormData) {
  const user = await requireUser("/corporate/reports");
  const reportId = String(formData.get("reportId") ?? "");
  const access = await reportForUser(user.id, reportId);

  if (!access || !roleCapabilities(access.context.permission).canApprove) {
    redirect("/corporate/reports?error=permission");
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

  redirect("/corporate/reports?saved=approved");
}

export async function publishCorporateReportAction(formData: FormData) {
  const user = await requireUser("/corporate/reports");
  const reportId = String(formData.get("reportId") ?? "");
  const access = await reportForUser(user.id, reportId);

  if (!access || !roleCapabilities(access.context.permission).canPublish) {
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

  redirect("/corporate/reports?saved=published");
}
