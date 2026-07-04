import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Programs"
};

export const dynamic = "force-dynamic";

export default async function CorporateProgramsPage() {
  const user = await requireUser("/corporate/programs");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <CorporateEmptyState />;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{data.program.accountName}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.programName}</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/56">Program budget</p>
          <p className="mt-3 text-2xl font-bold text-ocean-900">{formatCurrency(Number(data.program.budgetAmount))}</p>
        </div>
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/56">Start</p>
          <p className="mt-3 text-2xl font-bold text-ocean-900">{data.program.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
        </div>
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/56">End</p>
          <p className="mt-3 text-2xl font-bold text-ocean-900">{data.program.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
        </div>
      </section>
    </main>
  );
}
