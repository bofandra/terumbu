import { AlertTriangle, ArrowRight, BriefcaseBusiness, CheckCircle2, CircleDollarSign, FileBadge, Kanban, ShieldCheck } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { updateCorporateBudgetAction, updateCorporateEvidenceSpendAction } from "@/lib/corporate-actions";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Finance"
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
  if (["Complete", "Closed", "Within tolerance", "On Track"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["Needs Approval", "Needs Attention", "Requires explanation", "Needs Review", "At Risk"].includes(status)) {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

export default async function CorporateFundingPage({ searchParams }: CorporateFundingPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/funding");
  const data = await requireCorporateDashboardData(user.id, "/corporate/funding", params?.programId);
  const canManageFunding = data.capabilities.canManageFunding;
  const unbudgetedAmount = Math.max(0, data.financials.committedFunding - data.financials.fundsDisbursed);
  const financeCampaignRows = data.portfolio.slice(0, 6);
  const selectedProgramHref = `?programId=${encodeURIComponent(data.program.programId)}`;
  const verifiedEvidenceOptions = data.evidence.filter((evidence) => evidence.verificationStatus === "verified");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Finance</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Budget and disbursement</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Track approved budget, category spend, variance, invoice evidence, and finance approvals. Campaign allocations stay in Funded campaigns; evidence review stays on the board.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/corporate/board${selectedProgramHref}`} tone="ghost">
            <Kanban size={18} aria-hidden="true" />
            Evidence board
          </ButtonLink>
          <ButtonLink href="/corporate/reports" tone="secondary">
            <FileBadge size={18} aria-hidden="true" />
            Export Finance Report
          </ButtonLink>
        </div>
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          {params.saved === "spend" ? "Evidence spend linked to finance category." : "Category budget updated."}
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Budget update could not be saved with the current input or permission.</p>
      ) : null}

      <section className="mt-6 border-y border-ocean-900/10 bg-white/70 py-4" aria-label="Finance program selector">
        <form action="/corporate/funding" className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_auto] sm:items-end">
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
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </form>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Approved budget", value: formatCurrency(data.financials.committedFunding), icon: CircleDollarSign },
          { label: "Category budget", value: formatCurrency(data.financials.fundsDisbursed), icon: FileBadge },
          { label: "Verified spend", value: formatCurrency(data.financials.verifiedUtilization), icon: ShieldCheck },
          { label: "Spend pending verification", value: formatCurrency(data.financials.pendingVerification), icon: AlertTriangle }
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon size={22} aria-hidden="true" className="text-coral-500" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft" aria-labelledby="finance-campaign-context">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-coral-700">Allocation context</p>
            <h2 id="finance-campaign-context" className="mt-2 text-xl font-bold tracking-normal text-ocean-900">
              Read-only funded campaign snapshot
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/58">
              Finance uses this snapshot to compare approved program budget against funded campaigns, ledger records, and verified evidence. Manage campaign allocation changes from Funded campaigns.
            </p>
          </div>
          <ButtonLink href={`/corporate/projects${selectedProgramHref}`} tone="ghost" className="self-start">
            Manage Funded Campaigns
            <ArrowRight size={17} aria-hidden="true" />
          </ButtonLink>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-ocean-900/10 bg-ocean-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">
              <BriefcaseBusiness size={15} aria-hidden="true" />
              Current program
            </div>
            <p className="mt-3 font-bold text-ocean-900">{data.program.programName}</p>
            <div className="mt-4 grid gap-2 text-sm">
              <p className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 font-semibold text-ocean-900/62">
                <span>Approved budget</span>
                <span className="font-bold text-ocean-900">{formatCurrency(data.financials.committedFunding)}</span>
              </p>
              <p className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 font-semibold text-ocean-900/62">
                <span>Budgeted by category</span>
                <span className="font-bold text-ocean-900">{formatCurrency(data.financials.fundsDisbursed)}</span>
              </p>
              <p className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 font-semibold text-ocean-900/62">
                <span>Not yet budgeted</span>
                <span className="font-bold text-ocean-900">{formatCurrency(unbudgetedAmount)}</span>
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-ocean-900/58">Budgeting progress</span>
              <span className="font-bold text-ocean-900">{data.financials.disbursementRate}%</span>
            </div>
            <ProgressMeter value={data.financials.disbursementRate} label="Program budget assigned to finance categories" className="mt-2 h-2" indicatorClassName="bg-ocean-700" trackClassName="bg-white" />
          </div>

          <div className="overflow-x-auto rounded-lg border border-ocean-900/10 bg-sand-50">
            <table className="min-w-[780px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-ocean-900/46">
                  <th className="border-b border-ocean-900/10 px-4 py-3">Campaign</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Allocation</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Contribution</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Evidence</th>
                  <th className="border-b border-ocean-900/10 px-4 py-3">Next finance step</th>
                </tr>
              </thead>
              <tbody>
                {financeCampaignRows.map((project) => (
                  <tr key={project.campaignSlug}>
                    <td className="border-b border-ocean-900/8 px-4 py-4">
                      <p className="font-bold text-ocean-900">{project.campaignTitle}</p>
                      <p className="mt-1 text-xs font-semibold text-ocean-900/54">{project.organizationName} · {project.region}</p>
                    </td>
                    <td className="border-b border-ocean-900/8 px-4 py-4 font-bold text-ocean-900">{formatCurrency(project.allocationValue)}</td>
                    <td className="border-b border-ocean-900/8 px-4 py-4 text-ocean-900/68">
                      <p className="font-bold text-ocean-900">{formatCurrency(project.contributionTotal)}</p>
                      <p className="mt-1 text-xs font-semibold capitalize text-ocean-900/54">{project.latestContributionStatus.replace(/_/g, " ")}</p>
                    </td>
                    <td className="border-b border-ocean-900/8 px-4 py-4 text-ocean-900/68">
                      {project.evidenceSummary.verified}/{project.evidenceSummary.total} verified
                    </td>
                    <td className="border-b border-ocean-900/8 px-4 py-4">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(project.disbursementStatus))}>{project.disbursementStatus}</span>
                    </td>
                  </tr>
                ))}
                {financeCampaignRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm font-semibold text-ocean-900/58" colSpan={5}>
                      No funded campaigns exist yet. Create the first allocation from Funded campaigns.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Finance actions</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Update category budget and evidence-backed spend</h2>
        {canManageFunding ? (
          <div className="mt-5 grid gap-5">
            <form action={updateCorporateBudgetAction} className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
              <input type="hidden" name="programId" value={data.program.programId} />
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Category
                <select name="category" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                  {data.budgetVariance.map((budget) => (
                    <option key={budget.category} value={budget.category}>
                      {budget.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Category budget
                <input
                  name="allocatedAmount"
                  type="number"
                  min="1"
                  step="1000000"
                  placeholder="IDR"
                  className="min-h-11 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none"
                  required
                />
              </label>
              <Button type="submit" tone="secondary" className="self-end">
                Save Category Budget
              </Button>
            </form>

            <form action={updateCorporateEvidenceSpendAction} className="grid gap-3 border-t border-ocean-900/10 pt-5 xl:grid-cols-[minmax(260px,1fr)_220px_180px_auto]">
              <input type="hidden" name="programId" value={data.program.programId} />
              <input type="hidden" name="returnTo" value={`/corporate/funding${selectedProgramHref}`} />
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Verified evidence
                <select name="evidenceId" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" disabled={verifiedEvidenceOptions.length === 0}>
                  {verifiedEvidenceOptions.map((evidence) => (
                    <option key={evidence.id} value={evidence.id}>
                      {evidence.title} · {evidence.campaignTitle}
                      {evidence.financeCategory ? ` · ${evidence.financeCategory}` : ""}
                      {evidence.financeSpendAmount > 0 ? ` · ${formatCurrency(evidence.financeSpendAmount)}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Finance category
                <select name="category" className="min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" disabled={verifiedEvidenceOptions.length === 0}>
                  {data.budgetVariance.map((budget) => (
                    <option key={budget.category} value={budget.category}>
                      {budget.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Evidence spend
                <input
                  name="spendAmount"
                  type="number"
                  min="1"
                  step="1000000"
                  placeholder="IDR"
                  className="min-h-11 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none"
                  disabled={verifiedEvidenceOptions.length === 0}
                  required
                />
              </label>
              <Button type="submit" tone="secondary" className="self-end" disabled={verifiedEvidenceOptions.length === 0}>
                Link Evidence Spend
              </Button>
            </form>
          </div>
        ) : (
          <p className="mt-5 max-w-xl rounded-lg border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-sm font-semibold leading-6 text-ocean-900/68">
            Your corporate role can review finance utilization, but cannot change category budgets or link verified evidence spend.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Finance flow</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Approved budget to verified spend</h2>
          <div className="mt-5 grid gap-4">
            {data.fundingFlow.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-ocean-900">{step.label}</span>
                  <span className="font-bold text-ocean-900/62">{formatCurrency(step.value)}</span>
                </div>
                <ProgressMeter value={step.percent} label={`${step.label} finance flow`} className="mt-2 h-2" indicatorClassName="bg-ocean-700" trackClassName="bg-ocean-50" />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Approval queue</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Variance and milestone decisions</h2>
          <div className="mt-5 grid gap-3">
            {data.fundingApprovalQueue.map((item) => (
              <div key={`${item.title}-${item.action}`} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/54">
                      {item.owner} · {formatDate(item.dueDate)} · {formatCurrency(item.amount)}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(item.status))}>{item.status}</span>
                </div>
                <p className="mt-3 inline-flex min-h-9 items-center rounded-full bg-white px-3 text-xs font-bold text-ocean-900">{item.action}</p>
              </div>
            ))}
            {data.fundingApprovalQueue.length === 0 ? (
              <div className="rounded-lg border border-kelp-500/20 bg-kelp-100/55 p-4">
                <p className="font-bold text-kelp-700">No finance approvals waiting</p>
                <p className="mt-1 text-sm text-kelp-700/72">Budget variance and campaign milestones are within current tolerances.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Budget vs actual</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Category variance</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ocean-900/46">
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Category</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Planned</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Actual</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Evidence</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Variance</th>
                <th className="border-b border-ocean-900/10 pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.budgetVariance.map((budget) => (
                <tr key={budget.category}>
                  <td className="border-b border-ocean-900/8 py-4 pr-4 font-bold text-ocean-900">{budget.category}</td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4 text-ocean-900/68">{formatCurrency(budget.planned)}</td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4 text-ocean-900/68">{formatCurrency(budget.actual)}</td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4 text-ocean-900/68">{budget.evidenceCount.toLocaleString("id-ID")} linked</td>
                  <td className="border-b border-ocean-900/8 py-4 pr-4 font-bold text-ocean-900">{budget.variance}%</td>
                  <td className="border-b border-ocean-900/8 py-4">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(budget.status))}>{budget.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Disbursement schedule</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Milestone payments and evidence requirements</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.fundingSchedule.map((schedule) => (
            <article key={schedule.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ocean-900">{schedule.milestone}</h3>
                  <p className="mt-1 text-xs leading-5 text-ocean-900/54">
                    {formatDate(schedule.dueDate)} · {schedule.approvalStep}
                  </p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(schedule.status))}>{schedule.status}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <p className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-ocean-900">Amount {formatCurrency(schedule.amount)}</p>
                <p className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-ocean-900">Verified {formatCurrency(schedule.disbursed)}</p>
              </div>
              <ProgressMeter value={schedule.utilization} label={`${schedule.milestone} utilization`} className="mt-4 h-2" indicatorClassName={schedule.status === "Needs Approval" ? "bg-coral-500" : "bg-kelp-500"} trackClassName="bg-white" />
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-ocean-900/58">
                <CheckCircle2 size={15} aria-hidden="true" />
                {schedule.evidenceRequired ? "Invoice and field evidence required" : "Invoice evidence required"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
