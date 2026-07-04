import { CorporateProjectInspector } from "@/components/corporate-project-inspector";
import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Projects"
};

export const dynamic = "force-dynamic";

type CorporateProjectsPageProps = {
  searchParams?: Promise<{
    project?: string;
  }>;
};

function dateString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export default async function CorporateProjectsPage({ searchParams }: CorporateProjectsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/projects");
  const data = await getCorporateDashboardData(user.id);

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

      <div className="mt-6">
        <CorporateProjectInspector projects={inspectorProjects} initialSelectedSlug={params?.project} />
      </div>
    </main>
  );
}
