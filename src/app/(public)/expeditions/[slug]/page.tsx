import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Home,
  Languages,
  Leaf,
  LifeBuoy,
  MessageSquareText,
  Monitor,
  MapPin,
  PlayCircle,
  Plane,
  ShieldCheck,
  Sprout,
  Star,
  Utensils,
  Users,
  Waves,
  Wifi,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExpeditionMobileBookingBar } from "@/components/expedition-booking-card";
import { ExpeditionCard } from "@/components/expedition-card";
import { ExpeditionCalendarActions } from "@/components/expedition-calendar-actions";
import { ExpeditionHeroGallery } from "@/components/expedition-hero-gallery";
import { ExpeditionShareButtons } from "@/components/expedition-share-buttons";
import { ExpeditionSectionTabs } from "@/components/expedition-section-tabs";
import { Button, ButtonLink } from "@/components/ui/button";
import { submitExpeditionInterestRequestAction } from "@/lib/expedition-interest-actions";
import {
  buildExpeditionBenefitFacts,
  buildExpeditionMonthAvailability,
  buildExpeditionOfferFacts,
  buildExpeditionSdgFacts,
  buildExpeditionStayRange,
  type ExpeditionFact
} from "@/lib/expedition-detail-view";
import { getSessionUser } from "@/lib/auth";
import { getExpeditionDetail, getExpeditionSaveState } from "@/lib/queries";
import { referralCodeForUser } from "@/lib/referrals";
import { getPreferredDisplayCurrency, getPreferredLocale, localeTag } from "@/lib/user-preferences";
import { cn, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function stars(value: number) {
  const rounded = Math.round(value);

  return Array.from({ length: 5 }, (_, index) => (
    <Star key={index} size={18} aria-hidden="true" className={cn(index < rounded ? "fill-sand-300 text-sand-300" : "fill-ocean-100 text-ocean-100")} />
  ));
}

function offerIcon(kind: string): LucideIcon {
  if (kind === "hours") return Clock;
  if (kind === "fee") return CircleDollarSign;
  if (kind.includes("farm") || kind.includes("garden")) return Sprout;
  if (kind.includes("social") || kind.includes("community")) return Users;
  if (kind.includes("monitor") || kind.includes("reef") || kind.includes("coral")) return Waves;

  return Leaf;
}

function benefitIcon(kind: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    "days-off": CalendarDays,
    stay: CalendarDays,
    accommodation: Home,
    meals: Utensils,
    internet: Wifi,
    workspace: Monitor,
    certificate: Award,
    support: LifeBuoy,
    "verified-host": ShieldCheck
  };

  return icons[kind] ?? CheckCircle2;
}

function factIconSize(value: string) {
  return value.length > 8 ? "text-3xl" : "text-5xl";
}

