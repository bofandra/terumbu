import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Compass, MapPinned, ShieldCheck } from "lucide-react";

import { ExpeditionCard } from "@/components/expedition-card";
import { destinationBySlug, destinationProfiles, expeditionMatchesDestination } from "@/lib/destinations";
import { getExpeditionCards, getImpactMapSites } from "@/lib/queries";
import { getPreferredDisplayCurrency, getPreferredLocale, localeTag } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return destinationProfiles.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const destination = destinationBySlug(slug);

  if (!destination) return {};

  const title = `${destination.name} Conservation Expeditions`;
  const description = `${destination.summary} Browse verified Terumbu.eco conservation expeditions, travel planning information, and field impact.`;

  return {
    title,
    description,
    alternates: { canonical: `/destinations/${destination.slug}` },
    openGraph: { title, description, type: "website" }
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = destinationBySlug(slug);

  if (!destination) notFound();

  const [allExpeditions, sites, locale, displayCurrency] = await Promise.all([
    getExpeditionCards(),
    getImpactMapSites(),
    getPreferredLocale(),
    getPreferredDisplayCurrency()
  ]);
  const expeditions = allExpeditions.filter((item) => expeditionMatchesDestination(item.region, destination));
  const destinationSites = sites.filter((site) => expeditionMatchesDestination(site.region, destination));
  const localeName = localeTag(locale);

  return (
    <main className="bg-sand-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="text-sm font-bold text-ocean-900/54">
            <Link href="/destinations" className="hover:text-kelp-700">Destinations</Link> / {destination.name}
          </nav>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-kelp-100 px-3 py-1 text-sm font-bold text-kelp-700">
            <MapPinned size={16} aria-hidden="true" />
            {destination.eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-normal text-ocean-900 sm:text-6xl">{destination.headline}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-ocean-900/66">{destination.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#expeditions" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-kelp-500 px-5 text-sm font-bold text-white">
              See expeditions <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/impact-map" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ocean-900/12 bg-white px-5 text-sm font-bold text-ocean-900">
              See verified impact
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <Compass className="text-kelp-500" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-ocean-900">Conservation focus</h2>
          <ul className="mt-5 grid gap-3">
            {destination.conservationFocus.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-semibold text-ocean-900/68">
                <Check size={17} className="mt-0.5 shrink-0 text-kelp-500" aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <ShieldCheck className="text-sky-700" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-ocean-900">Plan before you go</h2>
          <ul className="mt-5 grid gap-3">
            {destination.travelNotes.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-semibold text-ocean-900/68">
                <Check size={17} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section id="expeditions" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">{destination.name}</p>
            <h2 className="mt-2 text-3xl font-bold text-ocean-900">Available conservation expeditions</h2>
          </div>
          <p className="text-sm font-semibold text-ocean-900/54">{destinationSites.length} linked public impact sites</p>
        </div>
        {expeditions.length > 0 ? (
          <div className="mt-7 grid gap-5">
            {expeditions.map((expedition) => (
              <ExpeditionCard key={expedition.slug} expedition={expedition} displayCurrency={displayCurrency} locale={localeName} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-ocean-900/16 bg-white p-8">
            <h3 className="text-xl font-bold text-ocean-900">No published departures here yet.</h3>
            <p className="mt-2 text-sm leading-6 text-ocean-900/62">Explore all expeditions while verified partners prepare future dates for this destination.</p>
            <Link href="/expeditions" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-kelp-700">Browse all expeditions <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>
    </main>
  );
}
