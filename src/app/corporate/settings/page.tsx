import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Corporate Settings"
};

export const dynamic = "force-dynamic";

export default async function CorporateSettingsPage() {
  const user = await requireUser("/corporate/settings");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <CorporateEmptyState />;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Settings</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.accountName}</h1>
      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Workspace access</h2>
        <p className="mt-2 text-sm leading-6 text-ocean-900/62">
          Access is controlled by corporate permissions and employee records. Team invitation and role editing workflows should be managed from the admin portal next.
        </p>
      </section>
    </main>
  );
}
