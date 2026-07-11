import { AlertTriangle, CheckCircle2, CircleDollarSign, FileBadge, ShieldCheck } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { updateCorporateBudgetAction } from "@/lib/corporate-actions";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Funding"
};

export const dynamic = "force-dynamic";

type CorporateFundingPageProps = {
  searchParams?: Promise<{
    error?: string;
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
  const data = await requireCorporateDashboardData(user.id, "/corporate/funding");
  const canManageFunding = data.capabilities.canManageFunding;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Funding utilization</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Finance review and disbursement schedule</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Track committed funding, milestone payments, budget variance, invoice evidence, and approvals before the next tranche is released.
          </p>
        </div>
        <ButtonLink href="/corporate/reports" tone="secondary">
          <FileBadge size={18} aria-hidden="true" />
          Export Financial Report
        </ButtonLink>
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Budget utilization updated.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Budget update could not be saved with the current input or permission.</p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Committed", value: formatCurrency(data.financials.committedFunding), icon: CircleDollarSign },
          { label: "Disbursed", value: formatCurrency(data.financials.fundsDisbursed), icon: FileBadge },
          { label: "Verified utilization", value: formatCurrency(data.financials.verifiedUtilization), icon: ShieldCheck },
          { label: "Pending verification", value: formatCurrency(data.financials.pendingVerification), icon: AlertTriangle }
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon size={22} aria-hidden="true" className="text-coral-500" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Budget actions</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Update allocation and verified utilization</h2>
        {canManageFunding ? (
          <form action={updateCorporateBudgetAction} className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Category
              <select name="category" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                {data.budgetVariance.map((budget) => (
                  <option key={budget.category} value={budget.category}>
                    {budget.category}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Allocated
              <input
                name="allocatedAmount"
                type="number"
                min="1"
                step="1000000"
                placeholder="IDR"
                className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Verified spent
              <input
                name="spentAmount"
                type="number"
                min="0"
                step="1000000"
                placeholder="IDR"
                className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none"
                required
              />
            </label>
            <Button type="submit" tone="secondary" className="self-end">
              Save Budget
            </Button>
          </form>
        ) : (
          <p className="mt-5 max-w-xl rounded-xl border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-sm font-semibold leading-6 text-ocean-900/68">
            Your corporate role can review funding utilization, but cannot change allocation or verified spend.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Funding flow</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Committed to verified</h2>
          <div className="mt-5 grid gap-4">
            {data.fundingFlow.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-ocean-900">{step.label}</span>
                  <span className="font-bold text-ocean-900/62">{formatCurrency(step.value)}</span>
                </div>
                <ProgressMeter value={step.percent} label={`${step.label} funding flow`} className="mt-2 h-2" indicatorClassName="bg-ocean-700" trackClassName="bg-ocean-50" />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Approval queue</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Variance and milestone decisions</h2>
          <div className="mt-5 grid gap-3">
            {data.fundingApprovalQueue.map((item) => (
              <div key={`${item.title}-${item.action}`} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
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
              <div className="rounded-xl border border-kelp-500/20 bg-kelp-100/55 p-4">
                <p className="font-bold text-kelp-700">No funding approvals waiting</p>
                <p className="mt-1 text-sm text-kelp-700/72">Budget variance and project milestones are within current tolerances.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Budget vs actual</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Category variance</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-ocean-900/46">
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Category</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Planned</th>
                <th className="border-b border-ocean-900/10 pb-3 pr-4">Actual</th>
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

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Disbursement schedule</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Milestone payments and evidence requirements</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.fundingSchedule.map((schedule) => (
            <article key={schedule.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
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
                <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-ocean-900">Amount {formatCurrency(schedule.amount)}</p>
                <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-ocean-900">Disbursed {formatCurrency(schedule.disbursed)}</p>
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