function FactGrid({ facts, iconFor }: { facts: ExpeditionFact[]; iconFor: (kind: string) => LucideIcon }) {
  return (
    <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map((fact) => {
        const Icon = iconFor(fact.kind);

        return (
          <div key={`${fact.kind}-${fact.label}`} className="text-center">
            <div className="flex h-14 items-center justify-center text-sky-700">
              {fact.value ? <span className={cn("font-light leading-none", factIconSize(fact.value))}>{fact.value}</span> : <Icon size={44} strokeWidth={1.7} aria-hidden="true" />}
            </div>
            <p className="mt-4 text-base font-bold text-ocean-900">{fact.label}</p>
            <p className="mx-auto mt-2 max-w-44 text-sm leading-6 text-ocean-900/58">{fact.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({ title, body, learnHref }: { title: string; body?: string; learnHref?: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal text-ocean-900 sm:text-4xl">{title}</h2>
        {body ? <p className="mt-3 max-w-3xl text-base leading-7 text-ocean-900/62">{body}</p> : null}
      </div>
      {learnHref ? (
        <Link href={learnHref} className="inline-flex shrink-0 items-center gap-2 text-base font-bold text-sky-700 hover:text-sky-800">
          Learn more
          <ArrowRight size={22} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function DetailDivider() {
  return <hr className="border-ocean-900/10" />;
}

function CheckoutLink({ departureId }: { departureId: string }) {
  return (
    <ButtonLink href={`/checkout/expedition?departure=${departureId}`} className="rounded-full">
      Select Date
      <ArrowRight size={17} aria-hidden="true" />
    </ButtonLink>
  );
}

export default async function ExpeditionDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ saved?: string; error?: string; ref?: string }>;
}) {
  const { slug } = await params;
  const [query, expedition, sessionUser, displayCurrency, locale] = await Promise.all([
    searchParams,
    getExpeditionDetail(slug),
    getSessionUser(),
    getPreferredDisplayCurrency(),
    getPreferredLocale()
  ]);

  if (!expedition) {
    notFound();
  }

  const expeditionPath = `/expeditions/${expedition.slug}`;
  const saveState = sessionUser ? await getExpeditionSaveState(sessionUser.id, expedition.slug) : null;
  const ownReferralCode = sessionUser ? referralCodeForUser(sessionUser.id) : null;
  const rawIncomingReferralCode = (query?.ref ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64) || null;
  const incomingReferralCode = rawIncomingReferralCode && rawIncomingReferralCode !== ownReferralCode ? rawIncomingReferralCode : null;
  const shareReferralCode = ownReferralCode;
  const bookingProps = {
    slug: expedition.slug,
    price: expedition.price,
    currency: expedition.currency,
    equipmentRental: expedition.priceBreakdown.equipmentRental,
    platformFee: expedition.priceBreakdown.platformFee,
    departures: expedition.departures,
    conservationContribution: expedition.impact.conservationContribution,
    trustIndicators: expedition.bookingTrustIndicators,
    questionHref: "#ask-question",
    isAuthenticated: Boolean(sessionUser),
    isSaved: saveState?.isSaved ?? false,
    expeditionPath,
    referralCode: incomingReferralCode,
    displayCurrency,
    locale: localeTag(locale)
  };
  const tabs = [
    { id: "exchange", label: "The Exchange" },
    { id: "photos", label: `Photos (${expedition.galleryImages.length})` },
    { id: "host", label: "Your Host" },
    { id: "map", label: "Map" }
  ];
  const requestNextPath = `${expeditionPath}#availability`;
  const questionNextPath = `${expeditionPath}#ask-question`;
  const offerFacts = buildExpeditionOfferFacts(expedition.marketplace);
  const benefitFacts = buildExpeditionBenefitFacts({
    marketplace: expedition.marketplace,
    durationDays: expedition.durationDays,
    included: expedition.included,
    hostVerificationLabel: expedition.hostedBy.verificationLabel
  });
  const monthAvailability = buildExpeditionMonthAvailability(expedition.departures);
  const stayRange = buildExpeditionStayRange(expedition.durationDays, expedition.marketplace.travelLengthLabel);
  const sdgFacts = buildExpeditionSdgFacts({
    tags: expedition.tags,
    sustainability: expedition.sustainability,
    impactTargets: expedition.impact.targets
  });
  const ratingLabel = expedition.reviewCount > 0
    ? `${expedition.rating.toFixed(1)} (${expedition.reviewCount} verified reviews)`
    : `${expedition.participantCount} completed participants`;
  const savedBannerMessage = query?.saved === "expedition"
    ? "Your saved expeditions were updated."
    : query?.saved === "interest-question"
    ? "Thanks, your question was sent to the expedition team."
    : query?.saved?.startsWith("interest")
      ? "Thanks, your expedition request was captured. Our team will follow up by email."
      : null;
  const errorBannerMessage = query?.error === "expedition"
    ? "We could not update that saved expedition."
    : query?.error === "interest-question-invalid"
    ? "Add your question so the expedition team knows what to answer."
    : query?.error?.startsWith("interest")
      ? "We could not save that expedition request. Add your name, email, and try again."
      : null;
  const questionSavedMessage = query?.saved === "interest-question" ? "Your question is in the website inbox for Terumbu admins and the expedition partner." : null;
  const questionErrorMessage = query?.error === "interest-question-invalid" ? "Write your question before sending." : null;
  const legacyAutoBadges = new Set(["sustainable project", "higher approval", "higher chance of approval"]);
  const heroBadges = Array.from(new Set([...expedition.marketplace.badges, ...expedition.marketplace.highlights]))
    .filter((badge) => !legacyAutoBadges.has(badge.trim().toLowerCase()))
    .slice(0, 3);
  const hostImage = expedition.associatedCampaign?.imageUrl ?? expedition.galleryImages[0]?.src;

  return (
    <>
      <main className="bg-white pb-24">
        <section className="border-b border-ocean-900/10 bg-white">
          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/54" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-sky-700">Home</Link>
              <span>/</span>
              <Link href="/expeditions" className="hover:text-sky-700">Expeditions</Link>
              <span>/</span>
              <Link href={`/expeditions?destination=${encodeURIComponent(expedition.region)}`} className="hover:text-sky-700">{expedition.region}</Link>
            </nav>
          </div>

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.98fr_1fr] lg:items-start lg:px-8">
            <ExpeditionHeroGallery images={expedition.galleryImages} region={expedition.region} />

            <div className="min-w-0 lg:pt-1">
              <p className="text-lg font-semibold text-ocean-900/72">
                {expedition.marketplace.typeLabel} &bull; {expedition.region}, Indonesia
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/58">
                <span className="flex items-center gap-1">
                  {expedition.reviewCount > 0 ? stars(expedition.rating) : <Users size={18} aria-hidden="true" className="text-ocean-900/46" />}
                </span>
                <span>{ratingLabel}</span>
                <span className="inline-flex size-6 items-center justify-center rounded-full border border-ocean-900/20 text-xs font-bold">?</span>
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.15]">{expedition.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ocean-900/64">{expedition.summary}</p>
              <div className="mt-6">
                <ExpeditionShareButtons slug={expedition.slug} title={expedition.title} referralCode={shareReferralCode} compact />
              </div>

              <div className="mt-8 grid gap-6">
                {heroBadges.map((badge, index) => {
                  const Icon = index === 0 ? Leaf : index === 1 ? BadgeCheck : Users;

                  return (
                    <div key={badge} className="grid grid-cols-[32px_minmax(0,1fr)] gap-4">
                      <Icon size={26} strokeWidth={1.8} aria-hidden="true" className={cn(index === 1 ? "text-purple-500" : "text-sky-700")} />
                      <div>
                        <p className="text-lg font-bold text-ocean-900">{badge}</p>
                        <p className="mt-1 text-base leading-7 text-ocean-900/58">
                          {badge.toLowerCase().includes("approval")
                            ? "This host has upcoming departures and is actively reviewing traveler requests."
                            : badge.toLowerCase().includes("top")
                              ? "This host keeps a strong Terumbu operating record for field experiences."
                              : "This host contributes to building a better and more sustainable future for all."}
                        </p>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </section>

        <ExpeditionSectionTabs tabs={tabs} slug={expedition.slug} isAuthenticated={Boolean(sessionUser)} isSaved={saveState?.isSaved ?? false} expeditionPath={expeditionPath} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {savedBannerMessage ? <p className="mt-8 rounded-md border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedBannerMessage}</p> : null}
          {errorBannerMessage ? <p className="mt-8 rounded-md border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorBannerMessage}</p> : null}

          <section id="exchange" className="scroll-mt-36 py-14">
            <SectionHeader title="What you offer" learnHref="#experience" />
            <FactGrid facts={offerFacts} iconFor={offerIcon} />
          </section>

          {expedition.marketplace.additionalFee ? (
            <>
              <DetailDivider />
              <section className="py-14">
                <SectionHeader title="Additional fee required" body="This host charges an additional local fee to support the sustainability of the project and the quality of the experience for travelers." />
                <div className="mt-8 grid gap-8 lg:grid-cols-[0.35fr_0.28fr_1fr]">
                  <div>
                    <p className="text-lg font-bold text-ocean-900">Amount</p>
                    <p className="mt-6 text-4xl font-light text-sky-700">
                      {formatCurrency(expedition.marketplace.additionalFee.amount, expedition.marketplace.additionalFee.currency)}
                    </p>
                    <p className="mt-2 text-base text-ocean-900/58">{expedition.marketplace.additionalFee.period}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ocean-900">Fee pays for</p>
                    <ul className="mt-5 grid gap-2 text-base leading-7 text-ocean-900/62">
                      {expedition.marketplace.additionalFee.paysFor.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span>&bull;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ocean-900">Description</p>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-ocean-900/62">{expedition.marketplace.additionalFee.description}</p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          <DetailDivider />
          <section className="py-14">
            <SectionHeader title="What you get" learnHref="#experience" />
            <FactGrid facts={benefitFacts} iconFor={benefitIcon} />
          </section>

          <DetailDivider />
          <section id="availability" tabIndex={-1} className="scroll-mt-36 py-14 outline-none">
            <SectionHeader title="Availability" />
            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_0.42fr] lg:items-start">
              <div>
                {monthAvailability.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {monthAvailability.map((month) => (
                      <div
                        key={month.key}
                        className={cn(
                          "flex min-h-16 w-28 flex-col items-center justify-center rounded-sm px-4 text-center text-white",
                          month.status === "closed" ? "bg-ocean-200 text-ocean-900/54" : month.status === "limited" ? "bg-sand-400 text-ocean-900" : "bg-kelp-500"
                        )}
                      >
                        {month.status !== "closed" ? <Check size={22} aria-hidden="true" /> : <span className="text-lg font-bold">-</span>}
                        <span className="mt-1 text-sm font-bold">{month.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-ocean-900/16 bg-ocean-50 px-4 py-5 font-bold text-ocean-900">No public months are open yet.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-lg font-bold text-ocean-900">Stay at least</p>
                  <p className="mt-4 text-4xl font-light text-ocean-900/62">{stayRange.stayAtLeast}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-ocean-900">Stay up to</p>
                  <p className="mt-4 text-4xl font-light text-ocean-900/62">{stayRange.stayUpTo}</p>
                </div>
              </div>
            </div>

            <div className="mt-10 divide-y divide-ocean-900/10 border-y border-ocean-900/10">
              {expedition.departures.length > 0 ? (
                expedition.departures.map((departure) => (
                  <article key={departure.id} className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-sky-700">{departure.dateRangeLabel}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-normal text-ocean-900">
                        {departure.availableSeats} of {departure.capacity} places remaining
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ocean-900/58">
                        <span>Trip leader: {departure.guide ?? "Field team leader"}</span>
                        <span>Meeting point: {departure.meetingPoint ?? expedition.region}</span>
                        <span>Minimum {departure.minParticipants} participants</span>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:justify-items-end">
                      <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-bold", departure.availableSeats <= 4 ? "bg-coral-100 text-coral-700" : "bg-kelp-100 text-kelp-700")}>
                        {departure.statusLabel}
                      </span>
                      {departure.status === "open" && departure.availableSeats > 0 ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                        <ExpeditionCalendarActions
                          title={expedition.title}
                          startsAt={departure.startsAt}
                          endsAt={departure.endsAt}
                          location={departure.meetingPoint ?? expedition.region}
                          description={`${expedition.summary} — Terumbu.eco conservation expedition`}
                        />
                        <CheckoutLink departureId={departure.id} />
                      </div>
                      ) : (
                        <form action={submitExpeditionInterestRequestAction} className="grid gap-2 rounded-md border border-ocean-900/10 bg-ocean-50 p-3">
                          <input type="hidden" name="next" value={requestNextPath} />
                          <input type="hidden" name="expeditionId" value={expedition.id} />
                          <input type="hidden" name="departureId" value={departure.id} />
                          <input type="hidden" name="requestType" value="waitlist" />
                          <input name="contactName" placeholder="Name" className="min-h-10 rounded-md border border-ocean-900/14 px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                          <input name="contactEmail" type="email" placeholder="Email" className="min-h-10 rounded-md border border-ocean-900/14 px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                          <input name="participantsCount" type="hidden" value="1" />
                          <Button type="submit" tone="light" className="min-h-10 rounded-md">
                            Join Waitlist
                          </Button>
                        </form>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <article className="py-6">
                  <p className="font-bold text-ocean-900">No public departures are currently scheduled.</p>
                  <p className="mt-2 text-sm font-semibold text-ocean-900/58">Leave your details and we will contact you when a new date opens.</p>
                  <form action={submitExpeditionInterestRequestAction} className="mt-5 grid gap-3 rounded-md border border-ocean-900/10 bg-ocean-50 p-4 md:grid-cols-[1fr_1fr_120px_auto]">
                    <input type="hidden" name="next" value={requestNextPath} />
                    <input type="hidden" name="expeditionId" value={expedition.id} />
                    <input type="hidden" name="requestType" value="waitlist" />
                    <input name="contactName" placeholder="Name" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                    <input name="contactEmail" type="email" placeholder="Email" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                    <input name="participantsCount" type="number" min={1} max={12} defaultValue={1} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                    <Button type="submit" className="rounded-md">
                      Join Waitlist
                    </Button>
                  </form>
                </article>
              )}
            </div>

            <form action={submitExpeditionInterestRequestAction} className="mt-8 grid gap-3 rounded-md border border-ocean-900/10 bg-ocean-50 p-4">
              <input type="hidden" name="next" value={requestNextPath} />
              <input type="hidden" name="expeditionId" value={expedition.id} />
              <input type="hidden" name="requestType" value="private_departure" />
              <div>
                <p className="font-bold text-ocean-900">Request private departure</p>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">For teams, families, or corporate groups that need a custom schedule.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_130px_180px_minmax(0,1fr)]">
                <input name="contactName" placeholder="Name" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="contactEmail" type="email" placeholder="Email" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="participantsCount" type="number" min={1} max={12} defaultValue={6} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="preferredStartAt" type="date" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" />
                <input name="message" placeholder="Preferred dates, group profile, accessibility needs" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" />
              </div>
              <Button type="submit" tone="secondary" className="w-fit rounded-md">
                Request private departure
              </Button>
            </form>
          </section>

          <DetailDivider />
          <section id="experience" className="scroll-mt-36 py-14">
            <SectionHeader title="The Experience" learnHref="#photos" />
            <div className="mt-8 grid gap-12 lg:grid-cols-[0.58fr_0.42fr]">
              <div>
                <h3 className="text-2xl font-semibold tracking-normal text-ocean-900">{expedition.overview.title}</h3>
                {expedition.overview.paragraphs.map((paragraph, index) => (
                  <p key={paragraph} className={cn(index === 0 ? "mt-5" : "mt-4", "max-w-2xl text-base leading-8 text-ocean-900/62")}>
                    {paragraph}
                  </p>
                ))}
                <Link href="#ask-question" className="mt-5 inline-flex items-center gap-1 text-base font-bold text-sky-700">
                  + Learn more
                </Link>
              </div>
              <div className="grid gap-8">
                <div>
                  <p className="text-xl font-bold text-ocean-900">Requirements</p>
                  <div className="mt-4 grid gap-3">
                    {expedition.requirements.slice(0, 4).map((item) => (
                      <p key={item} className="flex items-start gap-3 text-base leading-7 text-ocean-900/62">
                        <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-kelp-500" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-ocean-900">What&apos;s not included</p>
                  <p className="mt-4 text-base leading-8 text-ocean-900/62">{expedition.notIncluded.slice(0, 5).join(", ")}</p>
                </div>
              </div>
            </div>
          </section>

          <DetailDivider />
          <section id="travel-planning" className="scroll-mt-36 py-14">
            <SectionHeader
              title="Plan your trip"
              body="Practical travel information for international visitors. Confirm nationality-specific entry rules and insurance coverage before purchasing transport."
            />
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                [Plane, "Nearest arrival hub", expedition.travelInfo.nearestAirport],
                [MapPin, "Meeting point", expedition.travelInfo.meetingPoint],
                [Clock, "Local time", expedition.travelInfo.localTimeZone],
                [Wifi, "Connectivity", expedition.travelInfo.connectivity],
                [ShieldCheck, "Travel insurance", expedition.travelInfo.insuranceGuidance],
                [LifeBuoy, "Traveler support", expedition.travelInfo.supportContact]
              ].filter(([, , value]) => typeof value === "string" && value.trim()).map(([Icon, label, value]) => {
                const TravelIcon = Icon as LucideIcon;
                return (
                  <article key={String(label)} className="rounded-md border border-ocean-900/10 bg-ocean-50 p-5">
                    <TravelIcon size={22} aria-hidden="true" className="text-sky-700" />
                    <p className="mt-4 text-sm font-bold uppercase tracking-[0.12em] text-ocean-900/48">{String(label)}</p>
                    <p className="mt-2 text-base font-semibold leading-7 text-ocean-900">{String(value)}</p>
                  </article>
                );
              })}
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border border-ocean-900/10 bg-white p-5">
                <h3 className="text-xl font-bold text-ocean-900">Arrival & transfer</h3>
                <p className="mt-4 text-sm leading-7 text-ocean-900/64">{expedition.travelInfo.airportTransfer}</p>
                <p className="mt-3 text-sm leading-7 text-ocean-900/64">{expedition.travelInfo.arrivalGuidance}</p>
                <h4 className="mt-5 font-bold text-ocean-900">Visa & entry guidance</h4>
                <p className="mt-2 text-sm leading-7 text-ocean-900/64">{expedition.travelInfo.visaGuidance}</p>
              </div>
              <div className="rounded-md border border-ocean-900/10 bg-white p-5">
                <h3 className="text-xl font-bold text-ocean-900">Packing highlights</h3>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-ocean-900/68 sm:grid-cols-2">
                  {expedition.travelInfo.packingHighlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check size={16} aria-hidden="true" className="mt-1 shrink-0 text-kelp-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <DetailDivider />
          <section className="py-14">
            <SectionHeader title="UN Sustainable Development Goals" body="Join the host in pursuit of these goals and contribute to building a better and more sustainable future for all." learnHref="#impact" />
            <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {sdgFacts.map((goal) => (
                <div key={goal.code} className="grid grid-cols-[132px_minmax(0,1fr)] gap-7">
                  <div className={cn("flex aspect-square items-start rounded-md p-4 text-white", goal.tone === "kelp" ? "bg-kelp-600" : goal.tone === "sand" ? "bg-rose-700" : "bg-sky-700")}>
                    <span className="text-4xl font-bold leading-none">{goal.code}</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-ocean-900">{goal.label}</p>
                    <p className="mt-2 text-base leading-7 text-ocean-900/62">{goal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <DetailDivider />
          <section id="photos" className="scroll-mt-36 py-14">
            <SectionHeader title={`Photos (${expedition.galleryImages.length})`} />
            <div className="mt-9 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
              {expedition.galleryImages.map((image, index) => (
                <figure key={`${image.src}-${image.label}`} className={cn("relative overflow-hidden bg-ocean-100", index === 0 ? "sm:col-span-2 sm:row-span-2" : "")}>
                  <div className={cn("relative", index === 0 ? "h-[360px] lg:h-[520px]" : "h-56 lg:h-64")}>
                    <Image src={image.src} alt={image.caption} fill className="object-cover" sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} />
                  </div>
                </figure>
              ))}
            </div>
          </section>

          {expedition.travelerMedia.length > 0 ? (
            <>
              <DetailDivider />
              <section id="traveler-moments" className="scroll-mt-36 py-14">
                <SectionHeader
                  title="Traveler moments"
                  body="Media submitted by completed participants and reviewed by Terumbu before publication."
                />
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {expedition.travelerMedia.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-md border border-ocean-900/10 bg-white">
                      {item.mediaType === "photo" ? (
                        <div className="relative h-64 bg-ocean-50">
                          <Image
                            src={item.mediaUrl}
                            alt={item.caption ?? `Traveler moment from ${expedition.title}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(min-width: 1024px) 33vw, 50vw"
                          />
                        </div>
                      ) : (
                        <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="flex h-64 items-center justify-center bg-ocean-900 p-6 text-center font-bold text-white">
                          <span>
                            <PlayCircle className="mx-auto mb-3" size={34} aria-hidden="true" />
                            Watch traveler video
                          </span>
                        </a>
                      )}
                      <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-kelp-700">Verified completed participant</p>
                        <p className="mt-2 font-bold text-ocean-900">{item.travelerName}</p>
                        {item.caption ? <p className="mt-2 text-sm leading-6 text-ocean-900/62">{item.caption}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          <DetailDivider />
          <section id="host" className="scroll-mt-36 py-14">
            <SectionHeader title="About the host" />
            <div className="mt-10 grid gap-10 lg:grid-cols-[0.5fr_0.5fr] lg:items-center">
              <div className="grid gap-8 sm:grid-cols-[180px_minmax(0,1fr)]">
                <div>
                  <div className="relative aspect-square overflow-hidden rounded-md bg-ocean-100">
                    {hostImage ? <Image src={hostImage} alt={`${expedition.hostedBy.title} host`} fill className="object-cover" sizes="180px" /> : null}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-kelp-700">&bull; Recently active</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ocean-900">{expedition.hostedBy.title}</h3>
                  <div className="mt-6 grid gap-5">
                    {[
                      ["Response Rate", "This host usually answers most messages."],
                      ["Response Time", "This host usually writes back in a few hours."],
                      ["Verified Host", expedition.hostedBy.verificationLabel]
                    ].map(([label, body]) => (
                      <div key={label} className="grid grid-cols-[28px_minmax(0,1fr)] gap-4">
                        <MessageSquareText size={24} strokeWidth={1.8} aria-hidden="true" className="text-ocean-900/70" />
                        <div>
                          <p className="text-lg font-bold text-ocean-900">{label}</p>
                          <p className="mt-1 text-base leading-7 text-ocean-900/58">{body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-md bg-sky-700 p-8 text-white">
                <h3 className="text-2xl font-bold tracking-normal">Want to know more about this host?</h3>
                <p className="mt-4 max-w-xl text-lg leading-8 text-white/82">Terumbu shows verified partner information, expedition activity, and conservation context before you reserve.</p>
                {expedition.hostedBy.profileHref ? (
                  <Link href={expedition.hostedBy.profileHref} className="mt-7 inline-flex min-h-12 items-center rounded-full bg-kelp-500 px-7 text-base font-bold text-white hover:bg-kelp-700">
                    {expedition.hostedBy.profileLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {expedition.relatedExpeditions.length > 0 ? (
            <>
              <DetailDivider />
              <section className="py-14">
                <SectionHeader title="More experiences of this host" />
                <div className="mt-9 grid gap-6 md:grid-cols-2">
                  {expedition.relatedExpeditions.map((item) => (
                    <ExpeditionCard key={item.slug} expedition={item} />
                  ))}
                </div>
              </section>
            </>
          ) : null}

          <DetailDivider />
          <section id="map" className="scroll-mt-36 py-14">
            <SectionHeader title="Map" body={expedition.route.privacyNote} />
            <div className="mt-8 overflow-hidden rounded-md border border-ocean-900/10 bg-ocean-50">
              <iframe title={expedition.route.mapTitle} className="h-[420px] w-full border-0 lg:h-[560px]" loading="lazy" src={expedition.route.mapEmbedUrl} />
            </div>
          </section>

          <DetailDivider />
          <section id="impact" className="scroll-mt-36 py-14">
            <SectionHeader title="Terumbu conservation impact" body={`${formatCurrency(expedition.impact.conservationContribution, expedition.currency)} from each booking supports the associated conservation program. ${expedition.impact.summary}`} />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {expedition.impact.targets.map((target) => (
                <div key={target.label} className="border-l-2 border-kelp-500 pl-4">
                  <p className="text-3xl font-light text-sky-700">{target.value}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/62">{target.label}</p>
                </div>
              ))}
            </div>
            {expedition.associatedCampaign ? (
              <div className="mt-9 grid gap-5 rounded-md border border-ocean-900/10 bg-ocean-50 p-5 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center">
                <div className="relative h-32 overflow-hidden rounded-md bg-ocean-900">
                  {expedition.associatedCampaign.imageUrl ? <Image src={expedition.associatedCampaign.imageUrl} alt={`${expedition.associatedCampaign.title} campaign`} fill className="object-cover" sizes="160px" /> : null}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-kelp-700">{expedition.associatedCampaign.verification}</p>
                  <h3 className="mt-1 text-xl font-bold text-ocean-900">{expedition.associatedCampaign.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/62">{expedition.associatedCampaign.progress}% funded &bull; {expedition.associatedCampaign.impact}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/campaigns/${expedition.associatedCampaign.slug}`} tone="secondary">View Campaign</ButtonLink>
                  <ButtonLink href={`/checkout/donation?campaign=${expedition.associatedCampaign.slug}`} tone="donation">Donate</ButtonLink>
                </div>
              </div>
            ) : null}
          </section>

          <DetailDivider />
          <section id="ask-question" className="scroll-mt-36 py-14">
            <SectionHeader title="Message the expedition team" body="Send a question through Terumbu.eco. Admins and the verified expedition partner can review it from their website inbox and follow up by email." />
            {questionSavedMessage ? <p className="mt-5 rounded-md border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{questionSavedMessage}</p> : null}
            {questionErrorMessage ? <p className="mt-5 rounded-md border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{questionErrorMessage}</p> : null}
            <form action={submitExpeditionInterestRequestAction} className="mt-8 grid gap-4 rounded-md border border-ocean-900/10 bg-ocean-50 p-4">
              <input type="hidden" name="next" value={questionNextPath} />
              <input type="hidden" name="expeditionId" value={expedition.id} />
              <input type="hidden" name="requestType" value="question" />
              <input type="hidden" name="participantsCount" value="1" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="contactName" placeholder="Your name" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="contactEmail" type="email" placeholder="you@example.com" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
              </div>
              <select name="departureId" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500">
                <option value="">General expedition question</option>
                {expedition.departures.map((departure) => (
                  <option key={departure.id} value={departure.id}>
                    {departure.dateRangeLabel} / {departure.statusLabel}
                  </option>
                ))}
              </select>
              <textarea
                name="message"
                rows={5}
                placeholder="Ask about itinerary, equipment, access needs, conservation activities, or booking requirements."
                className="rounded-md border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-kelp-500"
                required
              />
              <Button type="submit" tone="secondary" className="w-fit rounded-md">
                <MessageSquareText size={17} aria-hidden="true" />
                Send question
              </Button>
            </form>
          </section>

          <DetailDivider />
          <section id="reviews" className="scroll-mt-36 py-14">
            <SectionHeader title="Reviews" />
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.3fr_0.7fr]">
              <div>
                <p className="text-5xl font-light text-ocean-900">{expedition.reviewCount > 0 ? expedition.rating.toFixed(1) : "-"}</p>
                <p className="mt-2 text-sm font-semibold text-ocean-900/62">
                  {expedition.reviewCount > 0 ? `${expedition.reviewCount} verified participant reviews` : "Reviews appear after completed participants submit them."}
                </p>
              </div>
              <div className="grid gap-4">
                {expedition.reviews.length > 0 ? (
                  expedition.reviews.slice(0, 4).map((review) => (
                    <article key={review.id} className="border-b border-ocean-900/10 pb-5 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-ocean-900">{review.name}</p>
                          <p className="mt-1 text-xs font-semibold text-ocean-900/52">{review.joinedAs} &bull; {review.date}</p>
                        </div>
                        <span className="flex items-center gap-1 text-sm font-bold text-kelp-700">
                          <Star size={14} aria-hidden="true" className="fill-kelp-500" />
                          {review.rating}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-ocean-900/68">{review.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-ocean-900/14 bg-ocean-50 p-5 font-bold text-ocean-900">No completed-participant reviews yet.</p>
                )}
              </div>
            </div>
          </section>

          <DetailDivider />
          <section id="faq" className="scroll-mt-36 py-14">
            <SectionHeader title="Before you book" />
            <div className="mt-7 grid gap-3">
              {expedition.faqs.map(([question, answer]) => (
                <details key={question} className="border-b border-ocean-900/10 py-4">
                  <summary className="cursor-pointer text-lg font-bold text-ocean-900">{question}</summary>
                  <p className="mt-3 text-base leading-7 text-ocean-900/62">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <DetailDivider />
          <section className="py-14">
            <SectionHeader title="How we travel responsibly" />
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {expedition.sustainability.map((item) => (
                <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/68">
                  <ShieldCheck size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-kelp-500" />
                  {item}
                </p>
              ))}
            </div>
            <Link href="/terms" className="mt-6 inline-flex text-sm font-bold text-sky-700">Read Participant Code of Conduct</Link>
          </section>

          {expedition.tripUpdates.length > 0 ? (
            <>
              <DetailDivider />
              <section className="py-14">
                <SectionHeader title="Trip activity" />
                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  {expedition.tripUpdates.map((update) => (
                    <article key={update.title} className="border-l-2 border-sky-700 pl-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/46">{formatDate(update.date)}</p>
                      <p className="mt-2 font-bold text-ocean-900">{update.title}</p>
                      <p className="mt-2 text-sm leading-6 text-ocean-900/62">{update.body}</p>
                    </article>
                  ))}
                </div>
                {expedition.documentationUrl ? (
                  <a
                    href={expedition.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-ocean-900/10 px-4 text-sm font-bold text-sky-700 hover:border-sky-600"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    View expedition documentation
                  </a>
                ) : null}
              </section>
            </>
          ) : null}

          <DetailDivider />
          <section className="py-14">
            <SectionHeader title={expedition.finalCta.title} body={expedition.finalCta.body} />
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="#availability" className="rounded-full">{expedition.finalCta.primaryLabel}</ButtonLink>
              <ButtonLink href="#ask-question" tone="light" className="rounded-full border border-ocean-900/10">{expedition.finalCta.secondaryLabel}</ButtonLink>
            </div>
            <div className="mt-5">
              <ExpeditionShareButtons slug={expedition.slug} title={expedition.title} referralCode={shareReferralCode} />
            </div>
          </section>
        </div>
      </main>

      <ExpeditionMobileBookingBar {...bookingProps} />
    </>
  );
}
