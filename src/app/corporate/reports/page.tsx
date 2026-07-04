import { CheckCircle2, Download, Eye, FileArchive, Send, UploadCloud } from "lucide-react";
import Link from "next/link";

import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import {
  approveCorporateReportAction,
  createCorporateReportExportAction,
  publishCorporateReportAction,
  submitCorporateReportForApprovalAction
} from "@/lib/corporate-actions";
import { getCorporateDashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Corporate Reports"
};

export const dynamic = "force-dynamic";

type CorporateReportsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function statusClass(status: string) {
  if (status === "published") {
    return "bg-kelp-100 text-kelp-700";
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
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <CorporateEmptyState />;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Reports</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">CSR and ESG report workflow</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Generate auditable report files, submit them for review, approve final versions, and publish a branded public impact page.
          </p>
        </div>
        {data.reportCapabilities.canGenerate ? (
          <form action={createCorporateReportExportAction} className="grid gap-2 rounded-2xl border border-ocean-900/10 bg-white p-3 shadow-soft sm:grid-cols-[160px_auto]">
            <select name="reportType" defaultValue="esg" className="min-h-11 rounded-full border border-ocean-900/12 bg-white px-4 text-sm font-bold text-ocean-900 outline-none">
              <option value="esg">ESG report</option>
              <option value="csr">CSR report</option>
              <option value="evidence">Evidence bundle</option>
            </select>
            <Button type="submit" tone="secondary">
              <Download size={18} aria-hidden="true" />
              Generate Files
            </Button>
          </form>
        ) : null}
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Report workflow updated.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">This report action needs a different corporate permission or approval state.</p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Generated reports", data.exports.length.toLocaleString("id-ID")],
          ["Verified metrics", String(data.latestReport.verifiedMetrics)],
          ["Pending metrics", String(data.latestReport.pendingMetrics)],
          ["Evidence records", data.evidence.length.toLocaleString("id-ID")]
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4">
        {data.exports.map((item) => (
          <article key={item.exportCode} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-normal text-ocean-900">{item.exportCode}</h2>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(item.status))}>{item.status}</span>
                  <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{item.reportTypeLabel}</span>
                </div>
                <p className="mt-2 text-sm text-ocean-900/58">
                  Generated {formatDate(item.createdAt)} · approved {formatDate(item.approvedAt)} · published {formatDate(item.publishedAt)}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {item.previewUrl ? (
                    <Link href={item.previewUrl} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-900 px-4 text-sm font-bold text-white">
                      <Eye size={16} aria-hidden="true" />
                      Preview
                    </Link>
                  ) : null}
                  {item.fileUrl ? (
                    <Link href={item.fileUrl} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                      <Download size={16} aria-hidden="true" />
                      JSON
                    </Link>
                  ) : null}
                  {item.evidenceBundleUrl ? (
                    <Link href={item.evidenceBundleUrl} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                      <FileArchive size={16} aria-hidden="true" />
                      Evidence Bundle
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
        {data.exports.length === 0 ? <p className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">Generate the first report file to start the approval workflow.</p> : null}
      </section>
    </main>
  );
}
