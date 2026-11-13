import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, Compass, HeartHandshake, MapPinned, PlayCircle, Search, Star, Users } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { ExpeditionTravelSearchFields } from "@/components/expedition-travel-search-fields";
import { FeaturedExpeditionRail } from "@/components/featured-expedition-rail";
import { ImpactMapPreview } from "@/components/impact-map-preview";
import { PassportPreview } from "@/components/passport-preview";
import { PartnerLogoStrip } from "@/components/partner-logo-strip";
import { SectionHeading } from "@/components/section-heading";
import { StatStrip } from "@/components/stat-strip";
import { ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import type { PassportPreviewData } from "@/lib/domain";
import {
  getCampaignCards,
  getExpeditionCards,
  getFeaturedFieldUpdate,
  getFeaturedPublicPassport,
  getHomepageReviewSummary,
  getHomepagePartners,
  getImpactMapSites,
  getImpactStats
} from "@/lib/queries";
import { getPreferredDisplayCurrency, getPreferredLocale, localeTag, t } from "@/lib/user-preferences";
import { localizedSeoPath, publicSeoAlternates } from "@/lib/public-locale-routing";

export const dynamic = "force-dynamic";

const homepageSeo = {
  id: {
    title: "Ekspedisi Konservasi Pesisir Indonesia | Terumbu.world",
    description: "Ikuti ekspedisi konservasi, dukung proyek konservasi pesisir, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.world."
  },
  en: {
    title: "Conservation Expeditions in Indonesia | Terumbu.world",
    description: "Join conservation expeditions, support coastal conservation projects, and track evidence of real impact for Indonesia’s ecosystems with Terumbu.world."
  }
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPreferredLocale();
  const seo = homepageSeo[locale];

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: localizedSeoPath("/", locale), languages: publicSeoAlternates("/") },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: locale === "id" ? "id_ID" : "en_US",
      type: "website",
      siteName: "Terumbu.world",
      url: localizedSeoPath("/", locale)
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description
    }
  };
}

const fallbackPassport: PassportPreviewData = {
  displayName: "Your Ocean Hero profile",
  initials: "OH",
  levelLabel: "Start at Level 1",
  xp: 0,
  xpTarget: 1000,
  href: "/login?next=/dashboard/impact",
  ctaLabel: "Open My Impact",
  stats: [
    { label: "Donations", value: "0" },
    { label: "Corals", value: "0" },
    { label: "Field activities", value: "0" },
    { label: "Certificates", value: "0" }
  ],
  latestActivity: {
    title: "Your first verified action will appear here",
    description: "Donations, expedition bookings, course certificates, and field records become passport milestones."
  }
};

