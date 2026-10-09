import { ArrowUpRight, CheckCircle2, Clock3, FileText, Globe2, Send } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import {
  approveCorporateReportAction,
  createCorporateReportExportAction,
  publishCorporateReportAction,
  runDueCorporateReportExportsAction,
  submitCorporateReportForApprovalAction
} from "@/lib/corporate-actions";
import { corporateReportArtifactRoute } from "@/lib/corporate-report-artifact-links";
import { getCorporateReportExecutionMonitor } from "@/lib/corporate-report-execution-monitor";
import { getUserRoles, requireUser } from "@/lib/auth";

export const metadata = { title: "Corporate Reports" };
export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?: Promise<{ programId?: string; error?: string; saved?: string; generated?: string; failed?: string }>;
};

const successMessages: Record<string, string> = {
  export: "Report generated. Review its PDF before submitting it for approval.",
  review: "Report submitted for review.",
  approved: "Report approved. It is ready to publish.",
  published: "Report published and available at its public link.",
  scheduled: "Report scheduled. The worker will generate it automatically when due."
};

const errorMessages: Record<string, string> = {
  permission: "You do not have permission to manage that report.",
  status: "The report status has changed. Refresh and review the latest status.",
  approval: "The report must be approved before publishing.",
  report: "The report could not be generated.",
  separation: "The report creator cannot approve their own report. Another corporate admin must review it.",
  snapshot: "This older report has no generation snapshot. Create a new report before publishing.",
  revision: "Only a published ESG or CSR report from this program can be revised.",
  schedule: "Choose a valid future UTC date and time to schedule a report."
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";
}

function formatScheduledUtc(value: Date | null | undefined) {
  return value ? `${value.toISOString().slice(0, 16).replace("T", " ")} UTC` : "Not yet";
}

function statusClass(value: string) {
  if (value === "published") return "bg-kelp-100 text-kelp-700";
  if (value === "approved") return "bg-ocean-50 text-ocean-700";
  if (value === "review") return "bg-sand-100 text-ocean-900";
  return "bg-white text-ocean-900/65";
}

