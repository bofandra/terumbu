import { ArrowRight, BriefcaseBusiness, CircleDollarSign, ShieldCheck } from "lucide-react";

import { CorporateProjectInspector } from "@/components/corporate-project-inspector";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
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
  const data = await requireCorporateDashboardData(user.id, "/corporate/projects", params?.programId);
  const projectOptions = await getCorporateProjectOptions(user.id, data.program.programId);
  const canManageProjects = data.capabilities.canManageProjects;
  const selectedProgramHref = `?programId=${encodeURIComponent(data.program.programId)}`;

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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Project portfolio</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.programName}</h1>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62">
        Projects are funded conservation campaigns inside this program. Use this page to allocate corporate support, track milestones, and inspect project evidence.
      </p>

      <section className="mt-6 border-y border-ocean-900/10 bg-white/70 py-4" aria-label="Program project funding relationship">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
          <form action="/corporate/projects" className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Program
              <select name="programId" defaultValue={data.program.programId} className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                {data.programOptions.map((program) => (
                  <option key={program.programId} value={program.programId}>
                    {program.programName} · {formatCurrency(program.budgetAmountValue)} · {program.status}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" tone="secondary">
              View Program
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
          <ButtonLink href={`/corporate/funding${selectedProgramHref}`} tone="ghost" className="justify-self-start lg:justify-self-end">
            Funding
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { label: "Program", value: data.program.programName, support: `${formatCurrency(data.financials.committedFunding)} approved budget`, icon: BriefcaseBusiness },
            { label: "Projects", value: `${data.portfolio.length.toLocaleString("id-ID")} funded`, support: `${formatCurrency(data.financials.fundsDisbursed)} allocated from this program`, icon: ShieldCheck },
            { label: "Funding", value: formatCurrency(data.financials.contributionTotal), support: `${data.contributions.length.toLocaleString("id-ID")} ledger records`, icon: CircleDollarSign }
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-ocean-900/46">
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </div>
                <p className="mt-2 font-bold text-ocean-900">{item.value}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">{item.support}</p>
              </div>
            );
          })}
        </div>
      </section>

      {params?.saved ? (
        <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Corporate project portfolio updated.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Project funding could not be saved with the current input or permission.</p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Funded projects", data.portfolio.length.toLocaleString("id-ID")],
          ["Allocated funding", formatCurrency(data.financials.fundsDisbursed)],
          ["Recorded contributions", formatCurrency(data.financials.contributionTotal)],
          ["Counts to public goal", formatCurrency(data.financials.campaignGoalContribution)],
          ["Needs action", data.portfolio.filter((project) => project.statusLabel !== "On Track").length.toLocaleString("id-ID")]
        ].map(([label, value]) => (
          <article key={label} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/56">{label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
          </article>
        ))}
      </section>

      <div className="mt-6">
        <FormTabs
          ariaLabel="Corporate project workspace"
          tabs={[
            { id: "fund", label: "Fund Project", description: "Allocate or update support" },
            { id: "ledger", label: "Ledger", description: "Corporate commitments", badge: data.contributions.length.toLocaleString("id-ID") },
            { id: "inspect", label: "Inspector", description: "Milestones and evidence", badge: data.portfolio.length.toLocaleString("id-ID") }
          ]}
        >
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Portfolio actions</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Fund or update a conservation project</h2>
            </div>
            {canManageProjects ? (
              <form action={fundCorporateProjectAction} className="grid gap-2 xl:grid-cols-[minmax(260px,1fr)_160px_150px_150px_auto]">
                <input type="hidden" name="programId" value={data.program.programId} />
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Project
                  <select name="campaignId" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                    {projectOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title} · {option.region}{option.alreadyFunded ? ` · ${formatCurrency(option.allocationValue ?? 0)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Amount
                  <input
                    name="allocationAmount"
                    type="number"
                    min="1"
                    step="1000000"
                    placeholder="IDR"
                    className="min-h-11 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Contribution
                  <select name="contributionType" defaultValue="csr" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                    <option value="csr">CSR</option>
                    <option value="grant">Grant</option>
                    <option value="sponsorship">Sponsorship</option>
                    <option value="employee_matching">Employee matching</option>
                    <option value="in_kind">In-kind</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Contribution status
                  <select name="contributionStatus" defaultValue="committed" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                    <option value="pledged">Pledged</option>
                    <option value="committed">Committed</option>
                    <option value="disbursed">Disbursed</option>
                    <option value="verified">Verified</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Portfolio status
                  <select name="status" defaultValue="funded" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                    <option value="funded">Funded</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-ocean-900/12 px-3 text-sm font-bold text-ocean-900 xl:col-span-2">
                  <input name="countsTowardCampaignGoal" type="checkbox" className="size-4 rounded border-ocean-900/20" />
                  Count this corporate contribution toward the public campaign goal
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900 xl:col-span-2">
                  Notes
                  <input
                    name="notes"
                    placeholder="Optional internal note / PO / CSR reference"
                    className="min-h-11 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none"
                  />
                </label>
                <Button type="submit" tone="secondary" className="self-end" disabled={projectOptions.length === 0}>
                  Save Contribution
                </Button>
              </form>
            ) : (
              <p className="max-w-lg rounded-lg border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-sm font-semibold leading-6 text-ocean-900/68">
                Your corporate role can inspect project status and evidence, but cannot change portfolio funding.
              </p>
            )}
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-bold uppercase text-coral-700">Contribution ledger</p>
                <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Corporate commitments without real payment integration</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
                  These rows separate corporate CSR/grant/sponsorship records from individual donations. They can optionally update public campaign progress.
                </p>
              </div>
              <p className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">
                {data.contributions.length.toLocaleString("id-ID")} records
              </p>
            </div>
            <div className="divide-y divide-ocean-900/10">
              {data.contributions.slice(0, 8).map((contribution) => (
                <article key={contribution.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                  <div>
                    <h3 className="font-bold text-ocean-900">{contribution.campaignTitle}</h3>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                      {contribution.referenceCode} · {contribution.contributionType.replace(/_/g, " ")} · {contribution.publicGoalLabel}
                    </p>
                    {contribution.notes ? <p className="mt-2 text-sm leading-6 text-ocean-900/58">{contribution.notes}</p> : null}
                  </div>
                  <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold capitalize text-ocean-900">
                    {contribution.statusLabel}
                  </span>
                  <p className="text-lg font-bold tracking-normal text-ocean-900">{formatCurrency(contribution.amountValue)}</p>
                </article>
              ))}
              {data.contributions.length === 0 ? (
                <p className="py-6 text-sm font-semibold text-ocean-900/58">No corporate contributions have been recorded yet. Use the form above to create the first CSR/grant/sponsorship record.</p>
              ) : null}
            </div>
          </div>

          <CorporateProjectInspector projects={inspectorProjects} initialSelectedSlug={params?.project} />
        </FormTabs>
      </div>
    </main>
  );
}
