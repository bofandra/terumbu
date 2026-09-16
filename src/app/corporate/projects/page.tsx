import { ArrowRight, CircleDollarSign, ShieldCheck } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { fundCorporateProjectAction } from "@/lib/corporate-actions";
import { getCorporateProjectOptions } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Projects"
};

export const dynamic = "force-dynamic";

type CorporateProjectsPageProps = {
  searchParams?: Promise<{
    error?: string;
    programId?: string;
    saved?: string;
  }>;
};

export default async function CorporateProjectsPage({ searchParams }: CorporateProjectsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/projects");
  const data = await requireCorporateDashboardData(user.id, "/corporate/projects", params?.programId);
  const projectOptions = await getCorporateProjectOptions(user.id, data.program.programId);
  const canManageProjects = data.capabilities.canManageProjects;
  const projectTotal = data.portfolio.reduce((total, project) => total + project.allocationValue, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Projects</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.programName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">Choose projects your company supports.</p>
        </div>
        <form action="/corporate/projects" className="grid gap-2 sm:min-w-80 sm:grid-cols-[1fr_auto] sm:items-end">
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
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </div>

      {params?.saved ? <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Project support saved.</p> : null}
      {params?.error ? <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Project support could not be saved.</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Projects", data.portfolio.length.toLocaleString("id-ID")],
          ["Project support", formatCurrency(projectTotal)],
          ["Contributions", formatCurrency(data.financials.contributionTotal)]
        ].map(([label, value]) => (
          <article key={label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/56">{label}</p>
            <MetricValue className="mt-3 text-ocean-900">{value}</MetricValue>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-5 text-coral-500" aria-hidden="true" />
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Add project support</h2>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">Record support without payment gateway integration.</p>

          {canManageProjects ? (
            <form action={fundCorporateProjectAction} className="mt-5 grid gap-3">
              <input type="hidden" name="programId" value={data.program.programId} />
              <input type="hidden" name="status" value="funded" />
              <input type="hidden" name="contributionType" value="csr" />
              <input type="hidden" name="contributionStatus" value="committed" />
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Project
                <select name="campaignId" className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" required>
                  {projectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title} · {option.region}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Amount
                <input name="allocationAmount" type="number" min="1" step="1000000" placeholder="50000000" className="min-h-11 w-full rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none focus:border-coral-500" required />
              </label>
              <label className="flex items-start gap-3 rounded-lg bg-sand-50 p-3 text-sm font-semibold text-ocean-900">
                <input type="checkbox" name="countsTowardCampaignGoal" className="mt-1" />
                <span>
                  <span className="block font-bold">Show this support in project progress</span>
                  <span className="block text-xs leading-5 text-ocean-900/58">Leave unchecked for company reporting only.</span>
                </span>
              </label>
              <Button type="submit" disabled={projectOptions.length === 0}>Save support</Button>
            </form>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/58">You can view projects, but cannot update support records.</p>
          )}
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-kelp-700" aria-hidden="true" />
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Supported projects</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {data.portfolio.map((project) => (
              <div key={project.campaignSlug} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-bold text-ocean-900">{project.campaignTitle}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{project.region} · {project.organizationName}</p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-700 ring-1 ring-ocean-900/10">{formatCurrency(project.allocationValue)}</span>
                </div>
              </div>
            ))}
            {data.portfolio.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/58">No supported projects yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Contributions</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Company support recorded for reporting.</p>
          </div>
          <ButtonLink href="/corporate/funding" tone="secondary">View all</ButtonLink>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-ocean-900/10">
          <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ocean-900/46">
                <th className="border-b border-ocean-900/10 px-4 py-3">Project</th>
                <th className="border-b border-ocean-900/10 px-4 py-3">Amount</th>
                <th className="border-b border-ocean-900/10 px-4 py-3">Status</th>
                <th className="border-b border-ocean-900/10 px-4 py-3">Visibility</th>
              </tr>
            </thead>
            <tbody>
              {data.contributions.slice(0, 6).map((contribution) => (
                <tr key={contribution.id}>
                  <td className="border-b border-ocean-900/8 px-4 py-4 font-bold text-ocean-900">{contribution.campaignTitle}</td>
                  <td className="border-b border-ocean-900/8 px-4 py-4 font-semibold text-ocean-900/70">{formatCurrency(contribution.amountValue, contribution.currency)}</td>
                  <td className="border-b border-ocean-900/8 px-4 py-4 capitalize text-ocean-900/70">{contribution.statusLabel}</td>
                  <td className="border-b border-ocean-900/8 px-4 py-4 text-ocean-900/70">{contribution.countsTowardCampaignGoal ? "Project progress" : "Report only"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.contributions.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/58">No contributions yet.</p> : null}
      </section>
    </main>
  );
}
