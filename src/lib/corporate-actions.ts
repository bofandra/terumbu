"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, eq, lte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  campaignActivities,
  campaigns,
  corporateAccounts,
  corporateContributions,
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
import { requireUser } from "@/lib/auth";
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
  corporateInviteExpiresAt,
  normalizeCorporateProgramStatus
} from "@/lib/corporate-lifecycle";
import {
  buildCorporateReportArtifactManifest,
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
  const fileUrl = `/generated/corporate-reports/${baseName}.json`;
  const previewUrl = `/generated/corporate-reports/${baseName}.html`;
  const evidenceBundleUrl = `/generated/corporate-reports/${baseName}-evidence.json`;
  const manifest = buildCorporateReportArtifactManifest({
    exportCode: input.exportCode,
    reportType: input.reportType,
    exportFormat: input.exportFormat,
    artifactVersion: input.artifactVersion,
    generatedAt,
    files: [
      { label: "Report data", format: "json", url: fileUrl, required: true },
      { label: "HTML preview", format: "html", url: previewUrl, required: input.exportFormat !== "evidence_json" },
      { label: "Evidence bundle", format: "json", url: evidenceBundleUrl, required: input.exportFormat !== "html_json" }
    ]
  });

  await mkdir(folder, { recursive: true });
  await Promise.all([
    writeFile(path.join(folder, `${baseName}.json`), `${JSON.stringify(reportPayload, null, 2)}\n`, "utf8"),
    writeFile(path.join(folder, `${baseName}.html`), reportHtml({ ...input, generatedAt }), "utf8"),
    writeFile(path.join(folder, `${baseName}-evidence.json`), `${JSON.stringify(evidencePayload, null, 2)}\n`, "utf8"),
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
      artifactVersion: input.artifactVersion
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
  const context = await corporateContext(user.id);

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
    redirect("/corporate/projects?error=project");
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
    redirect("/corporate/projects?error=project");
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

  redirect("/corporate/projects?saved=project");
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
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canManageFunding) {
    redirect("/corporate/funding?error=permission");
  }

  const category = textValue(formData.get("category"), 120);
  const allocatedAmount = parsePositiveAmount(formData.get("allocatedAmount"));
  const spentAmount = parseNonNegativeAmount(formData.get("spentAmount"));

  if (!category || !allocatedAmount || spentAmount === null) {
    redirect("/corporate/funding?error=budget");
  }

  const [budget] = await db
    .insert(corporateProgramBudgets)
    .values({
      programId: context.programId,
      category,
      allocatedAmount: allocatedAmount.toFixed(2),
      spentAmount: spentAmount.toFixed(2),
      metadata: {
        updatedFrom: "corporate_portal"
      }
    })
    .onConflictDoUpdate({
      target: [corporateProgramBudgets.programId, corporateProgramBudgets.category],
      set: {
        allocatedAmount: allocatedAmount.toFixed(2),
        spentAmount: spentAmount.toFixed(2),
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
      allocatedAmount,
      spentAmount
    }
  });

  redirect("/corporate/funding?saved=budget");
}

export async function updateCorporateEvidenceStatusAction(formData: FormData) {
  const user = await requireUser("/corporate/evidence");
  const context = await corporateContext(user.id);

  if (!context || !corporateCapabilitiesForPermission(context.permission).canUpdateEvidenceStatus) {
    redirect("/corporate/evidence?error=permission");
  }

  const evidenceId = textValue(formData.get("evidenceId"), 80);
  const requestedStatus = textValue(formData.get("verificationStatus"), 80);
  const verificationStatus = normalizeEvidenceVerificationStatus(requestedStatus, "submitted");
  const reviewNote = textValue(formData.get("reviewNote"), 1000);

  if (!evidenceId || !isUuid(evidenceId)) {
    redirect("/corporate/evidence?error=evidence");
  }

  if (evidenceReviewNoteRequired(verificationStatus) && !reviewNote) {
    redirect("/corporate/evidence?error=evidence");
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
    redirect("/corporate/evidence?error=evidence");
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

  redirect("/corporate/evidence?saved=evidence");
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
