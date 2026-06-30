import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Info,
  Leaf,
  ShieldCheck,
  Users,
  Waves
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignCard } from "@/components/campaign-card";
import { CampaignBeforeAfterSlider } from "@/components/campaign-before-after-slider";
import { CampaignDonationCard } from "@/components/campaign-donation-card";
import { CampaignImpactCalculator } from "@/components/campaign-impact-calculator";
import { CampaignMediaGallery } from "@/components/campaign-media-gallery";
import { CampaignProgressStrip } from "@/components/campaign-progress-strip";
import { CampaignSectionTabs } from "@/components/campaign-section-tabs";
import { CampaignUpdatesEvidence } from "@/components/campaign-updates-evidence";
import { ExpeditionCard } from "@/components/expedition-card";
import { ImpactMapPreview } from "@/components/impact-map-preview";
import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { VerificationExplainer } from "@/components/verification-explainer";
import { suggestedDonationAmounts } from "@/lib/domain";
import { getCampaignCards, getCampaignDetail, getCourses, getExpeditionCards } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tabs = [
  { label: "Overview", href: "#overview" },
  { label: "Impact", href: "#impact" },
  { label: "Plan", href: "#plan" },
  { label: "Updates", href: "#updates" },
  { label: "Transparency", href: "#transparency" },
  { label: "FAQ", href: "#faq" }
];

const timeline = [
  {
    phase: "Phase 1",
    title: "Preparation",
    date: "July-August 2026",
    status: "In progress",
    deliverables: ["Site assessment", "Community coordination", "Nursery preparation"]
  },
  {
    phase: "Phase 2",
    title: "Coral nursery",
    date: "September-October 2026",
    status: "Upcoming",
    deliverables: ["Fragment collection", "Nursery stabilization", "Initial monitoring"]
  },
  {
    phase: "Phase 3",
    title: "Transplantation",
    date: "November 2026-January 2027",
    status: "Upcoming",
    deliverables: ["Reef installation", "Coral transplantation", "Photo documentation"]
  },
  {
    phase: "Phase 4",
    title: "Monitoring",
    date: "February-December 2027",
    status: "Upcoming",
    deliverables: ["Survival monitoring", "Corrective maintenance", "Sponsor updates"]
  },
  {
    phase: "Phase 5",
    title: "Final reporting",
    date: "January 2028",
    status: "Upcoming",
    deliverables: ["Final impact report", "Public data release", "Completion evidence"]
  }
];

const verificationItems = [
  "Legal organization verified",
  "Bank account verified",
  "Project proposal reviewed",
  "Budget reviewed",
  "Field location validated",
  "Reporting schedule approved"
];

const faqItems = [
  ["How will my donation be used?", "Funds support field materials, local team operations, monitoring, documentation, and transparent project reporting."],
  ["How is the organization verified?", "Terumbu tracks document verification, field validation, and reporting obligations before campaign claims are published."],
  ["How often will I receive updates?", "Major campaign milestones, evidence uploads, and completion reports are published as partner updates."],
  ["Can I donate anonymously?", "The demo checkout records donor details for receipts, but public donor recognition can remain anonymous in future supporter feeds."],
  ["How is coral survival monitored?", "Field teams submit monitoring evidence, survey dates, and verification records connected to campaign impact sites."],
  ["Can companies sponsor this project?", "Corporate teams can fund campaigns directly or manage structured programs through the corporate workspace."]
];

function partnerTypeLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function initialsForName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TE";
}

function isImageUrl(value: string | null) {
  if (!value) {
    return false;
  }

  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value) || value.includes("images.unsplash.com");
}

function formatDateLabel(value: Date | null | undefined) {
  return value?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Pending";
}

function updateCategory(title: string, body: string) {
  const value = `${title} ${body}`.toLowerCase();

  if (value.includes("monitor")) {
    return "Monitoring";
  }

  if (value.includes("school") || value.includes("community")) {
    return "Community stories";
  }

  if (value.includes("budget") || value.includes("fund")) {
    return "Financial reports";
  }

  return "Field activities";
}

