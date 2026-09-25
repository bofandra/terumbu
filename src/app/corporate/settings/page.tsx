import { Building2, Users } from "lucide-react";

import { requireCorporateAdminRole } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";

export const metadata = {
  title: "Corporate Settings"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Not set";
}

export default async function CorporateSettingsPage() {
  const user = await requireCorporateAdminRole("/corporate/settings");
  const data = await requireCorporateDashboardData(user.id, "/corporate/settings");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Corporate settings</h1>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2"><Building2 className="size-5 text-ocean-700" aria-hidden="true" /><h2 className="text-xl font-bold tracking-normal text-ocean-900">Company</h2></div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="font-bold text-ocean-900/56">Company</dt><dd className="mt-1 font-semibold text-ocean-900">{data.program.accountName}</dd></div>
            <div><dt className="font-bold text-ocean-900/56">Program</dt><dd className="mt-1 font-semibold text-ocean-900">{data.program.programName}</dd></div>
            <div><dt className="font-bold text-ocean-900/56">Period</dt><dd className="mt-1 font-semibold text-ocean-900">{formatDate(data.program.startsAt)} - {formatDate(data.program.endsAt)}</dd></div>
          </dl>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2"><Users className="size-5 text-ocean-700" aria-hidden="true" /><h2 className="text-xl font-bold tracking-normal text-ocean-900">Access</h2></div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="font-bold text-ocean-900/56">Your access</dt><dd className="mt-1 font-semibold text-ocean-900">Corporate User</dd></div>
            <div><dt className="font-bold text-ocean-900/56">Employees</dt><dd className="mt-1 font-semibold text-ocean-900">{data.employees.length.toLocaleString("id-ID")}</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}