export default async function HomePage() {
  const [locale, displayCurrency, stats, campaigns, expeditions, impactSites, passport, fieldUpdate, reviewSummary, partners] = await Promise.all([
    getPreferredLocale(),
    getPreferredDisplayCurrency(),
    getImpactStats(),
    getCampaignCards(3),
    getExpeditionCards(3),
    getImpactMapSites(),
    getFeaturedPublicPassport(),
    getFeaturedFieldUpdate(),
    getHomepageReviewSummary(),
    getHomepagePartners()
  ]);
  const messages = t(locale);
  const localeName = localeTag(locale);
  const journey = [
    { title: messages.home.journeyFundTitle, description: messages.home.journeyFundDescription, icon: HeartHandshake },
    { title: messages.home.journeyVisitTitle, description: messages.home.journeyVisitDescription, icon: Compass },
    { title: messages.home.journeyLearnTitle, description: messages.home.journeyLearnDescription, icon: BookOpen },
    { title: messages.home.journeyTrackTitle, description: messages.home.journeyTrackDescription, icon: BadgeCheck }
  ];
  const heroImageUrl = fieldUpdate?.imageUrl;

  return (
    <div className="terumbu-editorial public-home">
      <section className="public-dark relative overflow-hidden bg-[var(--public-navy)]">
        {heroImageUrl ? (
          <Image src={heroImageUrl} alt={locale === "id" ? "Dokumentasi lapangan dari mitra" : "Partner-managed field documentation"} fill priority unoptimized className="absolute inset-0 object-cover" sizes="100vw" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,39,118,.96),rgba(10,39,118,.77)_55%,rgba(10,39,118,.38)),linear-gradient(0deg,rgba(10,39,118,.84),transparent_70%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:min-h-[660px] lg:grid-cols-[minmax(0,1.28fr)_minmax(0,.72fr)] lg:items-end lg:gap-12 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#c9f341]"><Compass size={17} aria-hidden="true" /> TERUMBU · {locale === "id" ? "Wisata konservasi Indonesia" : "Conservation travel in Indonesia"}</p>
            <h1 className="public-display-title mt-5 max-w-3xl">
              {messages.home.title} <span className="block text-[var(--public-lime)]">{messages.home.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
              {messages.home.intro}
            </p>
            <form action={localizedSeoPath("/expeditions", locale)} className="mt-7 grid gap-2 rounded-[1.125rem] border border-white/50 bg-[#0a2776]/65 p-3 backdrop-blur-xl sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="sm:col-span-3"><ExpeditionTravelSearchFields locale={locale} compact /></div>
              <label className="grid gap-1 text-xs font-bold">
                {locale === "id" ? "Mau menjelajah ke mana?" : "Where do you want to explore?"}
                <span className="relative">
                  <MapPinned className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/60" aria-hidden="true" />
                  <input name="destination" placeholder={messages.home.destinationPlaceholder} className="min-h-11 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900" />
                </span>
              </label>
              <label className="grid gap-1 text-xs font-bold">
                {locale === "id" ? "Aktivitas yang ingin kamu coba" : "Activity you want to try"}
                <span className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/60" aria-hidden="true" />
                  <input name="q" placeholder={messages.home.activityPlaceholder} className="min-h-11 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900" />
                </span>
              </label>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-full bg-[var(--public-lime)] px-4 text-sm font-bold text-[var(--public-navy)] hover:bg-white">
                {messages.home.searchTrips} <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={localizedSeoPath("/impact-map", locale)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 px-5 py-2 text-sm font-bold text-white hover:bg-white/10"><BadgeCheck size={17} aria-hidden="true" />{locale === "id" ? "Jelajahi bukti dampak" : "Explore impact evidence"}</Link>
              <Link href="/academy" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 px-5 py-2 text-sm font-bold text-white hover:bg-white/10"><BookOpen size={17} aria-hidden="true" />{locale === "id" ? "Belajar konservasi" : "Learn conservation"}</Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-white/82">
              {reviewSummary ? (
                <span className="inline-flex items-center gap-2">
                  <Star size={16} fill="currentColor" className="text-coral-300" aria-hidden="true" />
                  {reviewSummary.label}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <Users size={16} aria-hidden="true" />
                {messages.home.audience}
              </span>
            </div>
          </div>

          {fieldUpdate ? (
            <div className="w-full max-w-lg rounded-[1.125rem] border border-white/30 bg-[#0a2776]/70 p-6 text-white shadow-soft backdrop-blur-xl lg:justify-self-end">
              <h2 className="text-2xl">{fieldUpdate.title}</h2>
              <ProgressMeter value={fieldUpdate.progress} label={`${fieldUpdate.title} progress`} indicatorClassName="bg-[var(--public-lime)]" className="mt-6 h-2" trackClassName="bg-white/18" />
              <p className="mt-4 text-sm leading-6 text-white/72">{fieldUpdate.description}</p>
              <ButtonLink href={localizedSeoPath("/impact-map", locale)} tone="ghost" className="mt-6 border border-white/24 text-white hover:bg-white/10">
                <PlayCircle size={18} aria-hidden="true" />
                {messages.home.watchImpact}
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </section>

      <StatStrip stats={stats} editorial />

      <section className="bg-[var(--public-paper)] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading title={messages.home.featuredTitle}>
              {messages.home.featuredDescription}
            </SectionHeading>
            <ButtonLink href={localizedSeoPath("/expeditions", locale)} tone="editorial">
              {messages.home.exploreTrips}
            </ButtonLink>
          </div>
          <div className="mt-10">
            <FeaturedExpeditionRail expeditions={expeditions} displayCurrency={displayCurrency} locale={localeName} />
          </div>
        </div>
      </section>

      <section className="bg-[var(--public-cream)] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading title={messages.home.supportTitle}>
              {messages.home.supportDescription}
            </SectionHeading>
            <ButtonLink href="/campaigns" tone="editorial">
              {messages.home.viewCampaigns}
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} locale={locale} editorial />
            ))}
          </div>
          {campaigns.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-ocean-900/20 bg-white p-8 text-center">
              <h3 className="text-xl font-bold text-ocean-900">{locale === "id" ? "Kampanye publik sedang disiapkan" : "Public campaigns are being prepared"}</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ocean-900/65">{locale === "id" ? "Kampanye akan tampil setelah kontennya disetujui untuk publikasi." : "Campaigns appear here once their records are approved for publication."}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-[var(--public-blue-light)] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={messages.home.impactMapTitle}>
            {messages.home.impactMapDescription}
          </SectionHeading>
          <div className="mt-10">
            <ImpactMapPreview sites={impactSites} locale={locale} layout="editorial" />
            <div className="mt-7 text-right"><Link href={localizedSeoPath("/impact-map", locale)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0757e5] px-6 text-sm font-bold text-white hover:bg-[#062d7f]">{locale === "id" ? "Lihat peta dampak lengkap" : "Explore the full impact map"} <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </div>
        </div>
      </section>

      <section className="public-dark bg-[var(--public-navy)] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl">{messages.home.howTitle}</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[1.125rem] border border-white/20 bg-white/20 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="bg-[var(--public-navy)] p-6">
                  <span className="text-[var(--public-lime)]">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/80">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[var(--public-cream)] py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.75fr_1.25fr] lg:items-center lg:px-8">
          <SectionHeading title={messages.home.passportTitle}>
            {messages.home.passportDescription}
          </SectionHeading>
          <div className="rounded-[1.375rem] bg-[var(--public-lime)] p-4 sm:p-7">
            <PassportPreview passport={passport?.preview ?? fallbackPassport} locale={locale} />
          </div>
        </div>
      </section>

      <PartnerLogoStrip partners={partners} locale={locale} />
    </div>
  );
}
