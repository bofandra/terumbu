import { Award, Heart, MapPinned, Waves } from "lucide-react";
import Link from "next/link";

import { DashboardImpactTrend } from "@/components/dashboard-impact-trend";
import { DashboardPersonalImpactMap } from "@/components/dashboard-personal-impact-map";
import { PassportPreview } from "@/components/passport-preview";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "My Impact"
};

export const dynamic = "force-dynamic";

function formatShortDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardImpactPage() {
  const user = await requireUser("/dashboard/impact");
  const data = await getDashboardData(user.id);
  const summary = [
    { label: "Total donated", value: formatCurrency(data.summary.totalDonated), icon: Heart },
    { label: "Corals sponsored", value: data.summary.coralFragments.toLocaleString("id-ID"), icon: Waves },
    { label: "Field activities", value: String(data.summary.fieldActivities), icon: MapPinned },
    { label: "Certificates", value: String(data.summary.certificates), icon: Award }
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My Impact</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Your conservation footprint</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Personal locations, evidence, learning, and contribution history are shown as approximate zones.
          </p>
        </div>
        <Link href="/dashboard/passport" className="inline-flex min-h-11 items-center rounded-full bg-ocean-900 px-5 text-sm font-bold text-white">
          View Impact Passport
        </Link>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon className="text-coral-500" size={22} aria-hidden="true" />
              <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6">
        <DashboardPersonalImpactMap sites={data.personalMapSites} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardImpactTrend trend={data.trend} />
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact timeline</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Unified activity</h2>
          <ol className="mt-5 space-y-4">
            {data.timelineItems.slice(0, 6).map((item) => (
              <li key={item.id} className="grid grid-cols-[84px_1fr] gap-3">
                <time className="text-xs font-bold text-ocean-900/52">{formatShortDate(item.occurredAt)}</time>
                <Link href={item.href} className="border-l-2 border-ocean-100 pl-4">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{item.category}</span>
                  <span className="mt-1 block font-bold text-ocean-900">{item.title}</span>
                  <span className="mt-1 block text-sm text-ocean-900/58">{item.description}</span>
                </Link>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="mt-6">{data.passportPreview ? <PassportPreview passport={data.passportPreview} /> : null}</section>
    </main>
  );
}
