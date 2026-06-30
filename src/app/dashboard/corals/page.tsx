import { Activity, Map, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Corals"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

export default async function DashboardCoralsPage() {
  const user = await requireUser("/dashboard/corals");
  const data = await getDashboardData(user.id);

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
          ["Linked sites", data.personalMapSites.length.toLocaleString("id-ID"), Map]
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
            {["Cards", "Map", "Health summary"].map((view, index) => (
              <span key={view} className={index === 0 ? "rounded-full bg-ocean-900 px-4 py-2 text-sm font-bold text-white" : "rounded-full bg-ocean-50 px-4 py-2 text-sm font-bold text-ocean-900"}>
                {view}
              </span>
            ))}
          </div>
        </div>

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
                    <span>Next update expected: {ecosystem.nextUpdateLabel}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-ocean-900/16 bg-sand-50 p-8 md:col-span-2 xl:col-span-3">
              <Waves size={30} aria-hidden="true" className="text-coral-500" />
              <p className="mt-4 text-xl font-bold text-ocean-900">You have not sponsored a coral yet.</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">Sponsor a coral and follow its restoration journey through field updates.</p>
              <Link href="/campaigns" className="mt-4 inline-flex text-sm font-bold text-coral-700">Explore Coral Sponsorship</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
