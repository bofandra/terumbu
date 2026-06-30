import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Home,
  Info,
  Languages,
  LifeBuoy,
  MapPin,
  ShieldCheck,
  Star,
  Users,
  Waves,
  XCircle
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExpeditionBookingCard, ExpeditionMobileBookingBar } from "@/components/expedition-booking-card";
import { ExpeditionHeroGallery } from "@/components/expedition-hero-gallery";
import { ExpeditionSectionTabs } from "@/components/expedition-section-tabs";
import { ExpeditionCard } from "@/components/expedition-card";
import { ButtonLink } from "@/components/ui/button";
import { getExpeditionDetail } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "impact", label: "Impact" },
  { id: "itinerary", label: "Itinerary" },
  { id: "dates", label: "Dates" },
  { id: "stay", label: "Stay" },
  { id: "reviews", label: "Reviews" },
  { id: "faq", label: "FAQ" }
];

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function percentAmount(price: number, percent: number) {
  return Math.round((price * percent) / 100);
}

export default async function ExpeditionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const expedition = await getExpeditionDetail(slug);

  if (!expedition) {
    notFound();
  }

  const bookingProps = {
    slug: expedition.slug,
    price: expedition.price,
    equipmentRental: expedition.priceBreakdown.equipmentRental,
    platformFee: expedition.priceBreakdown.platformFee,
    departures: expedition.departures,
    conservationContribution: expedition.impact.conservationContribution
  };
  const primaryDeparture = expedition.primaryDeparture;
  const routeSite = expedition.route.sites[0];

  return (
    <>
      <main className="bg-sand-50">
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/56" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-coral-700">Home</Link>
              <span>/</span>
              <Link href="/expeditions" className="hover:text-coral-700">Expeditions</Link>
              <span>/</span>
              <Link href={`/expeditions?region=${encodeURIComponent(expedition.region)}`} className="hover:text-coral-700">{expedition.region}</Link>
              <span>/</span>
              <span className="text-ocean-900">{expedition.title}</span>
            </nav>
          </div>

          <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <ExpeditionHeroGallery images={expedition.galleryImages} region={expedition.region} />

            <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
              <section className="flex flex-col justify-center">
                <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-coral-700">
                  <Waves size={18} aria-hidden="true" />
                  Coral Restoration Expedition
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">{expedition.title}</h1>
                <p className="mt-4 text-lg leading-8 text-ocean-900/68">{expedition.summary}</p>

                <div className="mt-6 grid gap-3 text-sm font-semibold text-ocean-900/72">
                  <span className="flex items-center gap-2">
                    <Star size={17} aria-hidden="true" className="fill-coral-500 text-coral-500" />
                    {expedition.rating} · {expedition.reviewCount} verified reviews · {expedition.participantCount} participants
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin size={17} aria-hidden="true" />
                    {expedition.region}
                  </span>
                  <span className="flex items-center gap-2">
                    <CalendarDays size={17} aria-hidden="true" />
                    {expedition.duration}
                  </span>
                  <span className="flex items-center gap-2">
                    <Activity size={17} aria-hidden="true" />
                    {expedition.difficulty}
                    <span className="text-ocean-900/44">Boat travel, snorkeling, and outdoor field conditions.</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Users size={17} aria-hidden="true" />
                    {expedition.groupSizeLabel}
                  </span>
                  <span className="flex items-center gap-2">
                    <Languages size={17} aria-hidden="true" />
                    {expedition.languages.join(", ")}
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-ocean-900 text-white">
                      <Home size={22} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-bold text-ocean-900">
                        Hosted by Terumbu.eco{expedition.partner ? ` and ${expedition.partner}` : ""}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-kelp-700">
                        <BadgeCheck size={16} aria-hidden="true" />
                        {expedition.verification} Expedition Partner
                      </p>
                      {expedition.partnerSlug ? (
                        <Link href={`/partners/${expedition.partnerSlug}`} className="mt-2 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
                          View partner profile <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <ExpeditionBookingCard {...bookingProps} anchorId="booking" />
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <div className="grid gap-3 rounded-2xl border border-ocean-900/10 bg-white p-4 shadow-soft md:grid-cols-3 xl:grid-cols-6">
              {expedition.quickFacts.map((fact) => (
                <div key={fact.label} className="flex items-center gap-3 border-ocean-900/10 md:border-r md:last:border-r-0 xl:border-r">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ocean-50 text-coral-700">
                    <CheckCircle2 size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ocean-900">{fact.value}</p>
                    <p className="text-xs font-semibold text-ocean-900/52">{fact.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ExpeditionSectionTabs tabs={tabs} />

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div className="grid gap-8">
            <section id="overview" className="scroll-mt-32 grid gap-6 lg:grid-cols-[0.85fr_1fr]">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Experience overview</p>
                <h2 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">A Conservation Journey, Not Just a Holiday</h2>
                <p className="mt-4 text-sm leading-7 text-ocean-900/68">
                  This expedition blends adventure and purpose. You will explore Raja Ampat&apos;s seascapes, learn from local conservation experts, and contribute to active coral restoration projects.
                </p>
                <p className="mt-3 text-sm leading-7 text-ocean-900/68">
                  Participants support field teams through supervised preparation, documentation, and learning activities. The work is designed to help, not replace trained restoration practitioners.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Explore", "Discover pristine lagoons, islands, and vibrant marine life."],
                    ["Contribute", "Assist with supervised restoration, monitoring, and cleanups."],
                    ["Learn", "Gain knowledge from marine professionals and local teams."]
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-xl bg-sand-50 p-4">
                      <p className="font-bold text-ocean-900">{title}</p>
                      <p className="mt-2 text-xs leading-5 text-ocean-900/60">{body}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Experience highlights</p>
                <div className="mt-5 grid gap-3">
                  {expedition.highlights.map((highlight) => (
                    <div key={highlight.title} className="flex items-start justify-between gap-3 rounded-xl bg-sand-50 p-4">
                      <p className="text-sm font-bold text-ocean-900">{highlight.title}</p>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900/62">{highlight.status}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 rounded-xl bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Impact recorded in your Passport after completion.</p>
              </article>
            </section>

            <section id="impact" className="scroll-mt-32 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Conservation impact</p>
                <h2 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">How This Expedition Creates Impact</h2>
                <p className="mt-3 text-sm leading-7 text-ocean-900/68">
                  {formatCurrency(expedition.impact.conservationContribution)} from each booking directly supports the associated conservation program.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {expedition.impact.targets.map((target) => (
                    <div key={target.label} className="rounded-xl bg-sand-50 p-4">
                      <p className="text-2xl font-bold text-kelp-700">{target.value}</p>
                      <p className="mt-1 text-sm font-semibold text-ocean-900/62">{target.label}</p>
                    </div>
                  ))}
                </div>
                <details className="mt-5 rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-ocean-900">How impact is calculated</summary>
                  <p className="mt-3 text-sm leading-6 text-ocean-900/62">
                    Estimates use booking allocation, unit-cost assumptions from the related campaign, a monitoring period of one field cycle, and partner evidence records. Last methodology update: {expedition.impact.methodologyUpdatedAt}.
                  </p>
                </details>
              </article>

              <div className="grid gap-6">
                <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact allocation</p>
                  <div className="mt-5 grid gap-3">
                    {expedition.impact.allocation.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between gap-3 text-sm font-bold text-ocean-900">
                          <span>{item.label}</span>
                          <span>{item.percent}% · {formatCurrency(percentAmount(expedition.price, item.percent))}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ocean-50">
                          <div className="h-full rounded-full bg-kelp-500" style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {expedition.associatedCampaign ? (
                  <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                    <div className="grid gap-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                      <div className="relative h-28 overflow-hidden rounded-xl bg-ocean-900">
                        {expedition.associatedCampaign.imageUrl ? (
                          <Image src={expedition.associatedCampaign.imageUrl} alt={`${expedition.associatedCampaign.title} campaign`} fill className="object-cover" sizes="120px" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-kelp-700">{expedition.associatedCampaign.verification}</p>
                        <h3 className="mt-1 font-bold text-ocean-900">{expedition.associatedCampaign.title}</h3>
                        <p className="mt-2 text-sm text-ocean-900/62">{expedition.associatedCampaign.progress}% funded · {expedition.associatedCampaign.impact}</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ocean-50">
                          <div className="h-full rounded-full bg-kelp-500" style={{ width: `${expedition.associatedCampaign.progress}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <ButtonLink href={`/campaigns/${expedition.associatedCampaign.slug}`} tone="secondary">View Campaign</ButtonLink>
                        <ButtonLink href={`/checkout/donation?campaign=${expedition.associatedCampaign.slug}`} tone="light">Donate</ButtonLink>
                      </div>
                    </div>
                  </article>
                ) : null}
              </div>
            </section>

            <section id="itinerary" className="scroll-mt-32 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Detailed itinerary</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Four days in the field</h2>
              <div className="mt-6 grid gap-4">
                {expedition.itinerary.map((day) => (
                  <details key={day.day} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5" open={day.day === "Day 1"}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-sm font-bold text-coral-700">{day.day}</p>
                          <h3 className="mt-1 text-xl font-bold text-ocean-900">{day.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-bold text-ocean-900/60">
                          <span className="rounded-full bg-white px-3 py-1">{day.meals}</span>
                          <span className="rounded-full bg-white px-3 py-1">{day.physicalLevel}</span>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {day.activities.map((activity, index) => (
                        <div key={activity} className="rounded-xl bg-white p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/46">Activity {index + 1}</p>
                          <p className="mt-2 font-bold text-ocean-900">{activity}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
              <p className="mt-5 rounded-xl bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
                Itinerary may change because of weather, sea conditions, conservation priorities, or safety considerations.
              </p>
            </section>

            <section id="dates" className="scroll-mt-32 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Dates and availability</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Upcoming departures</h2>
                </div>
                <ButtonLink href={`mailto:support@terumbu.eco?subject=Private departure for ${encodeURIComponent(expedition.title)}`} tone="light">
                  Request private departure
                </ButtonLink>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {expedition.departures.length > 0 ? (
                  expedition.departures.map((departure) => (
                    <article key={departure.id} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">{departure.dateRangeLabel}</p>
                      <h3 className="mt-3 text-xl font-bold tracking-normal text-ocean-900">
                        {departure.availableSeats} of {departure.capacity} places remaining
                      </h3>
                      <p className="mt-2 text-sm text-ocean-900/62">Trip leader: {departure.guide ?? "Field team leader"}</p>
                      <p className="mt-1 text-sm text-ocean-900/62">Meeting point: {departure.meetingPoint ?? expedition.region}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", departure.availableSeats <= 4 ? "bg-coral-100 text-coral-700" : "bg-kelp-100 text-kelp-700")}>
                          {departure.statusLabel}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900/62">
                          Minimum {departure.minParticipants} participants
                        </span>
                      </div>
                      <ButtonLink href={`/checkout/expedition?departure=${departure.id}`} tone="secondary" className="mt-5">
                        Select Date
                      </ButtonLink>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-ocean-900/16 bg-sand-50 p-6 md:col-span-2">
                    <p className="font-bold text-ocean-900">No public departures are currently scheduled.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ButtonLink href="mailto:support@terumbu.eco?subject=Join expedition waitlist">Join Waitlist</ButtonLink>
                      <ButtonLink href="/expeditions" tone="light">View Similar Expeditions</ButtonLink>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">What is included</p>
                <div className="mt-5 grid gap-3">
                  {expedition.included.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/70">
                      <CheckCircle2 size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-kelp-500" />
                      {item}
                    </p>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Not included</p>
                <div className="mt-5 grid gap-3">
                  {expedition.notIncluded.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/70">
                      <XCircle size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-coral-500" />
                      {item}
                    </p>
                  ))}
                </div>
              </article>
            </section>

            <section id="stay" className="scroll-mt-32 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Location and route</p>
                <h2 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Route without exposing sensitive reef coordinates</h2>
                <div className="mt-5 rounded-2xl border border-ocean-900/10 bg-ocean-900 p-4 text-white">
                  <div className="relative h-64 overflow-hidden rounded-xl">
                    <iframe
                      title="OpenStreetMap route preview for Raja Ampat expedition"
                      className="absolute inset-0 h-full w-full border-0 opacity-75"
                      loading="lazy"
                      src="https://www.openstreetmap.org/export/embed.html?bbox=130.2%2C-0.7%2C131%2C0.2&layer=mapnik"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,52,63,0.52),rgba(24,143,138,0.22))]" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white/78">Precise restoration-site coordinates are hidden to protect the ecosystem.</p>
                </div>
                <div className="mt-5 grid gap-3">
                  {expedition.route.steps.map((step, index) => (
                    <p key={step} className="flex items-center gap-3 text-sm font-bold text-ocean-900">
                      <span className="flex size-8 items-center justify-center rounded-full bg-coral-500 text-xs text-white">{index + 1}</span>
                      {step}
                    </p>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Accommodation and meals</p>
                <h2 className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{expedition.accommodation.name}</h2>
                <p className="mt-2 text-sm font-bold text-kelp-700">{expedition.accommodation.type}</p>
                <div className="mt-5 grid gap-3">
                  {expedition.accommodation.details.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/68">
                      <CheckCircle2 size={17} aria-hidden="true" className="mt-0.5 text-kelp-500" />
                      {item}
                    </p>
                  ))}
                </div>
                <p className="mt-5 rounded-xl bg-sand-50 p-4 text-sm leading-6 text-ocean-900/62">
                  Three breakfasts, three lunches, and three dinners are included. Vegetarian and halal-friendly meals can be requested; allergy-safe preparation cannot be guaranteed.
                </p>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Participant suitability</p>
                <h2 className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">Is this expedition right for you?</h2>
                <div className="mt-5 grid gap-3">
                  {expedition.requirements.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/68">
                      <Info size={17} aria-hidden="true" className="mt-0.5 text-coral-500" />
                      {item}
                    </p>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Health and safety</p>
                <h2 className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">Field safety standards</h2>
                <div className="mt-5 grid gap-3">
                  {expedition.safety.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/68">
                      <LifeBuoy size={17} aria-hidden="true" className="mt-0.5 text-kelp-500" />
                      {item}
                    </p>
                  ))}
                </div>
                <details className="mt-5 rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-ocean-900">View Emergency and Evacuation Plan</summary>
                  <p className="mt-3 text-sm leading-6 text-ocean-900/62">A public summary is provided during briefing. Sensitive operational details are shared only with confirmed participants.</p>
                </details>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Field team and partner</p>
                <div className="mt-5 grid gap-3">
                  {expedition.team.map((member) => (
                    <div key={member.name} className="rounded-xl bg-sand-50 p-4">
                      <p className="font-bold text-ocean-900">{member.name}</p>
                      <p className="mt-1 text-sm font-bold text-coral-700">{member.role}</p>
                      <p className="mt-2 text-sm leading-6 text-ocean-900/62">{member.detail}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Prepare for your expedition</p>
                {expedition.preparationCourse ? (
                  <div className="mt-5 grid gap-4">
                    <div className="relative h-44 overflow-hidden rounded-2xl bg-ocean-900">
                      {expedition.preparationCourse.imageUrl ? (
                        <Image src={expedition.preparationCourse.imageUrl} alt={`${expedition.preparationCourse.title} course`} fill className="object-cover" sizes="(min-width: 1024px) 360px, 100vw" />
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-ocean-900">{expedition.preparationCourse.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ocean-900/62">{expedition.preparationCourse.summary}</p>
                      <Link href={`/academy/courses/${expedition.preparationCourse.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-coral-700">
                        Preview Course <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ) : null}
              </article>
            </section>

            <section className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">How we travel responsibly</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {expedition.sustainability.map((item) => (
                  <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/68">
                    <ShieldCheck size={17} aria-hidden="true" className="mt-0.5 text-kelp-500" />
                    {item}
                  </p>
                ))}
              </div>
              <Link href="/terms" className="mt-5 inline-flex text-sm font-bold text-coral-700">Read Participant Code of Conduct</Link>
            </section>

            <section id="reviews" className="scroll-mt-32 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Verified reviews</p>
                <p className="mt-4 text-5xl font-bold text-ocean-900">{expedition.rating}</p>
                <p className="mt-2 text-sm font-semibold text-ocean-900/62">{expedition.reviewCount} verified participant reviews</p>
                <div className="mt-5 grid gap-2 text-sm font-semibold text-ocean-900/64">
                  {["Conservation experience", "Field-team quality", "Safety", "Accommodation", "Value"].map((item) => (
                    <span key={item} className="flex items-center justify-between">
                      {item}
                      <span className="text-kelp-700">Excellent</span>
                    </span>
                  ))}
                </div>
              </article>
              <div className="grid gap-4">
                {expedition.reviews.map((review) => (
                  <article key={`${review.name}-${review.date}`} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-ocean-900">{review.name}</p>
                        <p className="mt-1 text-xs font-semibold text-ocean-900/52">{review.joinedAs} · {review.date}</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">
                        <Star size={13} aria-hidden="true" className="fill-kelp-500" />
                        {review.rating}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-ocean-900/68">{review.body}</p>
                    <p className="mt-3 text-xs font-bold text-ocean-900/48">Verified participant review. Moderated for privacy and relevance, not for negative opinions.</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Trip updates</p>
                <div className="mt-5 grid gap-3">
                  {expedition.tripUpdates.map((update) => (
                    <div key={update.title} className="rounded-xl bg-sand-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/46">{formatDate(update.date)}</p>
                      <p className="mt-2 font-bold text-ocean-900">{update.title}</p>
                      <p className="mt-2 text-sm leading-6 text-ocean-900/62">{update.body}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Cancellation policy</p>
                <div className="mt-5 grid gap-3">
                  {expedition.cancellationPolicy.map((item) => (
                    <div key={item.label} className="flex justify-between gap-3 rounded-xl bg-sand-50 p-4 text-sm">
                      <span className="font-semibold text-ocean-900/68">{item.label}</span>
                      <span className="font-bold text-ocean-900">{item.refund}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section id="faq" className="scroll-mt-32 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">FAQ</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Before you book</h2>
              <div className="mt-6 grid gap-3">
                {expedition.faqs.map(([question, answer]) => (
                  <details key={question} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                    <summary className="cursor-pointer font-bold text-ocean-900">{question}</summary>
                    <p className="mt-3 text-sm leading-6 text-ocean-900/62">{answer}</p>
                  </details>
                ))}
              </div>
            </section>

            {expedition.relatedExpeditions.length > 0 ? (
              <section className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Related expeditions</p>
                <div className="mt-5 grid gap-5">
                  {expedition.relatedExpeditions.map((item) => (
                    <ExpeditionCard key={item.slug} expedition={item} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl bg-ocean-900 p-8 text-white shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Final call</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal">Join the Raja Ampat Restoration Journey</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
                Learn from local conservation teams, contribute to active reef-restoration work, and bring the experience into your Impact Passport.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={primaryDeparture ? `/checkout/expedition?departure=${primaryDeparture.id}` : `/checkout/expedition?expedition=${expedition.slug}`}>Check Available Dates</ButtonLink>
                <ButtonLink href={`mailto:support@terumbu.eco?subject=Question about ${encodeURIComponent(expedition.title)}`} tone="light">Ask the Expedition Team</ButtonLink>
              </div>
            </section>
          </div>

          <aside className="hidden lg:block">
            <div className="grid gap-5">
              <ExpeditionBookingCard {...bookingProps} />
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Route privacy</p>
                <p className="mt-3 text-sm leading-6 text-ocean-900/62">Exact restoration coordinates are hidden. Public maps show approximate zones and travel sequence only.</p>
                {routeSite ? (
                  <p className="mt-3 rounded-xl bg-sand-50 p-3 text-sm font-semibold text-ocean-900/68">
                    Related site: {routeSite.name}, {routeSite.region}
                  </p>
                ) : null}
              </article>
              <article className="rounded-2xl border border-coral-500/20 bg-coral-100 p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={21} aria-hidden="true" className="mt-0.5 text-coral-700" />
                  <div>
                    <p className="font-bold text-coral-700">Weather advisory</p>
                    <p className="mt-2 text-sm leading-6 text-coral-700/78">Boat schedules may shift for sea conditions. Confirmed participants receive operational updates before departure.</p>
                  </div>
                </div>
              </article>
            </div>
          </aside>
        </div>
      </main>

      <ExpeditionMobileBookingBar {...bookingProps} />
    </>
  );
}