function publicDonorName(value: string | null) {
  if (!value) {
    return "Anonymous supporter";
  }

  if (/^(pt|cv|yayasan|koperasi)\b/i.test(value)) {
    return value;
  }

  return value.split(/\s+/)[0];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaignDetail(slug);

  return {
    title: campaign?.title ?? "Campaign"
  };
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaignDetail(slug);

  if (!campaign) {
    notFound();
  }

  const [allExpeditions, courses, relatedCampaignRows] = await Promise.all([
    getExpeditionCards(),
    getCourses(),
    getCampaignCards(6, campaign.category)
  ]);
  const progress = campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
  const impactFunded = campaign.goal > 0 ? Math.round((campaign.raised / campaign.goal) * campaign.impactTarget) : 0;
  const donationAmounts = suggestedDonationAmounts(campaign.goal);
  const relatedExpeditions = allExpeditions
    .filter((expedition) => campaign.region.includes(expedition.region) || campaign.summary.toLowerCase().includes(expedition.region.toLowerCase()))
    .slice(0, 1);
  const relatedCampaigns = relatedCampaignRows.filter((item) => item.slug !== campaign.slug).slice(0, 3);
  const featuredCourses = courses.slice(0, 3);
  const budgetItems = [
    ["Coral nursery and materials", 35],
    ["Field implementation", 25],
    ["Monitoring and documentation", 15],
    ["Community training", 10],
    ["Logistics", 8],
    ["Platform and payment costs", 5],
    ["Contingency", 2]
  ] as const;
  const story = campaign.story ?? campaign.summary;
  const campaignState = progress >= 100 ? "fully-funded" : campaign.daysLeft === 0 ? "ended" : "active";
  const disabledReason =
    campaignState === "fully-funded"
      ? "Funding goal reached. Follow implementation updates or support a related campaign."
      : campaignState === "ended"
        ? "This campaign has ended. Latest reports and evidence remain available."
        : null;
  const mediaItems = [
    ...campaign.updates
      .filter((update) => update.imageUrl)
      .map((update) => ({
        src: update.imageUrl!,
        caption: update.title,
        provenance: `Project update · ${formatDateLabel(update.publishedAt)}`
      })),
    ...campaign.evidence
      .filter((item) => isImageUrl(item.fileUrl))
      .map((item) => ({
        src: item.fileUrl,
        caption: item.title,
        provenance: `${item.evidenceType} · ${item.verificationStatus} · ${formatDateLabel(item.createdAt)}`
      }))
  ];
  const updateItems = campaign.updates.map((update) => ({
    id: update.id,
    title: update.title,
    body: update.body,
    imageUrl: update.imageUrl,
    dateLabel: formatDateLabel(update.publishedAt),
    category: updateCategory(update.title, update.body),
    responsibleTeam: campaign.partner,
    href: `/campaigns/${campaign.slug}/updates/${update.id}`
  }));
  const evidenceItems = campaign.evidence.map((item) => ({
    title: item.title,
    evidenceType: item.evidenceType,
    fileUrl: item.fileUrl,
    verificationStatus: item.verificationStatus,
    dateLabel: formatDateLabel(item.createdAt),
    locationLabel: campaign.sites[0]?.name ?? campaign.region
  }));
  const sponsoredPreview = campaign.sponsoredEcosystems[0];
  const teamMembers = [
    ["Project lead", `${campaign.partner} field lead`],
    ["Marine biologist", "Reef restoration specialist"],
    ["Community coordinator", "Local partner liaison"],
    ["Financial officer", "Campaign budget reviewer"],
    ["Monitoring lead", "Evidence and survey coordinator"]
  ];

  return (
    <main className="pb-24 lg:pb-0">
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/58" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ocean-900">Home</Link>
            <ChevronRight size={15} aria-hidden="true" />
            <Link href="/campaigns" className="hover:text-ocean-900">Campaigns</Link>
            <ChevronRight size={15} aria-hidden="true" />
            <Link href={`/campaigns?category=${encodeURIComponent(campaign.category)}`} className="hover:text-ocean-900">{campaign.category}</Link>
            <ChevronRight size={15} aria-hidden="true" />
            <span className="text-ocean-900">{campaign.title}</span>
          </nav>

          {disabledReason ? (
            <div className="mt-6 rounded-2xl border border-coral-500/20 bg-coral-100 px-5 py-4 text-sm font-bold text-coral-700">
              {disabledReason}
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-8">
              <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                <CampaignMediaGallery
                  title={campaign.title}
                  category={campaign.category}
                  region={campaign.region}
                  imageUrl={campaign.imageUrl}
                  updatedLabel={campaign.daysLeft > 0 ? `${campaign.daysLeft} days remaining` : "Latest report available"}
                  mediaItems={mediaItems}
                />

                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-coral-700">
                    <Waves size={18} aria-hidden="true" />
                    {campaign.category}
                  </p>
                  <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">
                    {campaign.title}
                  </h1>
                  <p className="mt-5 text-lg leading-8 text-ocean-900/68">{campaign.summary}</p>

                  <div className="mt-7 rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
                    <p className="text-sm font-semibold text-ocean-900/62">Implemented by</p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-lg font-black text-ocean-900 ring-1 ring-ocean-900/10">
                        {campaign.partnerLogoUrl ? (
                          <Image src={campaign.partnerLogoUrl} alt={`${campaign.partner} logo`} fill className="object-cover" sizes="64px" />
                        ) : (
                          initialsForName(campaign.partner)
                        )}
                      </span>
                      <div>
                        <Link href={`/partners/${campaign.partnerSlug}`} className="text-lg font-bold text-ocean-900 hover:text-coral-700">
                          {campaign.partner}
                        </Link>
                        <p className="mt-1 text-sm text-ocean-900/60">
                          {campaign.verification} · {campaign.partnerCampaignCount} projects completed
                        </p>
                        <VerificationExplainer verificationLabel={campaign.verification} />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[campaign.category, "Marine Biodiversity", "Community Livelihoods", "SDG 14"].map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <CampaignProgressStrip
                raised={campaign.raised}
                goal={campaign.goal}
                progress={progress}
                donors={campaign.donors}
                daysLeft={campaign.daysLeft}
                impactFunded={impactFunded}
                impactUnit={campaign.impactUnit}
              />
            </div>

            <aside className="grid h-fit gap-6 xl:sticky xl:top-28">
              <CampaignDonationCard
                campaignSlug={campaign.slug}
                raisedLabel={`${formatCurrency(campaign.raised)} raised`}
                progress={progress}
                impactUnit={campaign.impactUnit}
                impactTarget={campaign.impactTarget}
                goal={campaign.goal}
                oneTimeAmounts={donationAmounts}
                disabledReason={disabledReason}
              />

              <div className="rounded-2xl border border-ocean-900/10 bg-ocean-50 p-5 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-kelp-700">Impact at a glance</p>
                <div className="mt-5 grid gap-4">
                  {[
                    [Waves, campaign.impactTarget.toLocaleString("id-ID"), `${campaign.impactUnit} target`],
                    [ClipboardCheck, "12", "Monitoring visits over 12 months"],
                    [Users, "20", "Local team members trained"]
                  ].map(([Icon, value, label]) => (
                    <div key={label as string} className="flex items-center gap-3 border-b border-ocean-900/10 pb-4 last:border-b-0 last:pb-0">
                      <Icon className="text-coral-500" size={24} aria-hidden="true" />
                      <div>
                        <p className="font-bold text-ocean-900">{value as string}</p>
                        <p className="text-sm text-ocean-900/62">{label as string}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <CampaignSectionTabs tabs={tabs} />

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:px-8 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-16">
          <section id="overview" className="scroll-mt-40">
            <SectionHeading eyebrow="Overview" title="The problem, solution, and why this place matters" />
            <div className="mt-8 grid gap-5">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <h2 className="text-2xl font-bold tracking-normal text-ocean-900">The problem</h2>
                <p className="mt-4 leading-8 text-ocean-900/68">
                  {story} Restoration sites need sustained field materials, careful monitoring, and local coordination so conservation claims can be traced back to evidence.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    [Waves, "35%", "Reef degradation in restoration sites"],
                    [Info, "2.2C", "Rising sea surface temperature pressure"],
                    [Users, "3,000+", "Local families rely on healthy reefs"]
                  ].map(([Icon, value, label]) => (
                    <div key={label as string} className="rounded-xl bg-ocean-50 p-4">
                      <Icon className="text-coral-500" size={22} aria-hidden="true" />
                      <p className="mt-3 text-xl font-bold tracking-normal text-ocean-900">{value as string}</p>
                      <p className="mt-1 text-sm leading-6 text-ocean-900/62">{label as string}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="grid gap-6 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Our solution</h2>
                  <p className="mt-4 leading-8 text-ocean-900/68">
                    The campaign funds a science-based program: nursery preparation, restoration activity, visual documentation, community participation, and recurring evidence reports.
                  </p>
                  <div className="mt-5 grid gap-3 text-sm font-semibold text-ocean-900/68">
                    {["Coral nursery development", "Fragment transplantation", "Reef monitoring", "Community participation"].map((item) => (
                      <span key={item} className="inline-flex items-center gap-2">
                        <CheckCircle2 className="text-kelp-500" size={17} aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {campaign.imageUrl ? (
                  <Image src={campaign.imageUrl} alt={`${campaign.title} restoration activity`} width={760} height={440} className="h-72 w-full rounded-xl object-cover" sizes="(min-width: 1024px) 44vw, 100vw" />
                ) : null}
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Why {campaign.region}</h2>
                <p className="mt-4 leading-8 text-ocean-900/68">
                  This location combines ecological importance, local restoration capacity, and long-term monitoring access. Impact sites are shown with approximate public coordinates where sensitive field locations require care.
                </p>
              </article>
            </div>
          </section>

          <section id="impact" className="scroll-mt-40">
            <div className="grid gap-8">
              <CampaignImpactCalculator goal={campaign.goal} impactTarget={campaign.impactTarget} impactUnit={campaign.impactUnit} />

              <article className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">What We Will Deliver</p>
                  <div className="mt-5 grid gap-3 text-sm font-semibold text-ocean-900/68">
                    {[`${campaign.impactTarget.toLocaleString("id-ID")} ${campaign.impactUnit}`, "20 local community members trained", "12 monitoring visits", "4 educational workshops", "1 digital restoration dataset"].map((item) => (
                      <span key={item} className="inline-flex items-center gap-2">
                        <CheckCircle2 className="text-kelp-500" size={17} aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-ocean-900/10 bg-ocean-900 p-6 text-white shadow-soft">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">What We Aim to Change</p>
                  <div className="mt-5 grid gap-3 text-sm font-semibold text-white/74">
                    {["Increased reef coverage", "Improved local conservation capacity", "Better marine habitat condition", "Stronger community participation"].map((item) => (
                      <span key={item} className="inline-flex items-center gap-2">
                        <Leaf className="text-kelp-100" size={17} aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <SectionHeading title="Before and expected recovery">
                  This comparison is an illustrative restoration projection based on the project plan. Completed phases should use dated field evidence.
                </SectionHeading>
                <div className="mt-8">
                  <CampaignBeforeAfterSlider
                    beforeImage={campaign.imageUrl ?? mediaItems[0]?.src ?? "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80"}
                    afterImage={mediaItems[1]?.src ?? "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1200&q=80"}
                    beforeLabel="Before Restoration"
                    afterLabel="Expected Recovery"
                  />
                </div>
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Sponsor a Coral</p>
                    <h2 className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">Sponsor a Coral and Follow Its Journey</h2>
                    <p className="mt-4 leading-7 text-ocean-900/68">
                      Sponsorship packages connect a funded fragment to location, growth updates, certificate records, and Impact Passport activity.
                    </p>
                    <ButtonLink href={`/checkout/donation?campaign=${campaign.slug}&amount=250000&intent=coral`} className="mt-6">
                      Sponsor Your Coral
                    </ButtonLink>
                  </div>
                  <div className="rounded-2xl bg-ocean-900 p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-300">
                      Coral ID: {sponsoredPreview?.code ?? "RA-2026-00231"}
                    </p>
                    <div className="mt-5 grid gap-3 text-sm text-white/72">
                      {[
                        ["Location", sponsoredPreview?.region ?? campaign.region],
                        ["Species", "Acropora"],
                        ["Fragments", String(sponsoredPreview?.fragments || 5)],
                        ["Planted", formatDateLabel(sponsoredPreview?.plantedAt) === "Pending" ? "Pending planting" : formatDateLabel(sponsoredPreview?.plantedAt)],
                        ["Status", sponsoredPreview?.status ?? "Nursery Stage"],
                        ["Next Update", sponsoredPreview?.lastUpdatedAt ? formatDateLabel(sponsoredPreview.lastUpdatedAt) : "January 2027"]
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                          <span>{label}</span>
                          <span className="font-bold text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section id="plan" className="scroll-mt-40">
            <SectionHeading eyebrow="Plan" title="Project timeline and location" />
            <div className="mt-8 grid gap-5">
              {timeline.map((item) => (
                <article key={item.phase} className="grid gap-5 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft md:grid-cols-[180px_1fr]">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{item.phase}</p>
                    <p className="mt-2 text-sm font-semibold text-ocean-900/58">{item.date}</p>
                    <span className="mt-4 inline-flex rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{item.status}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-normal text-ocean-900">{item.title}</h2>
                    <div className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900/66">
                      {item.deliverables.map((deliverable) => (
                        <span key={deliverable} className="inline-flex items-center gap-2">
                          <CalendarDays className="text-kelp-500" size={16} aria-hidden="true" />
                          {deliverable}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 rounded-xl bg-sand-50 p-4 text-sm text-ocean-900/66 md:grid-cols-2">
                      <p><span className="font-bold text-ocean-900">Funding needed:</span> {formatCurrency(Math.round(campaign.goal / timeline.length))}</p>
                      <p><span className="font-bold text-ocean-900">Evidence after completion:</span> photo update and milestone note</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10">
              <SectionHeading title="Impact location map">
                Restoration zones, monitoring points, and evidence records are shown with approximate public coordinates where sensitive ecological locations require privacy.
              </SectionHeading>
              <div className="mt-8">
                <ImpactMapPreview sites={campaign.sites} />
              </div>
            </div>
          </section>

          <section id="updates" className="scroll-mt-40">
            <SectionHeading eyebrow="Updates" title="Project updates and evidence gallery">
              Follow field activities, monitoring notes, community stories, and evidence uploads as the campaign moves through milestones.
            </SectionHeading>
            <div className="mt-8">
              <CampaignUpdatesEvidence updates={updateItems} evidence={evidenceItems} />
            </div>
          </section>

          <section id="transparency" className="scroll-mt-40">
            <SectionHeading eyebrow="Transparency" title="Who implements this work and how funds are governed" />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <div className="flex items-center gap-4">
                  <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand-50 text-lg font-black text-ocean-900 ring-1 ring-ocean-900/10">
                    {campaign.partnerLogoUrl ? <Image src={campaign.partnerLogoUrl} alt={`${campaign.partner} logo`} fill className="object-cover" sizes="64px" /> : initialsForName(campaign.partner)}
                  </span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{partnerTypeLabel(campaign.partnerType)}</p>
                    <h2 className="mt-1 text-xl font-bold tracking-normal text-ocean-900">{campaign.partner}</h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-ocean-900/68">
                  {campaign.partnerDescription ?? `${campaign.partner} manages campaign activity, evidence uploads, reporting, and local coordination for this project.`}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <ButtonLink href={`/partners/${campaign.partnerSlug}`} tone="secondary">View organization profile</ButtonLink>
                  {campaign.partnerWebsiteUrl ? (
                    <ButtonLink href={campaign.partnerWebsiteUrl} tone="ghost" target="_blank" rel="noreferrer">
                      Website
                    </ButtonLink>
                  ) : null}
                </div>
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-kelp-700">Verification and governance</p>
                <div className="mt-5 grid gap-3">
                  {verificationItems.map((item) => (
                    <span key={item} className="inline-flex items-center gap-2 text-sm font-semibold text-ocean-900/68">
                      <ShieldCheck className="text-kelp-500" size={17} aria-hidden="true" />
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5">
                  <VerificationExplainer verificationLabel={campaign.verification} />
                </div>
              </article>
            </div>

            <article className="mt-8 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Implementation team</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {teamMembers.map(([role, name]) => (
                  <div key={role} className="rounded-xl bg-sand-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">{role}</p>
                    <p className="mt-2 font-bold text-ocean-900">{name}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="mt-8 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <SectionHeading title="Financial breakdown">
                Budget percentages are visible before checkout. Payment processing fees may vary by method in the demo gateway.
              </SectionHeading>
              <div className="mt-8 grid gap-4">
                {budgetItems.map(([label, percent]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between gap-4 text-sm font-bold text-ocean-900">
                      <span>{label}</span>
                      <span>{percent}% · {formatCurrency(Math.round(campaign.goal * (percent / 100)))}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-ocean-50">
                      <div className="h-full rounded-full bg-coral-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3 rounded-xl bg-sand-50 p-4 text-sm text-ocean-900/68 md:grid-cols-2">
                <p><span className="font-bold text-ocean-900">Platform fee:</span> 5% included in budget planning.</p>
                <p><span className="font-bold text-ocean-900">Payment processing:</span> depends on payment method.</p>
              </div>
              <details className="mt-5 rounded-xl border border-ocean-900/10 p-4">
                <summary className="cursor-pointer text-sm font-bold text-ocean-900">View Detailed Budget</summary>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-ocean-900/54">
                      <tr>
                        <th className="py-2 pr-4">Budget item</th>
                        <th className="py-2 pr-4">Quantity</th>
                        <th className="py-2 pr-4">Unit cost</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ocean-900/10">
                      {budgetItems.map(([label, percent], index) => {
                        const total = Math.round(campaign.goal * (percent / 100));
                        const quantity = [100, 12, 12, 4, 8, 1, 1][index] ?? 1;

                        return (
                          <tr key={label}>
                            <td className="py-3 pr-4 font-semibold text-ocean-900">{label}</td>
                            <td className="py-3 pr-4 text-ocean-900/64">{quantity}</td>
                            <td className="py-3 pr-4 text-ocean-900/64">{formatCurrency(Math.round(total / quantity))}</td>
                            <td className="py-3 font-bold text-ocean-900">{formatCurrency(total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </article>
          </section>

          <section id="faq" className="scroll-mt-40">
            <SectionHeading eyebrow="FAQ" title="Questions before you contribute" />
            <div className="mt-8 grid gap-3">
              {faqItems.map(([question, answer]) => (
                <details key={question} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-sm">
                  <summary className="cursor-pointer text-base font-bold text-ocean-900">{question}</summary>
                  <p className="mt-3 text-sm leading-6 text-ocean-900/66">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-ocean-900 p-8 text-white shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Final call</p>
            <h2 className="mt-3 text-3xl font-bold tracking-normal">Help restore {campaign.region}</h2>
            <p className="mt-4 max-w-2xl text-white/72">
              Every contribution supports local restoration teams, long-term monitoring, and healthier marine ecosystems.
            </p>
            <p className="mt-5 text-sm font-bold text-white/82">{progress}% funded · {formatCurrency(Math.max(0, campaign.goal - campaign.raised))} remaining</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {disabledReason ? (
                <ButtonLink href="#updates" tone="light">Follow Implementation</ButtonLink>
              ) : (
                <>
                  <ButtonLink href={`/checkout/donation?campaign=${campaign.slug}`} tone="light">Donate Now</ButtonLink>
                  <ButtonLink href={`/checkout/donation?campaign=${campaign.slug}&amount=250000&intent=coral`} className="bg-coral-500 text-white hover:bg-coral-700">Sponsor a Coral</ButtonLink>
                </>
              )}
              <ButtonLink href="#updates" tone="ghost" className="border border-white/24 text-white hover:bg-white/10">Follow Updates</ButtonLink>
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-5 xl:sticky xl:top-40">
          <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Donor community</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{campaign.donors.toLocaleString("id-ID")} supporters</p>
            <div className="mt-5 grid gap-3 text-sm text-ocean-900/66">
              {campaign.donorActivity.length > 0 ? (
                campaign.donorActivity.map((activity) => {
                  const donor = publicDonorName(activity.donorName);
                  const label =
                    activity.contributionIntent === "coral"
                      ? `${donor} sponsored ${Math.max(1, activity.sponsoredFragments).toLocaleString("id-ID")} coral fragments`
                      : activity.contributionIntent === "monthly"
                        ? `${donor} started monthly support`
                        : `${donor} supported this campaign`;

                  return (
                    <span key={`${activity.createdAt.toISOString()}-${activity.amount}`} className="rounded-xl bg-sand-50 p-3">
                      <span className="block font-semibold text-ocean-900">{label}</span>
                      {activity.message ? <span className="mt-1 block text-xs leading-5 text-ocean-900/58">&quot;{activity.message}&quot;</span> : null}
                    </span>
                  );
                })
              ) : (
                <span className="rounded-xl bg-sand-50 p-3">Recent donor activity will appear after paid contributions are recorded.</span>
              )}
            </div>
          </div>

          {relatedExpeditions.length > 0 ? (
            <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Related expedition</p>
              <div className="mt-5">
                {relatedExpeditions.map((expedition) => (
                  <ExpeditionCard key={expedition.slug} expedition={expedition} />
                ))}
              </div>
            </div>
          ) : null}

          {featuredCourses.length > 0 ? (
            <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Learn before you participate</p>
              <div className="mt-5 grid gap-3">
                {featuredCourses.map((course) => (
                  <Link key={course.slug} href={`/academy/courses/${course.slug}`} className="rounded-xl bg-sand-50 p-4 transition hover:bg-ocean-50">
                    <BookOpen className="text-coral-500" size={20} aria-hidden="true" />
                    <p className="mt-3 font-bold text-ocean-900">{course.title}</p>
                    <p className="mt-1 text-sm text-ocean-900/58">{course.duration}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      {relatedCampaigns.length > 0 ? (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Related campaigns" title="More conservation work in this category" />
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {relatedCampaigns.map((relatedCampaign) => (
                <CampaignCard key={relatedCampaign.slug} campaign={relatedCampaign} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
