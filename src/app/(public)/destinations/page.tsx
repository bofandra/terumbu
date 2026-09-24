import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, MapPinned } from "lucide-react";

import { destinationProfiles } from "@/lib/destinations";

export const metadata: Metadata = {
  title: "Conservation Destinations in Indonesia",
  description: "Explore conservation travel destinations across Indonesia and find verified Terumbu.eco expeditions linked to real field impact."
};

export default function DestinationsPage() {
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
            Start with place, then compare expeditions, conservation focus, travel logistics, and verified field activity.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-2">
        {destinationProfiles.map((destination) => (
          <Link key={destination.slug} href={`/destinations/${destination.slug}`} className="group rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-kelp-500">
            <Compass className="text-kelp-500" aria-hidden="true" />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{destination.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-ocean-900">{destination.name}</h2>
            <p className="mt-3 text-sm leading-6 text-ocean-900/64">{destination.summary}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-kelp-700">
              Explore destination <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
