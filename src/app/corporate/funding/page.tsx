import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Funding"
};

export const dynamic = "force-dynamic";

export default async function CorporateFundingPage() {
  const user = await requireUser("/corporate/funding");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <CorporateEmptyState />;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Funding utilization</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.metrics.budgetUsed}% budget used</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {data.budgets.map((budget) => (
          <article key={budget.category} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">{budget.category}</h2>
              <p className="text-sm font-bold text-coral-700">{formatCurrency(Number(budget.spentAmount))}</p>
            </div>
            <p className="mt-2 text-sm text-ocean-900/58">Allocated {formatCurrency(Number(budget.allocatedAmount))}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
