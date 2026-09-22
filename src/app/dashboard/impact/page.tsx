import { Award, Heart, MapPinned, Waves } from "lucide-react";
import Link from "next/link";

import { DashboardImpactTrend } from "@/components/dashboard-impact-trend";
import { DashboardPersonalImpactMap } from "@/components/dashboard-personal-impact-map";
import { PassportShareButtons } from "@/components/passport-share-buttons";
import { PassportPreview } from "@/components/passport-preview";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { publicPassportShareUrl } from "@/lib/passport-sharing";
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
  const passportUrl =
    data.profile?.publicSlug
      ? publicPassportShareUrl({
          origin: process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco",
          publicSlug: data.profile.publicSlug,
          visibility: data.profile.passportVisibility ?? "private",
          shareToken: data.profile.passportShareToken
        })
      : null;
  const summary = [
    { label: "Total donated", value: formatCurrency(data.summary.totalDonated), icon: Heart },
    { label: "Corals sponsored", value: data.summary.coralFragments.toLocaleString("id-ID"), icon: Waves },
    { label: "Carbon", value: data.summary.carbonKg > 0 ? `${data.summary.carbonKg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg CO2e` : "Pending", icon: Waves },
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
            Personal locations, field activity, learning, and contribution history are shown as approximate zones.
          </p>
          {data.profile?.passportNumber ? (
            <p className="mt-3 text-sm font-bold text-ocean-900">Passport ID: {data.profile.passportNumber}</p>
          ) : null}
        </div>
        {passportUrl ? <PassportShareButtons url={passportUrl} title={`${data.profile?.displayName ?? "My"} Terumbu.eco Impact Passport`} /> : null}
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-5">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon className="text-coral-500" size={22} aria-hidden="true" />
              <MetricValue className="mt-4 text-ocean-900">{item.value}</MetricValue>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </article>
          );
        })}
      </section>

      <section id="corals" className="mt-6 scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Sponsored ecosystems</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Your coral and mangrove records</h2>
          </div>
          {data.coralCards.length > 0 ? <span className="text-sm font-semibold text-ocean-900/54">{data.coralCards.length.toLocaleString("id-ID")} records</span> : null}
        </div>

        {data.coralCards.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {data.coralCards.map((ecosystem) => (
              <Link key={ecosystem.code} href={`/dashboard/corals/${ecosystem.code}`} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4 transition hover:border-coral-500">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-ocean-900">{ecosystem.label}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/56">{ecosystem.code}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-ocean-900">{ecosystem.quantity.toLocaleString("id-ID")} {ecosystem.unit}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ocean-900/56">
                  {ecosystem.location ? <span>{ecosystem.location}</span> : null}
                  {ecosystem.plantedAt ? <span>Planted {formatShortDate(ecosystem.plantedAt)}</span> : null}
                  {ecosystem.lastUpdatedAt ? <span>Updated {formatShortDate(ecosystem.lastUpdatedAt)}</span> : null}
                  <span>{ecosystem.verifiedEvidenceCount.toLocaleString("id-ID")} verified activity</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/58">
            Sponsored coral or mangrove records will appear here after a qualifying contribution.
          </p>
        )}
      </section>

      <section className="mt-6">
        <DashboardPersonalImpactMap sites={data.personalMapSites} fullMapHref="/impact-map" />
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
