import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Check, Compass, MapPinned, Navigation, ShieldCheck } from "lucide-react";

import { AnalyticsEvent } from "@/components/analytics-event";
import { ExpeditionCard } from "@/components/expedition-card";
import { JsonLd } from "@/components/json-ld";
import { destinationMonthLabels } from "@/lib/destination-content";
import { getExpeditionCards, getPublishedDestinationBySlug } from "@/lib/queries";
import { getPreferredDisplayCurrency, getPreferredLocale, localeTag } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getPublishedDestinationBySlug(slug);

  if (!destination) return {};

  const title = destination.headline;
  const description = destination.summary;

  return {
    title,
    description,
    alternates: { canonical: `/destinations/${destination.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/destinations/${destination.slug}`,
      images: destination.heroImageUrl ? [{ url: destination.heroImageUrl }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: destination.heroImageUrl ? [destination.heroImageUrl] : undefined
    }
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getPublishedDestinationBySlug(slug);

  if (!destination) notFound();

  const [expeditions, locale, displayCurrency] = await Promise.all([
    getExpeditionCards({ destinationId: destination.id }),
    getPreferredLocale(),
    getPreferredDisplayCurrency()
  ]);
  const localeName = localeTag(locale);
  const bestMonths = destinationMonthLabels(destination.bestMonths);
  const destinationPath = `/destinations/${destination.slug}`;
  const destinationUrl = new URL(destinationPath, appUrl).toString();
  const destinationStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      name: destination.name,
      description: destination.summary,
      url: destinationUrl,
      image: destination.heroImageUrl ? [destination.heroImageUrl] : undefined,
      address: {
        "@type": "PostalAddress",
        addressRegion: destination.province,
        addressCountry: "ID"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
        { "@type": "ListItem", position: 2, name: "Destinations", item: new URL("/destinations", appUrl).toString() },
        { "@type": "ListItem", position: 3, name: destination.name, item: destinationUrl }
      ]
    }
  ];

  return (
    <main className="bg-sand-50">
      <AnalyticsEvent
        event="destination_view"
        properties={{
          destinationId: destination.id,
          destinationSlug: destination.slug,
          expeditionCount: destination.expeditionCount,
          impactSiteCount: destination.impactSiteCount
        }}
      />
      <JsonLd data={destinationStructuredData} />
      <section className="relative overflow-hidden border-b border-ocean-900/10 bg-white">
        {destination.heroImageUrl ? (
          <>
            <Image src={destination.heroImageUrl} alt="" fill priority unoptimized className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ocean-950/92 via-ocean-950/72 to-ocean-950/36" />
          </>
        ) : null}
        <div className={`relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 ${destination.heroImageUrl ? "text-white" : "text-ocean-900"}`}>
          <nav className={`text-sm font-bold ${destination.heroImageUrl ? "text-white/70" : "text-ocean-900/54"}`}>
            <Link href="/destinations" className="hover:text-kelp-300">Destinations</Link> / {destination.name}
          </nav>
          <p className={`mt-8 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${destination.heroImageUrl ? "bg-white/14 text-white" : "bg-kelp-100 text-kelp-700"}`}>
            <MapPinned size={16} aria-hidden="true" />
            {destination.eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-normal sm:text-6xl">{destination.headline}</h1>
          <p className={`mt-5 max-w-3xl text-lg leading-8 ${destination.heroImageUrl ? "text-white/78" : "text-ocean-900/66"}`}>{destination.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#expeditions" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-kelp-500 px-5 text-sm font-bold text-white">
              See expeditions <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/impact-map" className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-bold ${destination.heroImageUrl ? "border-white/25 bg-white/10 text-white" : "border-ocean-900/12 bg-white text-ocean-900"}`}>
              See verified impact
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
        <article className="rounded-xl border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Published expeditions</p>
          <p className="mt-2 text-2xl font-bold text-ocean-900">{destination.expeditionCount}</p>
        </article>
        <article className="rounded-xl border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Linked impact sites</p>
          <p className="mt-2 text-2xl font-bold text-ocean-900">{destination.impactSiteCount}</p>
        </article>
        <article className="rounded-xl border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Starting price</p>
          <p className="mt-2 text-2xl font-bold text-ocean-900">
            {destination.startingPrice && destination.startingCurrency
              ? formatCurrency(destination.startingPrice, destination.startingCurrency)
              : "—"}
          </p>
        </article>
        <article className="rounded-xl border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Next departure</p>
          <p className="mt-2 text-lg font-bold text-ocean-900">
            {destination.nextDeparture
              ? destination.nextDeparture.toLocaleDateString(localeName, { dateStyle: "medium" })
              : "No open departure"}
          </p>
        </article>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        {destination.conservationFocus.length > 0 ? (
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
        ) : null}

        {destination.arrivalHubs.length > 0 ? (
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <Navigation className="text-sky-700" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold text-ocean-900">Arrival hubs</h2>
            <div className="mt-5 grid gap-3">
              {destination.arrivalHubs.map((hub) => (
                <div key={`${hub.type}-${hub.name}-${hub.code}`} className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">{hub.type}</p>
                  <p className="mt-1 font-bold text-ocean-900">{hub.name}{hub.code ? ` · ${hub.code}` : ""}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {bestMonths.length > 0 ? (
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <CalendarDays className="text-coral-700" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold text-ocean-900">Managed seasonality</h2>
            <p className="mt-3 text-sm leading-6 text-ocean-900/62">Months currently maintained for this destination:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {bestMonths.map((month) => <span key={month} className="rounded-full bg-sand-100 px-3 py-1 text-sm font-bold text-ocean-900">{month}</span>)}
            </div>
          </article>
        ) : null}

        {destination.travelNotes.length > 0 || destination.responsibleTravelNotes.length > 0 ? (
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <ShieldCheck className="text-sky-700" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold text-ocean-900">Plan before you go</h2>
            <ul className="mt-5 grid gap-3">
              {[...destination.travelNotes, ...destination.responsibleTravelNotes].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-semibold text-ocean-900/68">
                  <Check size={17} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </section>

      <section id="expeditions" className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">{destination.name}</p>
            <h2 className="mt-2 text-3xl font-bold text-ocean-900">Available conservation expeditions</h2>
          </div>
          <p className="text-sm font-semibold text-ocean-900/54">{destination.impactSiteCount} linked public impact sites</p>
        </div>
        {expeditions.length > 0 ? (
          <div className="mt-7 grid gap-5">
            {expeditions.map((expedition) => (
              <ExpeditionCard key={expedition.slug} expedition={expedition} displayCurrency={displayCurrency} locale={localeName} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-ocean-900/16 bg-white p-8">
            <h3 className="text-xl font-bold text-ocean-900">No published expeditions here yet.</h3>
            <p className="mt-2 text-sm leading-6 text-ocean-900/62">Explore all expeditions while partners prepare future trips for this destination.</p>
            <Link href="/expeditions" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-kelp-700">
              Browse all expeditions <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
