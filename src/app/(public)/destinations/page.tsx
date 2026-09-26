import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Compass, MapPinned, ShipWheel } from "lucide-react";

import { getPublishedDestinations } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Conservation Destinations in Indonesia",
  description: "Explore published Terumbu.eco conservation destinations backed by managed expedition and field-impact records."
};

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const destinations = await getPublishedDestinations();

  return (
    <main className="bg-sand-50">
      <section className="bg-ocean-900 px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            <MapPinned size={17} aria-hidden="true" />
            Indonesia destination guides
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-normal sm:text-6xl">Choose a destination. Leave a verified impact.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/76">
            Start with a managed destination, then compare published expeditions, upcoming departures, and linked field impact.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {destinations.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                href={`/destinations/${destination.slug}`}
                className="group overflow-hidden rounded-2xl border border-ocean-900/10 bg-white shadow-soft transition hover:-translate-y-1 hover:border-kelp-500"
              >
                {destination.heroImageUrl ? (
                  <div className="relative h-48 bg-ocean-900">
                    <Image src={destination.heroImageUrl} alt="" fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.02]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ocean-950/55 to-transparent" />
                  </div>
                ) : null}

                <div className="p-6">
                  <Compass className="text-kelp-500" aria-hidden="true" />
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{destination.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-bold text-ocean-900">{destination.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/44">
                    {destination.province} · {destination.islandGroup}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ocean-900/64">{destination.summary}</p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-sand-50 p-3">
                      <ShipWheel size={16} className="text-kelp-700" aria-hidden="true" />
                      <p className="mt-2 text-sm font-bold text-ocean-900">{destination.expeditionCount} expeditions</p>
                    </div>
                    <div className="rounded-lg bg-sand-50 p-3">
                      <MapPinned size={16} className="text-kelp-700" aria-hidden="true" />
                      <p className="mt-2 text-sm font-bold text-ocean-900">{destination.impactSiteCount} impact sites</p>
                    </div>
                    <div className="rounded-lg bg-sand-50 p-3">
                      <CalendarDays size={16} className="text-kelp-700" aria-hidden="true" />
                      <p className="mt-2 text-sm font-bold text-ocean-900">
                        {destination.startingPrice && destination.startingCurrency
                          ? `From ${formatCurrency(destination.startingPrice, destination.startingCurrency)}`
                          : destination.nextDeparture
                            ? destination.nextDeparture.toLocaleDateString("en", { month: "short", year: "numeric" })
                            : "Dates pending"}
                      </p>
                    </div>
                  </div>

                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-kelp-700">
                    Explore destination <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ocean-900/16 bg-white p-8">
            <h2 className="text-xl font-bold text-ocean-900">No destination guides are published yet.</h2>
            <p className="mt-2 text-sm leading-6 text-ocean-900/62">Browse published expeditions while destination guides are being prepared.</p>
            <Link href="/expeditions" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-kelp-700">
              Browse expeditions <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