export default async function CorporateReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/reports");
  const [data, roleKeys] = await Promise.all([
    requireCorporateDashboardData(user.id, "/corporate/reports", params?.programId),
    getUserRoles(user.id)
  ]);
  const canAdmin = !roleKeys.includes("admin") && (data.capabilities.canGenerateReport || data.capabilities.canApproveReport);
  const canGenerate = !roleKeys.includes("admin") && data.reportCapabilities.canGenerate;
  const canSubmit = !roleKeys.includes("admin") && data.reportCapabilities.canSubmit;
  const canApprove = !roleKeys.includes("admin") && data.reportCapabilities.canApprove;
  const canPublish = !roleKeys.includes("admin") && data.reportCapabilities.canPublish;
  const reports = data.exports;
  const executionMonitor = canAdmin
    ? await getCorporateReportExecutionMonitor(user.id, data.program.programId, reports)
    : { byReportId: {}, summary: { scheduled: 0, awaitingGeneration: 0, needAttention: 0 } };
  const inReview = reports.filter((item) => item.status === "review").length;
  const published = reports.filter((item) => item.status === "published").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Corporate</p>
        <h1 className="mt-2 text-3xl font-bold text-ocean-900">Reports</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/60">
          Generate reports, review their evidence, approve and publish results for an individual corporate program.
          Reports remain private until published.
        </p>
        <p className="mt-3 text-sm font-semibold text-ocean-900/70">
          {data.program.accountName} · {data.program.programName}
        </p>
      </header>

      {params?.saved && successMessages[params.saved] ? (
        <p role="status" className="mt-5 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
          {successMessages[params.saved]}
        </p>
      ) : null}
      {params?.saved === "scheduled-run" ? (
        <p role="status" className="mt-5 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
          {Number(params.generated ?? 0) || 0} due reports generated.
          {Number(params.failed ?? 0) > 0 ? ` ${Number(params.failed)} reports failed and remain scheduled for retry.` : ""}
        </p>
      ) : null}
      {params?.error ? (
        <p role="alert" className="mt-5 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
          {errorMessages[params.error] ?? "Unable to complete the requested action."}
        </p>
      ) : null}

      {data.programOptions.length > 1 ? (
        <form action="/corporate/reports" method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-ocean-900/10 bg-white p-4">
          <label className="grid min-w-[230px] flex-1 gap-2 text-sm font-bold text-ocean-900" htmlFor="report-program">
            Corporate program
            <select id="report-program" name="programId" defaultValue={data.program.programId} className="min-h-11 rounded-lg border border-ocean-900/15 bg-white px-3 text-sm font-semibold">
              {data.programOptions.map((program) => (
                <option key={program.programId} value={program.programId}>{program.programName}</option>
              ))}
            </select>
          </label>
          <Button type="submit" tone="secondary">View reports</Button>
        </form>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Report summary">
        {[
          { label: "Total reports", value: reports.length, icon: FileText },
          { label: "Awaiting approval", value: inReview, icon: Clock3 },
          { label: "Published", value: published, icon: Globe2 }
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <Icon size={20} className="text-ocean-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-ocean-900/55">{label}</p>
            <p className="mt-1 text-2xl font-bold text-ocean-900">{value.toLocaleString("id-ID")}</p>
          </article>
        ))}
      </section>

      {canAdmin ? <section aria-label="Scheduled generation overview" className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ocean-900">PDF generation monitor</h2>
          <p className="text-xs text-ocean-900/60">Hourly automatic processing · Selected corporate program only</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Scheduled", value: executionMonitor.summary.scheduled },
            { label: "Due for generation", value: executionMonitor.summary.awaitingGeneration },
            { label: "Needs attention", value: executionMonitor.summary.needAttention }
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg border border-ocean-900/10 p-3">
              <p className="text-xs font-semibold text-ocean-900/65">{metric.label}</p>
              <p className="mt-1 text-xl font-bold text-ocean-900">{metric.value.toLocaleString("id-ID")}</p>
            </div>
          ))}
        </div>
        {executionMonitor.summary.needAttention > 0 ? (
          <p className="mt-3 text-sm text-coral-700">
            Some reports could not be generated. Review the issue and next retry time in the report library below.
          </p>
        ) : null}
      </section> : null}

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ocean-900">Report library</h2>
            <p className="mt-1 text-sm text-ocean-900/60">All reports for the selected program, newest first.</p>
          </div>
          {canGenerate ? (
            <div className="flex flex-wrap gap-2">
              {(["esg", "csr"] as const).map((reportType) => (
                <form key={reportType} action={createCorporateReportExportAction}>
                  <input type="hidden" name="programId" value={data.program.programId} />
                  <input type="hidden" name="reportType" value={reportType} />
                  <Button type="submit" tone={reportType === "esg" ? "primary" : "secondary"}>
                    Generate {reportType.toUpperCase()} report
                  </Button>
                </form>
              ))}
            </div>
          ) : null}
        </div>

        {canGenerate ? (
          <div className="mt-5 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <h3 className="font-bold text-ocean-900">Schedule PDF exports</h3>
            <p className="mt-1 text-xs leading-5 text-ocean-900/60">
              Times are entered in UTC. Due reports are generated automatically (typically within an hour),
              or manually via the button below. Reports still require independent approval before publishing.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <form action={createCorporateReportExportAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="programId" value={data.program.programId} />
                <label className="grid gap-1 text-xs font-bold text-ocean-900">
                  Report type
                  <select name="reportType" className="min-h-11 rounded-lg border border-ocean-900/15 bg-white px-3 text-sm">
                    <option value="esg">ESG</option>
                    <option value="csr">CSR</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold text-ocean-900">
                  Scheduled time (UTC)
                  <input type="datetime-local" name="scheduledFor" required className="min-h-11 rounded-lg border border-ocean-900/15 bg-white px-3 text-sm" />
                </label>
                <Button type="submit" tone="secondary">Schedule PDF</Button>
              </form>
              <form action={runDueCorporateReportExportsAction}>
                <input type="hidden" name="programId" value={data.program.programId} />
                <Button type="submit" tone="secondary">
                  Generate due reports
                </Button>
              </form>
            </div>
          </div>
        ) : null}

        <div className="mt-5 divide-y divide-ocean-900/10">
          {reports.map((report) => (
            <article key={report.id} data-testid={`corporate-report-${report.id}`} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all text-base font-bold text-ocean-900">{report.exportCode}</p>
                  <p className="mt-1 text-sm text-ocean-900/62">
                    {report.reportTypeLabel} · {report.artifactVersionLabel} · {report.status === "scheduled" ? "Awaiting PDF generation" : `Generated ${formatDate(report.generatedAt)}`}
                  </p>
                  {report.revisionOfExportCode ? (
                    <p className="mt-1 text-xs font-semibold text-ocean-900/60">New version of {report.revisionOfExportCode}</p>
                  ) : null}
                  {report.status === "scheduled" ? (
                    <p className="mt-1 text-xs font-semibold text-ocean-900/55">Scheduled for {formatScheduledUtc(report.scheduledFor)}</p>
                  ) : null}
                </div>
                <span className={`rounded-full border border-ocean-900/10 px-3 py-1 text-xs font-bold capitalize ${statusClass(report.status)}`}>
                  {report.status === "review" ? "In review" : report.status}
                </span>
              </div>

              {canAdmin && executionMonitor.byReportId[report.id] && (report.scheduledFor || executionMonitor.byReportId[report.id].events.length > 0) ? (
                <section
                  aria-label={`Execution monitor for ${report.exportCode}`}
                  data-testid={`corporate-report-monitor-${report.id}`}
                  className="mt-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3"
                >
                  <p className="text-xs font-bold text-ocean-900">
                    Execution: {executionMonitor.byReportId[report.id].statusLabel}
                  </p>
                  {executionMonitor.byReportId[report.id].failureCount > 0 ? (
                    <div className="mt-2 space-y-1 text-xs text-ocean-900/75">
                      <p>Failed attempts: {executionMonitor.byReportId[report.id].failureCount}</p>
                      {executionMonitor.byReportId[report.id].lastFailure ? (
                        <p className="font-semibold text-coral-700">
                          Last issue: {executionMonitor.byReportId[report.id].lastFailure}
                        </p>
                      ) : null}
                      {executionMonitor.byReportId[report.id].lastFailedAt ? (
                        <p>Last failed: {formatScheduledUtc(executionMonitor.byReportId[report.id].lastFailedAt)}</p>
                      ) : null}
                      {executionMonitor.byReportId[report.id].nextRetryAt ? (
                        <p>Next automatic retry: {formatScheduledUtc(executionMonitor.byReportId[report.id].nextRetryAt)}</p>
                      ) : null}
                      {!executionMonitor.byReportId[report.id].scheduled ? (
                        <p>Generation recovered; this report is no longer queued for retry.</p>
                      ) : null}
                    </div>
                  ) : null}
                  {executionMonitor.byReportId[report.id].events.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-bold text-ocean-700">Recent execution history</summary>
                      <ol className="mt-2 space-y-2 border-l-2 border-ocean-900/10 pl-3">
                        {executionMonitor.byReportId[report.id].events.map((event) => (
                          <li key={event.id} className="text-xs text-ocean-900/75">
                            <p className="font-semibold text-ocean-900">{event.label} · {event.source}</p>
                            <p>{formatScheduledUtc(event.occurredAt)}</p>
                            {event.detail ? <p className="mt-1 text-coral-700">{event.detail}</p> : null}
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : (
                    <p className="mt-1 text-xs text-ocean-900/60">No execution events recorded yet.</p>
                  )}
                </section>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {report.pdfUrl ? (
                  <Link href={corporateReportArtifactRoute(report.id, "pdf")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ocean-50 px-4 text-sm font-bold text-ocean-900 hover:bg-ocean-100">
                    <FileText size={16} aria-hidden="true" /> Download PDF
                  </Link>
                ) : null}
                {report.publicHref && report.status === "published" ? (
                  <Link href={report.publicHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-kelp-100 px-4 text-sm font-bold text-kelp-700 hover:underline">
                    <ArrowUpRight size={16} aria-hidden="true" /> Public report
                  </Link>
                ) : null}

                {canGenerate && report.status === "published" && ["esg", "csr"].includes(report.reportType) ? (
                  <form action={createCorporateReportExportAction}>
                    <input type="hidden" name="programId" value={data.program.programId} />
                    <input type="hidden" name="revisionOfReportId" value={report.id} />
                    <Button type="submit" tone="secondary">Create revision</Button>
                  </form>
                ) : null}
                {canSubmit && report.status === "generated" && (Boolean(report.pdfUrl) || report.artifactReadiness === "ready") ? (
                  <form action={submitCorporateReportForApprovalAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <Button type="submit" tone="secondary"><Send size={16} aria-hidden="true" /> Submit for review</Button>
                  </form>
                ) : null}
                {canApprove && report.status === "review" && report.requestedByUserId && report.requestedByUserId !== user.id ? (
                  <form action={approveCorporateReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <Button type="submit" tone="secondary"><CheckCircle2 size={16} aria-hidden="true" /> Approve report</Button>
                  </form>
                ) : null}
                {canApprove && report.status === "review" && report.requestedByUserId === user.id ? (
                  <p className="text-sm font-semibold text-ocean-900/60">Awaiting independent approval from another corporate admin.</p>
                ) : null}
                {canApprove && report.status === "review" && !report.requestedByUserId ? (
                  <p className="text-sm font-semibold text-coral-700">Creator unknown; independent approval requires a report with an identified creator.</p>
                ) : null}
                {canPublish && report.status === "approved" && !report.hasGenerationSnapshot ? (
                  <p className="text-sm font-semibold text-coral-700">
                    This older report has no frozen PDF dataset. Generate a new report instead.
                  </p>
                ) : null}
                {canPublish && report.status === "approved" && report.hasGenerationSnapshot ? (
                  <form action={publishCorporateReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <Button type="submit"><Globe2 size={16} aria-hidden="true" /> Publish report</Button>
                  </form>
                ) : null}
              </div>
              {report.status === "generated" && !report.pdfUrl && report.artifactReadiness !== "ready" ? (
                <p className="mt-3 text-xs font-semibold text-coral-700">Artifact not ready. Generate a complete report before submitting it.</p>
              ) : null}
            </article>
          ))}
          {reports.length === 0 ? (
            <p className="py-8 text-sm font-semibold text-ocean-900/58">
              No reports for this program. {canGenerate ? "Generate an ESG or CSR report to begin." : "Ask your corporate admin to generate one."}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
