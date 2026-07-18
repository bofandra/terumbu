import { ArrowRight, BadgeCheck, BookOpen, Compass, HeartHandshake, MapPinned, PlayCircle, Star, Users } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { FeaturedExpeditionRail } from "@/components/featured-expedition-rail";
import { HomeCommunitySection } from "@/components/home-community-section";
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
  getHomepagePartners,
  getImpactMapSites,
  getImpactStats
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const journey = [
  {
    title: "Fund verified work",
    description: "Choose campaigns backed by partner checks, field evidence, and transparent funding goals.",
    icon: HeartHandshake
  },
  {
    title: "Visit the field",
    description: "Join conservation expeditions that connect travel with measurable restoration activity.",
    icon: Compass
  },
  {
    title: "Learn the science",
    description: "Build practical knowledge through Academy tracks linked to real projects and destinations.",
    icon: BookOpen
  },
  {
    title: "Track your impact",
    description: "Collect donations, courses, fieldwork, and certificates in a shareable Impact Passport.",
    icon: BadgeCheck
  }
];

const fallbackHeroImageUrl =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=2400&q=85";

const fallbackPassport: PassportPreviewData = {
  displayName: "Your Ocean Hero profile",
  initials: "OH",
  levelLabel: "Start at Level 1",
  xp: 0,
  xpTarget: 1000,
  href: "/login?next=/dashboard/passport",
  ctaLabel: "Open your passport",
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
  const [stats, campaigns, expeditions, impactSites, passport, fieldUpdate, partners] = await Promise.all([
    getImpactStats(),
    getCampaignCards(3),
    getExpeditionCards(3),
    getImpactMapSites(),
    getFeaturedPublicPassport(),
    getFeaturedFieldUpdate(),
    getHomepagePartners()
  ]);
  const heroImageUrl = fieldUpdate?.imageUrl ?? fallbackHeroImageUrl;

  return (
    <>
      <section className="relative flex min-h-screen items-center overflow-hidden bg-ocean-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroImageUrl}')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-900/95 via-ocean-900/62 to-coral-700/34" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-sand-50 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <MapPinned size={17} aria-hidden="true" />
              Indonesia conservation engagement platform
            </p>
            <h1 className="mt-7 text-5xl font-bold tracking-normal sm:text-6xl lg:text-7xl">
              Become an Ocean Hero
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
              Fund conservation, explore Indonesia, learn from field teams, and watch your verified impact grow over time.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/campaigns" className="sm:min-w-40">
                Donate Now
                <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/expeditions" tone="light" className="sm:min-w-48">
                Join an Expedition
              </ButtonLink>
              <ButtonLink href="/impact-map" tone="ghost" className="border border-white/28 text-white hover:bg-white/10">
                Explore Impact
              </ButtonLink>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4 text-sm font-semibold text-white/82">
              <span className="inline-flex items-center gap-2">
                <span className="flex -space-x-2">
                  {["RA", "WK", "LB"].map((label) => (
                    <span key={label} className="flex size-8 items-center justify-center rounded-full border border-white/40 bg-white/18 text-[11px] font-black backdrop-blur">
                      {label}
                    </span>
                  ))}
                </span>
                <Star size={16} fill="currentColor" className="text-coral-300" aria-hidden="true" />
                4.9/5 from Ocean Heroes
              </span>
              <span className="inline-flex items-center gap-2">
                <Users size={16} aria-hidden="true" />
                Donors, travelers, volunteers, and learners
              </span>
            </div>
          </div>

          {fieldUpdate ? (
            <div className="hidden items-end lg:flex">
              <div className="w-full rounded-2xl border border-white/20 bg-white/12 p-5 text-white backdrop-blur-xl">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-100">Field update</p>
                <p className="mt-4 text-2xl font-bold tracking-normal">{fieldUpdate.title}</p>
                <ProgressMeter value={fieldUpdate.progress} label={`${fieldUpdate.title} progress`} className="mt-6 h-3" trackClassName="bg-white/18" />
                <p className="mt-4 text-sm leading-6 text-white/72">{fieldUpdate.description}</p>
                <ButtonLink href="/impact-map" tone="ghost" className="mt-6 border border-white/24 text-white hover:bg-white/10">
                  <PlayCircle size={18} aria-hidden="true" />
                  Watch impact
                </ButtonLink>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <StatStrip stats={stats} />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="Featured campaigns" title="Fund the next conservation milestone">
            Pick a verified project and see what your contribution helps create in the field.
          </SectionHeading>
          <ButtonLink href="/campaigns" tone="secondary">
            View Campaigns
          </ButtonLink>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.slug} campaign={campaign} />
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow="Featured destinations" title="Travel with a conservation purpose">
              Field trips connect participants with restoration teams, local communities, and measurable ecosystem outcomes.
            </SectionHeading>
            <ButtonLink href="/expeditions" tone="secondary">
              Explore Trips
            </ButtonLink>
          </div>
          <div className="mt-10">
            <FeaturedExpeditionRail expeditions={expeditions} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Impact map" title="Evidence should be visible, not hidden in reports">
          Browse restoration sites, cleanup routes, learning hubs, project updates, and the progress behind every claim.
        </SectionHeading>
        <div className="mt-10">
          <ImpactMapPreview sites={impactSites} />
        </div>
      </section>

      <section className="bg-ocean-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How it works" title="One journey from care to verified action" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {journey.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                  <span className="flex size-12 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold tracking-normal text-ocean-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ocean-900/68">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <HomeCommunitySection />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading eyebrow="Digital Impact Passport" title="Make every contribution part of a lifelong record">
            Donations, sponsored corals, expeditions, courses, volunteer hours, and certificates become a verified profile users can keep and share.
          </SectionHeading>
          <PassportPreview passport={passport?.preview ?? fallbackPassport} />
        </div>
      </section>

      <PartnerLogoStrip partners={partners} />
    </>
  );
}
