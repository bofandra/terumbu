import { CheckCircle2, Download, Eye, FileArchive, Send, UploadCloud } from "lucide-react";
import Link from "next/link";

import { FormTabs } from "@/components/ui/form-tabs";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import {
  approveCorporateReportAction,
  createCorporateReportExportAction,
  publishCorporateReportAction,
  runDueCorporateReportExportsAction,
  submitCorporateReportForApprovalAction
} from "@/lib/corporate-actions";
import { corporateReportArtifactRoute } from "@/lib/corporate-report-artifact-links";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Corporate Reports"
};

export const dynamic = "force-dynamic";

type CorporateReportsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    generated?: string;
  }>;
};

function statusClass(status: string) {
  if (status === "published") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "scheduled") {
    return "bg-sand-100 text-ocean-900";
  }

  if (status === "approved" || status === "generated") {
    return "bg-ocean-50 text-ocean-700";
  }

  if (status === "review") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900/62";
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

export default async function CorporateReportsPage({ searchParams }: CorporateReportsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/reports");
  const data = await requireCorporateDashboardData(user.id, "/corporate/reports");
  const scheduledDueCount = data.exports.filter((item) => item.isScheduledDue).length;
  const reportTabs = data.reportCapabilities.canGenerate
    ? [
        { id: "generate", label: "Generate", description: "Create or schedule artifacts", badge: scheduledDueCount > 0 ? `${scheduledDueCount} due` : undefined },
        { id: "history", label: "History", description: "Preview, download, approve, publish", badge: data.exports.length.toLocaleString("id-ID") }
      ]
    : [{ id: "history", label: "History", description: "Preview and download approved artifacts", badge: data.exports.length.toLocaleString("id-ID") }];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Reports</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">CSR and ESG report workflow</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Generate auditable report files, submit them for review, approve final versions, and publish a branded public impact page.
          </p>
        </div>
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          {params.saved === "scheduled"
            ? "Report generation was scheduled."
            : params.saved === "scheduled-run"
              ? `Scheduled report run complete: ${Number(params.generated ?? 0).toLocaleString("id-ID")} generated.`
              : "Report workflow updated."}
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">This report action needs a different corporate permission or approval state.</p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Generated reports", data.exports.length.toLocaleString("id-ID")],
          ["Due schedules", scheduledDueCount.toLocaleString("id-ID")],
          ["Verified metrics", String(data.latestReport.verifiedMetrics)],
          ["Evidence records", data.evidence.length.toLocaleString("id-ID")]
        ].map(([label, value]) => (
          <article key={label} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3" aria-label="Report terminology">
        {[
          ["Report export", "The generated ESG/CSR package: preview HTML, source JSON, and optional PDF, XLSX, CSV, and evidence files."],
          ["Evidence bundle", "The auditable source records attached to funded projects. It can stand alone or sit inside a full report package."],
          ["Public impact page", "The published corporate-facing summary after an approved report is intentionally made public."]
        ].map(([title, detail]) => (
          <article key={title} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <h2 className="text-sm font-bold text-ocean-900">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">{detail}</p>
          </article>
        ))}
      </section>

      <div className="mt-6">
        <FormTabs ariaLabel="Corporate report actions" tabs={reportTabs}>
          {data.reportCapabilities.canGenerate ? (
            <div className="grid gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-normal text-ocean-900">Generate report artifacts</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
                  Pick the report type, artifact package, and optional schedule. Leaving the schedule blank generates files immediately.
                </p>
              </div>
              <form action={createCorporateReportExportAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4 xl:grid-cols-[180px_180px_240px_auto]">
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Report type
                  <select name="reportType" defaultValue="esg" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-bold text-ocean-900 outline-none">
                    <option value="esg">ESG report</option>
                    <option value="csr">CSR report</option>
                    <option value="evidence">Evidence bundle</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Export format
                  <select name="exportFormat" defaultValue="html_json" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-bold text-ocean-900 outline-none">
                    <option value="html_json">HTML + JSON</option>
                    <option value="evidence_json">Evidence JSON</option>
                    <option value="full_archive">Full archive</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Schedule
                  <input name="scheduledFor" type="datetime-local" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-bold text-ocean-900 outline-none" />
                </label>
                <Button type="submit" tone="secondary" className="self-end">
                  <Download size={18} aria-hidden="true" />
                  Generate
                </Button>
              </form>

              {scheduledDueCount > 0 ? (
                <form action={runDueCorporateReportExportsAction} className="flex flex-col justify-between gap-3 rounded-lg border border-sand-300 bg-white p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-ocean-900">Scheduled reports are due</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{scheduledDueCount.toLocaleString("id-ID")} report export can be generated now.</p>
                  </div>
                  <Button type="submit" tone="secondary">
                    <Download size={18} aria-hidden="true" />
                    Run due schedules
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4">
            {data.exports.map((item) => (
              <article key={item.exportCode} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold tracking-normal text-ocean-900">{item.exportCode}</h2>
                      <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(item.status))}>{item.status}</span>
                      <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{item.reportTypeLabel}</span>
                      <span className="rounded-full bg-sand-50 px-3 py-1 text-xs font-bold text-ocean-900">{item.exportFormatLabel}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900 ring-1 ring-ocean-900/10">{item.artifactVersionLabel}</span>
                    </div>
                    <p className="mt-2 text-sm text-ocean-900/58">
                      Scheduled {formatDate(item.scheduledFor)} · generated {formatDate(item.generatedAt)} · approved {formatDate(item.approvedAt)} · published {formatDate(item.publishedAt)}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">Artifact readiness: {item.artifactReadiness}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {item.previewUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "preview")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-900 px-4 text-sm font-bold text-white">
                          <Eye size={16} aria-hidden="true" />
                          Preview
                        </Link>
                      ) : null}
                      {item.fileUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "data")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                          <Download size={16} aria-hidden="true" />
                          JSON
                        </Link>
                      ) : null}
                      {item.evidenceBundleUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "evidence")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                          <FileArchive size={16} aria-hidden="true" />
                          Evidence Bundle
                        </Link>
                      ) : null}
                      {item.pdfUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "pdf")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                          <Download size={16} aria-hidden="true" />
                          PDF
                        </Link>
                      ) : null}
                      {item.workbookUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "workbook")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                          <Download size={16} aria-hidden="true" />
                          XLSX
                        </Link>
                      ) : null}
                      {item.portfolioCsvUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "portfolio-csv")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                          Portfolio CSV
                        </Link>
                      ) : null}
                      {item.evidenceCsvUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "evidence-csv")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                          Evidence CSV
                        </Link>
                      ) : null}
                      {item.manifestUrl ? (
                        <Link href={corporateReportArtifactRoute(item.id, "manifest")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                          Manifest
                        </Link>
                      ) : null}
                      {item.publicHref ? (
                        <Link href={item.publicHref} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-kelp-100 px-4 text-sm font-bold text-kelp-700">
                          Public Page
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {data.reportCapabilities.canSubmit && item.status === "generated" ? (
                      <form action={submitCorporateReportForApprovalAction}>
                        <input type="hidden" name="reportId" value={item.id} />
                        <Button type="submit" tone="light">
                          <Send size={16} aria-hidden="true" />
                          Submit
                        </Button>
                      </form>
                    ) : null}
                    {data.reportCapabilities.canApprove && item.status === "review" ? (
                      <form action={approveCorporateReportAction}>
                        <input type="hidden" name="reportId" value={item.id} />
                        <Button type="submit" tone="secondary">
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Approve
                        </Button>
                      </form>
                    ) : null}
                    {data.reportCapabilities.canPublish && item.status === "approved" ? (
                      <form action={publishCorporateReportAction}>
                        <input type="hidden" name="reportId" value={item.id} />
                        <Button type="submit">
                          <UploadCloud size={16} aria-hidden="true" />
                          Publish
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            {data.exports.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">Generate the first report file to start the approval workflow.</p> : null}
          </div>
        </FormTabs>
      </div>
    </main>
  );
}
