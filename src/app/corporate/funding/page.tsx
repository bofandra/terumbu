import { ArrowRight, CircleDollarSign, FileBadge, ShieldCheck } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Contributions"
};

export const dynamic = "force-dynamic";

type CorporateFundingPageProps = {
  searchParams?: Promise<{
    error?: string;
    programId?: string;
    saved?: string;
  }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function statusClass(status: string) {
  if (["committed", "disbursed", "verified"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["cancelled"].includes(status)) {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

export default async function CorporateFundingPage({ searchParams }: CorporateFundingPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/funding");
  const data = await requireCorporateDashboardData(user.id, "/corporate/funding", params?.programId);
  const publicGoalContributions = data.contributions.filter((contribution) => contribution.countsTowardCampaignGoal);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Contributions</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Company support records</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">Track support recorded for projects and reports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action="/corporate/funding" className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Program
              <select name="programId" defaultValue={data.program.programId} className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                {data.programOptions.map((program) => (
                  <option key={program.programId} value={program.programId}>
                    {program.programName}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" tone="secondary">
              View
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>

      {params?.saved ? <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Contribution data saved.</p> : null}
      {params?.error ? <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Contribution data could not be saved.</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { label: "Total", value: formatCurrency(data.financials.contributionTotal), icon: CircleDollarSign },
          { label: "Public project progress", value: formatCurrency(data.financials.campaignGoalContribution), icon: ShieldCheck },
          { label: "Records", value: data.contributions.length.toLocaleString("id-ID"), icon: FileBadge }
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon size={22} aria-hidden="true" className="text-coral-500" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <MetricValue className="mt-2 text-ocean-900">{metric.value}</MetricValue>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Contribution list</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Use Projects to add or update support.</p>
          </div>
          <ButtonLink href={`/corporate/projects?programId=${encodeURIComponent(data.program.programId)}`} tone="secondary">Add support</ButtonLink>
        </div>

        {data.contributions.length > 0 ? (
          <div className="mt-5 overflow-x-auto rounded-lg border border-ocean-900/10">
            <table className="min-w-[860px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-ocean-900/46">
                  <th className="border-b border-ocean-900/10 px-4 py-3">Project</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Reference</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Amount</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Status</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Visibility</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.contributions.map((contribution) => (
                  <tr key={contribution.id}>
                    <td className="border-b border-ocean-900/8 px-4 py-4 font-bold text-ocean-900">{contribution.campaignTitle}</td>
                    <td className="border-b border-ocean-900/8 px-4 py-4 text-ocean-900/62">{contribution.referenceCode}</td>
                    <td className="border-b border-ocean-900/8 px-4 py-4 font-semibold text-ocean-900">{formatCurrency(contribution.amountValue, contribution.currency)}</td>
                    <td className="border-b border-ocean-900/8 px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(contribution.status)}`}>{contribution.statusLabel}</span>
                    </td>
                    <td className="border-b border-ocean-900/8 px-4 py-4 text-ocean-900/62">{contribution.countsTowardCampaignGoal ? "Project progress" : "Report only"}</td>
                    <td className="border-b border-ocean-900/8 px-4 py-4 text-ocean-900/62">{formatDate(contribution.contributionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/58">No contributions yet.</p>
        )}
      </section>

      {publicGoalContributions.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-ocean-900/14 bg-white p-5 text-sm font-semibold text-ocean-900/58">
          No contribution is currently shown in public project progress.
        </section>
      ) : null}
    </main>
  );
}
