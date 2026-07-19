import { Activity, BarChart3, LayoutGrid, Map as MapIcon, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DashboardPersonalImpactMap } from "@/components/dashboard-personal-impact-map";
import { ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Corals"
};

export const dynamic = "force-dynamic";

type CoralView = "cards" | "map" | "health";

type DashboardCoralsPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function normalizeView(value: string | null | undefined): CoralView {
  return value === "map" || value === "health" ? value : "cards";
}

function viewHref(view: CoralView) {
  return view === "cards" ? "/dashboard/corals" : `/dashboard/corals?view=${view}`;
}

function average(values: number[]) {
  const usableValues = values.filter((value) => Number.isFinite(value) && value > 0);

  return usableValues.length === 0 ? 0 : Math.round(usableValues.reduce((total, value) => total + value, 0) / usableValues.length);
}

export default async function DashboardCoralsPage({ searchParams }: DashboardCoralsPageProps) {
  const params = await searchParams;
  const activeView = normalizeView(params?.view);
  const user = await requireUser("/dashboard/corals");
  const data = await getDashboardData(user.id);
  const coralCampaignSlugs = new Set(data.coralCards.map((coral) => coral.campaignSlug));
  const coralMapSites = data.personalMapSites.filter((site) => coralCampaignSlugs.has(site.campaignSlug));
  const totalEvidence = data.coralCards.reduce((total, coral) => total + coral.evidenceCount, 0);
  const verifiedEvidence = data.coralCards.reduce((total, coral) => total + coral.verifiedEvidenceCount, 0);
  const averageSurvivalRate = average(data.coralCards.map((coral) => coral.survivalRate));
  const viewOptions: Array<{ key: CoralView; label: string; icon: typeof LayoutGrid }> = [
    { key: "cards", label: "Cards", icon: LayoutGrid },
    { key: "map", label: "Map", icon: MapIcon },
    { key: "health", label: "Health summary", icon: BarChart3 }
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My Corals</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Sponsored ecosystems</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            {data.summary.coralFragments.toLocaleString("id-ID")} coral fragments and {data.summary.seedlings.toLocaleString("id-ID")} mangrove seedlings linked to your account.
          </p>
        </div>
        <ButtonLink href="/campaigns">Explore Sponsorship</ButtonLink>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Healthy fragments", data.summary.healthyCorals.toLocaleString("id-ID"), Waves],
          ["Under monitoring", data.summary.monitoringCorals.toLocaleString("id-ID"), Activity],
          ["Linked sites", coralMapSites.length.toLocaleString("id-ID"), MapIcon]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <Icon size={22} aria-hidden="true" className="text-coral-500" />
            <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{value as string}</p>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{label as string}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Coral records</h2>
          <div className="flex flex-wrap gap-2">
            {viewOptions.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.key;

              return (
                <Link
                  key={view.key}
                  href={viewHref(view.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                    isActive ? "bg-ocean-900 text-white" : "bg-ocean-50 text-ocean-900 hover:bg-ocean-100"
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {view.label}
                </Link>
              );
            })}
          </div>
        </div>

        {activeView === "cards" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.coralCards.length > 0 ? (
              data.coralCards.map((ecosystem) => (
                <Link key={ecosystem.code} href={`/dashboard/corals/${ecosystem.code}`} className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-sand-50 transition hover:border-coral-500">
                  <div className="relative h-44 bg-ocean-900">
                    {ecosystem.imageUrl ? <Image src={ecosystem.imageUrl} alt={`${ecosystem.label} restoration site`} fill className="object-cover" sizes="(min-width: 1280px) 360px, 100vw" /> : null}
                    <span className="absolute bottom-3 left-3 rounded-full bg-kelp-500 px-3 py-1 text-xs font-bold text-white">{ecosystem.statusLabel}</span>
                  </div>
                  <div className="p-5">
                    <p className="text-lg font-bold text-ocean-900">{ecosystem.code}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/62">{ecosystem.label}</p>
                    <p className="mt-3 text-sm leading-6 text-ocean-900/62">{ecosystem.location}</p>
                    <div className="mt-4 grid gap-2 text-xs font-bold text-ocean-900/56">
                      <span>{ecosystem.quantity.toLocaleString("id-ID")} {ecosystem.unit}</span>
                      <span>Planted: {formatDate(ecosystem.plantedAt)}</span>
                      <span>Last monitored: {formatDate(ecosystem.lastUpdatedAt)}</span>
                      <span>{ecosystem.verifiedEvidenceCount.toLocaleString("id-ID")} verified evidence records</span>
                      <span>Next update expected: {ecosystem.nextUpdateLabel}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <CoralEmptyState />
            )}
          </div>
        ) : null}

        {activeView === "map" ? (
          <div className="mt-5">
            <DashboardPersonalImpactMap sites={coralMapSites} />
          </div>
        ) : null}

        {activeView === "health" ? (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Average survival", `${averageSurvivalRate}%`],
                ["Evidence records", totalEvidence.toLocaleString("id-ID")],
                ["Verified records", verifiedEvidence.toLocaleString("id-ID")]
              ].map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
                  <p className="text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{label}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-3">
              {data.coralCards.map((ecosystem) => (
                <Link key={ecosystem.code} href={`/dashboard/corals/${ecosystem.code}`} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5 transition hover:border-coral-500">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-lg font-bold text-ocean-900">{ecosystem.code}</p>
                      <p className="mt-1 text-sm font-semibold text-ocean-900/62">{ecosystem.label}</p>
                      <p className="mt-2 text-sm leading-6 text-ocean-900/62">{ecosystem.location}</p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">
                      {ecosystem.statusLabel}
                    </span>
                  </div>
                  <ProgressMeter value={ecosystem.survivalRate} label={`${ecosystem.code} survival rate`} className="mt-4 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-white" />
                  <div className="mt-3 grid gap-2 text-xs font-bold text-ocean-900/56 sm:grid-cols-3">
                    <span>{ecosystem.survivalRate}% survival rate</span>
                    <span>{ecosystem.verifiedEvidenceCount.toLocaleString("id-ID")} verified evidence</span>
                    <span>Last monitored: {formatDate(ecosystem.lastUpdatedAt)}</span>
                  </div>
                </Link>
              ))}
              {data.coralCards.length === 0 ? <CoralEmptyState /> : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function CoralEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-ocean-900/16 bg-sand-50 p-8 md:col-span-2 xl:col-span-3">
      <Waves size={30} aria-hidden="true" className="text-coral-500" />
      <p className="mt-4 text-xl font-bold text-ocean-900">You have not sponsored a coral yet.</p>
      <p className="mt-2 text-sm leading-6 text-ocean-900/62">Sponsor a coral and follow its restoration journey through field updates.</p>
      <Link href="/campaigns" className="mt-4 inline-flex text-sm font-bold text-coral-700">Explore Coral Sponsorship</Link>
    </div>
  );
}
