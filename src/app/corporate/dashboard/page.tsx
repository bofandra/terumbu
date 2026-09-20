import { CircleDollarSign, Compass, FolderHeart, Users } from "lucide-react";
import Link from "next/link";

import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { getCorporateExpeditionActivities } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Portal"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-";
}

export default async function CorporateDashboardPage() {
  const user = await requireUser("/corporate");
  const data = await requireCorporateDashboardData(user.id, "/corporate");
  const expeditionActivities = await getCorporateExpeditionActivities(user.id, data.program.programId);
  const donationTotal = data.contributions.filter((item) => item.status !== "cancelled").reduce((total, item) => total + item.amountValue, 0);
  const verifiedEvidence = data.evidence.filter((item) => item.verificationStatus === "verified").length;

  const metrics = [
    { label: "Donations", value: formatCurrency(donationTotal), icon: CircleDollarSign },
    { label: "Projects supported", value: new Set(data.contributions.map((item) => item.campaignId)).size.toLocaleString("id-ID"), icon: FolderHeart },
    { label: "Expeditions", value: expeditionActivities.length.toLocaleString("id-ID"), icon: Compass },
    { label: "Employees", value: data.employees.length.toLocaleString("id-ID"), icon: Users }
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Corporate</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900 sm:text-3xl">Overview</h1>
        <p className="mt-2 text-sm font-semibold text-ocean-900/62">{data.program.programName} · {formatDate(data.program.startsAt)} - {formatDate(data.program.endsAt)}</p>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4" aria-label="Corporate summary">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft"><Icon className="size-5 text-ocean-700" aria-hidden="true" /><p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p><MetricValue className="mt-2 text-ocean-900">{metric.value}</MetricValue></article>;
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold tracking-normal text-ocean-900">Donations</h2><p className="mt-1 text-sm text-ocean-900/58">{verifiedEvidence.toLocaleString("id-ID")} verified evidence record{verifiedEvidence === 1 ? "" : "s"}</p></div><Link href="/corporate/donations" className="text-sm font-bold text-coral-700">Open</Link></div>
          <div className="mt-4 divide-y divide-ocean-900/10">
            {data.contributions.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-bold text-ocean-900">{item.campaignTitle}</p><p className="mt-1 text-xs text-ocean-900/52">{formatDate(item.contributionDate)}</p></div><p className="font-bold text-ocean-900">{formatCurrency(item.amountValue, item.currency)}</p></div>)}
            {data.contributions.length === 0 ? <p className="py-4 text-sm font-semibold text-ocean-900/58">No donations yet.</p> : null}
          </div>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold tracking-normal text-ocean-900">Expeditions</h2><p className="mt-1 text-sm text-ocean-900/58">Corporate-attributed bookings only.</p></div><Link href="/corporate/expeditions" className="text-sm font-bold text-coral-700">Open</Link></div>
          <div className="mt-4 divide-y divide-ocean-900/10">
            {expeditionActivities.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-bold text-ocean-900">{item.expeditionTitle}</p><p className="mt-1 text-xs text-ocean-900/52">{formatDate(item.startsAt)} · {item.contactName}</p></div><p className="text-sm font-bold text-ocean-900">{item.participantsCount} pax</p></div>)}
            {expeditionActivities.length === 0 ? <p className="py-4 text-sm font-semibold text-ocean-900/58">No corporate expedition activity yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
