import { CircleDollarSign, Download, FileCheck2, FolderHeart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { createCorporateActivityPdfReportAction, fundCorporateProjectAction } from "@/lib/corporate-actions";
import { corporateReportArtifactRoute } from "@/lib/corporate-report-artifact-links";
import { getCorporateProjectOptions } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Donations"
};

export const dynamic = "force-dynamic";

type CorporateDonationsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-";
}

function evidenceStatusClass(status: string) {
  if (status === "verified") return "bg-kelp-100 text-kelp-700";
  if (status === "needs_clarification" || status === "rejected") return "bg-coral-100 text-coral-700";
  if (status === "in_review") return "bg-ocean-50 text-ocean-700";
  return "bg-sand-100 text-ocean-900/70";
}

export default async function CorporateDonationsPage({ searchParams }: CorporateDonationsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/donations");
  const data = await requireCorporateDashboardData(user.id, "/corporate/donations");
  const projectOptions = await getCorporateProjectOptions(user.id, data.program.programId);
  const donationReports = data.exports.filter((item) => item.activityScope === "donations");
  const totalDonations = data.contributions.filter((item) => item.status !== "cancelled").reduce((total, item) => total + item.amountValue, 0);
  const supportedProjects = new Set(data.contributions.map((item) => item.campaignId)).size;
  const verifiedEvidence = data.evidence.filter((item) => item.verificationStatus === "verified").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-5">
        <p className="text-sm text-ocean-900/62">Record company donations and view supporting evidence.</p>
      </header>

      {params?.saved === "project" ? <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Donation saved.</p> : null}
      {params?.saved === "report" ? <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">PDF report generated.</p> : null}
      {params?.error ? <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">The requested action could not be completed.</p> : null}

      <section className="mt-6 grid gap-3 md:grid-cols-3" aria-label="Donation summary">
        {[
          { label: "Donations", value: formatCurrency(totalDonations, data.program.currency), icon: CircleDollarSign },
          { label: "Projects supported", value: supportedProjects.toLocaleString("id-ID"), icon: FolderHeart },
          { label: "Verified evidence", value: verifiedEvidence.toLocaleString("id-ID"), icon: FileCheck2 }
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <Icon className="size-5 text-ocean-700" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <MetricValue className="mt-2 text-ocean-900">{metric.value}</MetricValue>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Add donation</h2>
          <form action={fundCorporateProjectAction} className="mt-5 grid gap-3">
            <input type="hidden" name="programId" value={data.program.programId} />
            <input type="hidden" name="status" value="funded" />
            <input type="hidden" name="contributionType" value="csr" />
            <input type="hidden" name="contributionStatus" value="committed" />
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Project
              <select name="campaignId" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900" required>
                {projectOptions.map((option) => <option key={option.id} value={option.id}>{option.title} · {option.region}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Amount ({data.program.currency.toUpperCase()})
              <input name="allocationAmount" type="number" min="1" step="1" inputMode="numeric" placeholder="100000000" className="min-h-11 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900" required />
            </label>
            <label className="flex items-start gap-3 rounded-lg bg-sand-50 p-3 text-sm font-semibold text-ocean-900">
              <input type="checkbox" name="countsTowardCampaignGoal" className="mt-1" />
              <span>Show this donation in public project progress</span>
            </label>
            <Button type="submit" disabled={projectOptions.length === 0}>Save donation</Button>
          </form>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Donation activity</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead><tr className="text-xs uppercase text-ocean-900/46"><th className="py-3 pr-4">Project</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Date</th><th className="py-3">Status</th></tr></thead>
              <tbody>
                {data.contributions.map((item) => (
                  <tr key={item.id} className="border-t border-ocean-900/10">
                    <td className="py-4 pr-4 font-bold text-ocean-900">{item.campaignTitle}</td>
                    <td className="py-4 pr-4 font-semibold text-ocean-900">{formatCurrency(item.amountValue, item.currency)}</td>
                    <td className="py-4 pr-4 text-ocean-900/62">{formatDate(item.contributionDate)}</td>
                    <td className="py-4 capitalize text-ocean-900/62">{item.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.contributions.length === 0 ? <p className="mt-4 text-sm font-semibold text-ocean-900/58">No donations yet.</p> : null}
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Evidence</h2>
        <p className="mt-1 text-sm text-ocean-900/58">Evidence status follows the same review workflow shown to partners.</p>
        <div className="mt-4 divide-y divide-ocean-900/10">
          {data.evidence.map((item) => (
            <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-bold text-ocean-900">{item.title}</p>
                <p className="mt-1 text-sm text-ocean-900/56">{item.campaignTitle}</p>
                {(item.verificationStatus === "needs_clarification" || item.verificationStatus === "rejected") && item.latestReviewNote ? (
                  <p className="mt-2 text-sm font-semibold text-coral-700">{item.latestReviewNote}</p>
                ) : null}
              </div>
              <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-bold", evidenceStatusClass(item.verificationStatus))}>{item.statusLabel}</span>
            </div>
          ))}
          {data.evidence.length === 0 ? <p className="py-4 text-sm font-semibold text-ocean-900/58">No evidence linked to donations yet.</p> : null}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-bold tracking-normal text-ocean-900">Donation report</h2><p className="mt-1 text-sm text-ocean-900/58">Branded PDF with report scope, donation summary, activity detail, linked evidence, and traceability note.</p></div>
          <form action={createCorporateActivityPdfReportAction}>
            <input type="hidden" name="activityScope" value="donations" />
            <input type="hidden" name="programId" value={data.program.programId} />
            <Button type="submit" tone="secondary"><Download className="size-4" aria-hidden="true" />Generate PDF</Button>
          </form>
        </div>
        <div className="mt-4 divide-y divide-ocean-900/10">
          {donationReports.map((report) => (
            <div key={report.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold text-ocean-900">{report.exportCode}</p><p className="text-xs text-ocean-900/52">{formatDate(report.generatedAt)}</p></div>
              {report.pdfUrl ? <Link href={corporateReportArtifactRoute(report.id, "pdf")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ocean-50 px-4 text-sm font-bold text-ocean-900"><Download className="size-4" aria-hidden="true" />PDF</Link> : null}
            </div>
          ))}
          {donationReports.length === 0 ? <p className="py-4 text-sm font-semibold text-ocean-900/58">No donation report yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
