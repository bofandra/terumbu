import { AlertTriangle, Building2, Download, Leaf, TrendingUp, Users } from "lucide-react";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData, getImpactMapSites } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Dashboard"
};

export const dynamic = "force-dynamic";

export default async function CorporateDashboardPage() {
  const user = await requireUser("/corporate/dashboard");
  const [data, sites] = await Promise.all([getCorporateDashboardData(user.id), getImpactMapSites()]);

  if (!data) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-normal text-ocean-900">Corporate program not configured</h1>
      </main>
    );
  }

  const metrics = [
    { label: "Program budget used", value: `${data.metrics.budgetUsed}%`, icon: TrendingUp },
    { label: "Employees engaged", value: String(data.metrics.employeesEngaged), icon: Users },
    { label: "Verified outputs", value: String(data.metrics.verifiedOutputs), icon: Leaf },
    { label: "At-risk projects", value: String(data.metrics.atRiskProjects), icon: AlertTriangle }
  ];

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-5 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-coral-700">
            <Building2 size={18} aria-hidden="true" />
            {data.program.accountName}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900 sm:text-4xl">
            {data.program.programName}
          </h1>
          <p className="mt-2 text-ocean-900/62">
            {data.program.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} to{" "}
            {data.program.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
          </p>
        </div>
        <Button type="button" tone="secondary">
          <Download size={18} aria-hidden="true" />
          Export Report
        </Button>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon className="text-coral-500" size={22} aria-hidden="true" />
              <p className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-6">
        <ImpactMapPreview sites={sites} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Budget</h2>
          <div className="mt-5 grid gap-3">
            {data.budgets.map((budget) => (
              <div key={budget.category} className="rounded-xl bg-sand-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-ocean-900">{budget.category}</p>
                  <p className="text-sm font-bold text-coral-700">{formatCurrency(Number(budget.spentAmount))}</p>
                </div>
                <p className="mt-1 text-sm text-ocean-900/58">Allocated {formatCurrency(Number(budget.allocatedAmount))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Project portfolio</h2>
          <div className="mt-5 grid gap-3">
            {data.portfolio.map((project) => (
              <div key={project.campaignTitle} className="rounded-xl bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{project.campaignTitle}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{project.region}</p>
                <p className="mt-3 text-sm font-bold text-kelp-700">
                  {formatCurrency(Number(project.allocationAmount))} · {project.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Evidence center</h2>
          <div className="mt-5 grid gap-3">
            {data.evidence.map((item) => (
              <div key={item.title} className="rounded-xl bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{item.title}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{item.evidenceType}</p>
                <p className="mt-3 text-sm font-bold text-kelp-700">{item.verificationStatus}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Report exports</h2>
          <div className="mt-5 grid gap-3">
            {data.exports.map((item) => (
              <div key={item.exportCode} className="rounded-xl bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{item.exportCode}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                <p className="mt-3 text-sm font-bold text-kelp-700">{item.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
