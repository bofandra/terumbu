import { CorporateProjectInspector } from "@/components/corporate-project-inspector";
import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { fundCorporateProjectAction } from "@/lib/corporate-actions";
import { getCorporateDashboardData, getCorporateProjectOptions } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Projects"
};

export const dynamic = "force-dynamic";

type CorporateProjectsPageProps = {
  searchParams?: Promise<{
    error?: string;
    project?: string;
    saved?: string;
  }>;
};

function dateString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export default async function CorporateProjectsPage({ searchParams }: CorporateProjectsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/projects");
  const [data, projectOptions] = await Promise.all([getCorporateDashboardData(user.id), getCorporateProjectOptions(user.id)]);

  if (!data) {
    return <CorporateEmptyState />;
  }

  const inspectorProjects = data.portfolio.map((project) => ({
    campaignSlug: project.campaignSlug,
    campaignTitle: project.campaignTitle,
    campaignCategory: project.campaignCategory,
    campaignHref: `/campaigns/${project.campaignSlug}`,
    region: project.region,
    organizationName: project.organizationName,
    organizationVerification: project.organizationVerification,
    allocationValue: project.allocationValue,
    utilization: project.utilization,
    impactProgress: project.impactProgress,
    impactTarget: project.impactTarget,
    impactUnit: project.impactUnit,
    statusLabel: project.statusLabel,
    statusExplanation: project.statusExplanation,
    nextMilestone: project.nextMilestone,
    nextMilestoneDate: dateString(project.nextMilestoneDate),
    partnerScore: project.partnerScore,
    invoiceStatus: project.invoiceStatus,
    disbursementStatus: project.disbursementStatus,
    evidenceSummary: project.evidenceSummary,
    milestones: project.milestones.map((milestone) => ({
      ...milestone,
      dueDate: dateString(milestone.dueDate)
    })),
    nextActions: project.nextActions
  }));

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Project portfolio</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.programName}</h1>

      {params?.saved ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Corporate project portfolio updated.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Project funding could not be saved with the current input or permission.</p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Funded projects", data.portfolio.length.toLocaleString("id-ID")],
          ["Allocated funding", formatCurrency(data.financials.fundsDisbursed)],
          ["Verified utilization", `${data.financials.verifiedUtilizationRate}%`],
          ["Needs action", data.portfolio.filter((project) => project.statusLabel !== "On Track").length.toLocaleString("id-ID")]
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/56">{label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-coral-700">Portfolio actions</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Fund or update a conservation project</h2>
          </div>
          <form action={fundCorporateProjectAction} className="grid gap-2 md:grid-cols-[minmax(240px,1fr)_180px_150px_auto]">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Project
              <select name="campaignId" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                {projectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title} · {option.region}{option.alreadyFunded ? ` · ${formatCurrency(option.allocationValue ?? 0)}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Allocation
              <input
                name="allocationAmount"
                type="number"
                min="1"
                step="1000000"
                placeholder="IDR"
                className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Status
              <select name="status" defaultValue="funded" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                <option value="funded">Funded</option>
                <option value="monitoring">Monitoring</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <Button type="submit" tone="secondary" className="self-end" disabled={projectOptions.length === 0}>
              Save Project
            </Button>
          </form>
        </div>
      </section>

      <div className="mt-6">
        <CorporateProjectInspector projects={inspectorProjects} initialSelectedSlug={params?.project} />
      </div>
    </main>
  );
}
