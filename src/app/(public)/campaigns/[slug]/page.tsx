import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coins,
  ShieldCheck,
  UserRound,
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
import { Button, ButtonLink } from "@/components/ui/button";
import { VerificationExplainer } from "@/components/verification-explainer";
import { getSessionUser } from "@/lib/auth";
import { evidenceAnchorId, evidenceSourceHref, evidenceStage, evidenceStageLabel, getMetadataNumberOrString, getMetadataString, suggestedDonationAmounts } from "@/lib/domain";
import { getCampaignCards, getCampaignDetail, getCampaignRetentionState, getCourses, getExpeditionCards } from "@/lib/queries";
import { followCampaignAction, removeSavedCampaignAction, saveCampaignAction, unfollowCampaignAction } from "@/lib/retention-actions";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tabs = [
  { label: "Overview", href: "#overview" },
  { label: "Impact", href: "#impact" },
  { label: "Records", href: "#records" },
  { label: "Updates", href: "#updates" },
  { label: "Transparency", href: "#transparency" }
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

  return value.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value);
}

function formatDateLabel(value: Date | null | undefined) {
  return value?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Pending";
}

function formatDateRangeLabel(startsAt: Date | null | undefined, endsAt: Date | null | undefined) {
  if (startsAt && endsAt) {
    return `${formatDateLabel(startsAt)} - ${formatDateLabel(endsAt)}`;
  }

  return startsAt ? formatDateLabel(startsAt) : endsAt ? formatDateLabel(endsAt) : "Schedule pending";
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

  const sessionUser = await getSessionUser();
  const [allExpeditions, courses, relatedCampaignRows, retentionState] = await Promise.all([
    getExpeditionCards(),
    getCourses(),
    getCampaignCards(6, campaign.category),
    sessionUser ? getCampaignRetentionState(sessionUser.id, campaign.slug) : Promise.resolve(null)
  ]);
  const progress = campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
  const impactFunded = campaign.goal > 0 ? Math.round((campaign.raised / campaign.goal) * campaign.impactTarget) : 0;
  const donationAmounts = suggestedDonationAmounts(campaign.goal);
  const relatedExpeditions = allExpeditions
    .filter((expedition) => campaign.region.includes(expedition.region) || campaign.summary.toLowerCase().includes(expedition.region.toLowerCase()))
    .slice(0, 1);
  const relatedCampaigns = relatedCampaignRows.filter((item) => item.slug !== campaign.slug).slice(0, 3);
  const featuredCourses = courses.slice(0, 3);
  const story = campaign.story ?? campaign.summary;
  const campaignState = progress >= 100 ? "fully-funded" : campaign.daysLeft === 0 ? "ended" : "active";
  const disabledReason =
    campaignState === "fully-funded"
      ? "Funding goal reached. Follow implementation updates or support a related campaign."
      : campaignState === "ended"
        ? "This campaign has ended. Latest reports and evidence remain available."
        : null;
  const fallbackMediaItems = [
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
  const persistedMediaItems = campaign.mediaGallery
    .filter((item) => isImageUrl(item.fileUrl))
    .map((item) => ({
      src: item.fileUrl,
      caption: item.caption || item.altText || item.title,
      provenance: item.provenance || `${item.mediaType} · partner managed`
    }));
  const mediaItems = persistedMediaItems.length > 0 ? persistedMediaItems : fallbackMediaItems;
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
    id: item.id,
    code: item.evidenceCode,
    anchorId: evidenceAnchorId(item.evidenceCode),
    title: item.title,
    evidenceType: item.evidenceType,
    fileUrl: item.fileUrl,
    verificationStatus: item.verificationStatus,
    stageLabel: evidenceStageLabel(evidenceStage(item.metadata, item.evidenceType)),
    dateLabel: formatDateLabel(item.createdAt),
    locationLabel: item.siteName ? `${item.siteName}, ${item.siteRegion ?? campaign.region}` : campaign.sites[0]?.name ?? campaign.region,
    observation: getMetadataString(item.metadata, "observation") ?? getMetadataString(item.metadata, "summary"),
    metricLabel: getMetadataString(item.metadata, "metricLabel") ?? (getMetadataNumberOrString(item.metadata, "survivalRate") ? "Survival rate" : null),
    metricValue: getMetadataNumberOrString(item.metadata, "metricValue") ?? (getMetadataNumberOrString(item.metadata, "survivalRate") ? `${getMetadataNumberOrString(item.metadata, "survivalRate")}%` : null),
    sourceHref: evidenceSourceHref(campaign.slug, item.evidenceCode) ?? item.fileUrl
  }));
  const sponsoredPreview = campaign.sponsoredEcosystems[0];
  const beforeAfterSite = campaign.sites.find(
    (site) =>
      site.beforeAfter?.before &&
      site.beforeAfter.after &&
      isImageUrl(site.beforeAfter.before.fileUrl) &&
      isImageUrl(site.beforeAfter.after.fileUrl)
  );
  const publicTags = [campaign.category, partnerTypeLabel(campaign.partnerType), campaign.verification, campaign.region];
  const verifiedEvidenceCount = campaign.evidence.filter((item) => item.verificationStatus === "verified").length;
  const campaignPath = `/campaigns/${campaign.slug}`;
  const recordedMilestones = [
    ...campaign.updates.map((update) => ({
      key: `update-${update.id}`,
      title: update.title,
      detail: update.body,
      date: update.publishedAt,
      label: "Update"
    })),
    ...campaign.evidence.map((item) => ({
      key: `evidence-${item.title}-${item.createdAt.toISOString()}`,
      title: item.title,
      detail: `${item.evidenceType} / ${item.verificationStatus}`,
      date: item.createdAt,
      label: "Evidence"
    }))
  ]
    .sort((first, second) => (second.date?.getTime() ?? 0) - (first.date?.getTime() ?? 0))
    .slice(0, 6);
  const sponsorAmount = donationAmounts[1] ?? donationAmounts[0] ?? 0;

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
                  updatedLabel={`${campaign.updates.length.toLocaleString("id-ID")} updates / ${campaign.evidence.length.toLocaleString("id-ID")} evidence records`}
                  verificationLabel={campaign.verification}
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
                          <Image src={campaign.partnerLogoUrl} alt={`${campaign.partner} logo`} fill unoptimized className="object-cover" sizes="64px" />
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
                      {publicTags.map((tag) => (
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
                isAuthenticated={Boolean(sessionUser)}
                isSaved={retentionState?.isSaved ?? false}
                campaignPath={campaignPath}
              />

              <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Keep this project close</p>
                <p className="mt-3 text-sm leading-6 text-ocean-900/62">
                  Save the campaign to your dashboard or follow partner updates as they are published.
                </p>
                <div className="mt-5 grid gap-3">
                  {sessionUser ? (
                    <>
                      <form action={retentionState?.isSaved ? removeSavedCampaignAction : saveCampaignAction}>
                        <input type="hidden" name="campaignSlug" value={campaign.slug} />
                        <input type="hidden" name="next" value={campaignPath} />
                        <Button type="submit" tone={retentionState?.isSaved ? "light" : "secondary"} className="w-full">
                          {retentionState?.isSaved ? "Remove Saved Project" : "Save Project"}
                        </Button>
                      </form>
                      <form action={retentionState?.isFollowing ? unfollowCampaignAction : followCampaignAction}>
                        <input type="hidden" name="campaignSlug" value={campaign.slug} />
                        <input type="hidden" name="next" value={campaignPath} />
                        <input type="hidden" name="frequency" value="weekly" />
                        <Button type="submit" tone={retentionState?.isFollowing ? "light" : "primary"} className="w-full">
                          {retentionState?.isFollowing ? "Unfollow Updates" : "Follow Updates"}
                        </Button>
                      </form>
                    </>
                  ) : (
                    <>
                      <ButtonLink href={`/login?next=${encodeURIComponent(campaignPath)}`} tone="secondary" className="w-full">
                        Sign in to Save
                      </ButtonLink>
                      <ButtonLink href={`/login?next=${encodeURIComponent(campaignPath)}`} className="w-full">
                        Sign in to Follow
                      </ButtonLink>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-ocean-900/10 bg-ocean-50 p-5 shadow-soft">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-kelp-700">Impact at a glance</p>
                <div className="mt-5 grid gap-4">
                  {[
                    [Waves, campaign.impactTarget.toLocaleString("id-ID"), `${campaign.impactUnit} target`],
                    [ClipboardCheck, campaign.evidence.length.toLocaleString("id-ID"), "Evidence records"],
                    [Users, campaign.donors.toLocaleString("id-ID"), "Paid supporters"]
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
            <SectionHeading eyebrow="Overview" title="Campaign story and public location records" />
            <div className="mt-8 grid gap-5">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Campaign story</h2>
                <p className="mt-4 leading-8 text-ocean-900/68">{story}</p>
              </article>

              <article className="grid gap-6 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Public campaign summary</h2>
                  <p className="mt-4 leading-8 text-ocean-900/68">{campaign.summary}</p>
                </div>
                {campaign.imageUrl ? (
                  <Image
                    src={campaign.imageUrl}
                    alt={`${campaign.title} campaign image`}
                    width={760}
                    height={440}
                    unoptimized
                    className="h-72 w-full rounded-xl object-cover"
                    sizes="(min-width: 1024px) 44vw, 100vw"
                  />
                ) : null}
              </article>

              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Why {campaign.region}</h2>
                {campaign.sites.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {campaign.sites.map((site) => (
                      <div key={site.name} className="rounded-xl bg-sand-50 p-4">
                        <p className="font-bold text-ocean-900">{site.name}</p>
                        <p className="mt-1 text-sm text-ocean-900/62">
                          {site.type} / {site.region}
                        </p>
                        <p className="mt-3 text-xs font-bold text-ocean-900/48">
                          {site.progress}% progress / {site.evidenceCount} evidence records
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 leading-8 text-ocean-900/68">Public impact sites will appear after partner locations are approved for sharing.</p>
                )}
              </article>
            </div>
          </section>

          <section id="impact" className="scroll-mt-40">
            <div className="grid gap-8">
              <CampaignImpactCalculator goal={campaign.goal} impactTarget={campaign.impactTarget} impactUnit={campaign.impactUnit} />

              <article className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Recorded campaign targets</p>
                  <div className="mt-5 grid gap-3 text-sm font-semibold text-ocean-900/68">
                    {[
                      `${campaign.impactTarget.toLocaleString("id-ID")} ${campaign.impactUnit}`,
                      `${campaign.sites.length.toLocaleString("id-ID")} linked impact sites`,
                      `${campaign.evidence.length.toLocaleString("id-ID")} evidence records`,
                      `${campaign.updates.length.toLocaleString("id-ID")} campaign updates`
                    ].map((item) => (
                      <span key={item} className="inline-flex items-center gap-2">
                        <CheckCircle2 className="text-kelp-500" size={17} aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-ocean-900/10 bg-ocean-900 p-6 text-white shadow-soft">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Public verification records</p>
                  <div className="mt-5 grid gap-3 text-sm font-semibold text-white/74">
                    {[
                      `${verifiedEvidenceCount.toLocaleString("id-ID")} verified evidence records`,
                      `${campaign.evidence.length.toLocaleString("id-ID")} total evidence records`,
                      `${campaign.sponsoredEcosystems.length.toLocaleString("id-ID")} sponsorship records`,
                      `${campaign.donorActivity.length.toLocaleString("id-ID")} recent paid donor records`
                    ].map((item) => (
                      <span key={item} className="inline-flex items-center gap-2">
                        <ShieldCheck className="text-kelp-100" size={17} aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </article>

              {beforeAfterSite?.beforeAfter?.before && beforeAfterSite.beforeAfter.after ? (
                <CampaignBeforeAfterSlider
                  beforeImage={beforeAfterSite.beforeAfter.before.fileUrl}
                  afterImage={beforeAfterSite.beforeAfter.after.fileUrl}
                  beforeLabel={`${beforeAfterSite.name} / ${beforeAfterSite.beforeAfter.before.stageLabel}`}
                  afterLabel={`${beforeAfterSite.name} / ${beforeAfterSite.beforeAfter.after.stageLabel}`}
                  controlLabel="Compare actual field evidence"
                  caption={`Actual site evidence from ${beforeAfterSite.name}. Before record: ${beforeAfterSite.beforeAfter.before.surveyDate ?? "date pending"}. Latest record: ${beforeAfterSite.beforeAfter.after.surveyDate ?? "date pending"}.`}
                />
              ) : null}

              {sponsoredPreview ? (
                <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Sponsorship record</p>
                      <h2 className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{sponsoredPreview.label}</h2>
                      <p className="mt-4 leading-7 text-ocean-900/68">
                        This sponsorship record appears after paid sponsorship activity is confirmed and linked to the campaign.
                      </p>
                      {sponsorAmount > 0 ? (
                        <ButtonLink href={`/checkout/donation?campaign=${campaign.slug}&amount=${sponsorAmount}&intent=coral`} className="mt-6">
                          Sponsor This Campaign
                        </ButtonLink>
                      ) : null}
                    </div>
                    <div className="rounded-2xl bg-ocean-900 p-5 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-300">Record ID: {sponsoredPreview.code}</p>
                      <div className="mt-5 grid gap-3 text-sm text-white/72">
                        {[
                          ["Location", sponsoredPreview.siteName ?? sponsoredPreview.region ?? campaign.region],
                          ["Fragments", sponsoredPreview.fragments.toLocaleString("id-ID")],
                          ["Planted", formatDateLabel(sponsoredPreview.plantedAt)],
                          ["Status", sponsoredPreview.status],
                          ["Last Update", formatDateLabel(sponsoredPreview.lastUpdatedAt)]
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
              ) : null}
            </div>
          </section>

          <section id="records" className="scroll-mt-40">
            <SectionHeading eyebrow="Records" title="Recorded campaign activity and location" />
            <div className="mt-8 grid gap-5">
              {campaign.timelinePhases.length > 0 ? (
                <div className="grid gap-4">
                  {campaign.timelinePhases.map((phase) => (
                    <article key={phase.id} className="grid gap-5 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft md:grid-cols-[180px_1fr]">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{phase.status.replace(/_/g, " ")}</p>
                        <p className="mt-2 text-sm font-semibold text-ocean-900/58">{formatDateRangeLabel(phase.startsAt, phase.endsAt)}</p>
                      </div>
                      <div>
                        <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
                          <CalendarDays className="size-5 text-kelp-600" aria-hidden="true" />
                          {phase.title}
                        </h2>
                        {phase.description ? <p className="mt-4 text-sm leading-6 text-ocean-900/66">{phase.description}</p> : null}
                        {phase.deliverable || phase.evidenceNote ? (
                          <div className="mt-4 grid gap-3 text-sm font-semibold text-ocean-900/62 sm:grid-cols-2">
                            {phase.deliverable ? <span className="rounded-xl bg-sand-50 p-3">Deliverable: {phase.deliverable}</span> : null}
                            {phase.evidenceNote ? <span className="rounded-xl bg-ocean-50 p-3">Evidence: {phase.evidenceNote}</span> : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {recordedMilestones.length > 0 ? (
                recordedMilestones.map((item) => (
                  <article key={item.key} className="grid gap-5 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft md:grid-cols-[180px_1fr]">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-ocean-900/58">{formatDateLabel(item.date)}</p>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-normal text-ocean-900">{item.title}</h2>
                      <p className="mt-4 text-sm leading-6 text-ocean-900/66">{item.detail}</p>
                    </div>
                  </article>
                ))
              ) : (
                <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 text-ocean-900/68 shadow-soft">
                  No campaign updates or evidence records have been published yet.
                </article>
              )}
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
            <div id="evidence" className="mt-8 scroll-mt-40">
              <CampaignUpdatesEvidence updates={updateItems} evidence={evidenceItems} />
            </div>
          </section>

          <section id="transparency" className="scroll-mt-40">
            <SectionHeading eyebrow="Transparency" title="Who implements this work and how funds are governed" />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <div className="flex items-center gap-4">
                  <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand-50 text-lg font-black text-ocean-900 ring-1 ring-ocean-900/10">
                    {campaign.partnerLogoUrl ? <Image src={campaign.partnerLogoUrl} alt={`${campaign.partner} logo`} fill unoptimized className="object-cover" sizes="64px" /> : initialsForName(campaign.partner)}
                  </span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{partnerTypeLabel(campaign.partnerType)}</p>
                    <h2 className="mt-1 text-xl font-bold tracking-normal text-ocean-900">{campaign.partner}</h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-ocean-900/68">
                  {campaign.partnerDescription ?? "Partner details will appear after the organization profile is completed."}
                </p>
                {campaign.organizationTeam.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {campaign.organizationTeam.slice(0, 4).map((member) => (
                      <div key={member.id} className="flex items-start gap-3 rounded-xl bg-sand-50 p-3">
                        <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-xs font-black text-ocean-900 ring-1 ring-ocean-900/10">
                          {member.imageUrl ? (
                            <Image src={member.imageUrl} alt={`${member.name} portrait`} fill unoptimized className="object-cover" sizes="44px" />
                          ) : (
                            initialsForName(member.name)
                          )}
                        </span>
                        <span>
                          <span className="flex items-center gap-2 text-sm font-bold text-ocean-900">
                            <UserRound className="size-4 text-kelp-600" aria-hidden="true" />
                            {member.name}
                          </span>
                          <span className="mt-1 block text-xs font-semibold text-ocean-900/58">{member.role}</span>
                          {member.bio ? <span className="mt-1 block text-xs leading-5 text-ocean-900/58">{member.bio}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
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
                <div className="mt-5 grid gap-3 text-sm font-semibold text-ocean-900/68">
                  {[
                    [`Partner verification: ${campaign.verification}`, "Organization verification level"],
                    [`${campaign.evidence.length.toLocaleString("id-ID")} evidence records`, "Campaign evidence submitted"],
                    [`${verifiedEvidenceCount.toLocaleString("id-ID")} verified evidence records`, "Evidence approved by admin review"],
                    [`${campaign.sites.length.toLocaleString("id-ID")} impact sites`, "Campaign-linked field locations"]
                  ].map(([value, label]) => (
                    <span key={label} className="inline-flex items-center gap-2">
                      <ShieldCheck className="text-kelp-500" size={17} aria-hidden="true" />
                      <span>
                        <span className="font-bold text-ocean-900">{value}</span>
                        <span className="block text-xs font-semibold text-ocean-900/48">{label}</span>
                      </span>
                    </span>
                  ))}
                </div>
                <div className="mt-5">
                  <VerificationExplainer verificationLabel={campaign.verification} />
                </div>
              </article>
            </div>

            <article className="mt-8 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <SectionHeading title="Funding record">
                Funding values combine the campaign goal with paid supporter contributions.
              </SectionHeading>
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {[
                  [formatCurrency(campaign.goal), "Campaign goal"],
                  [formatCurrency(campaign.raised), "Raised"],
                  [formatCurrency(Math.max(0, campaign.goal - campaign.raised)), "Remaining"],
                  [campaign.donors.toLocaleString("id-ID"), "Paid supporters"]
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-sand-50 p-4">
                    <p className="text-xl font-bold tracking-normal text-ocean-900">{value}</p>
                    <p className="mt-1 text-sm text-ocean-900/62">{label}</p>
                  </div>
                ))}
              </div>
              {campaign.budgetLineItems.length > 0 ? (
                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-lg font-bold tracking-normal text-ocean-900">
                      <Coins className="size-5 text-kelp-600" aria-hidden="true" />
                      Budget line items
                    </h3>
                    <p className="text-sm font-bold text-ocean-900/58">
                      {formatCurrency(campaign.budgetUtilization.spent)} spent / {formatCurrency(campaign.budgetUtilization.planned)} planned
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {campaign.budgetLineItems.map((item) => (
                      <div key={item.id} className="grid gap-3 rounded-xl bg-sand-50 p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <p className="font-bold text-ocean-900">{item.category}</p>
                          {item.description ? <p className="mt-1 leading-6 text-ocean-900/62">{item.description}</p> : null}
                        </div>
                        <p className="font-bold text-ocean-900">
                          {formatCurrency(item.spentAmount)} / {formatCurrency(item.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
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
                  {sponsorAmount > 0 ? (
                    <ButtonLink href={`/checkout/donation?campaign=${campaign.slug}&amount=${sponsorAmount}&intent=coral`} className="bg-coral-500 text-white hover:bg-coral-700">
                      Sponsor a Coral
                    </ButtonLink>
                  ) : null}
                </>
              )}
              {sessionUser ? (
                <form action={retentionState?.isFollowing ? unfollowCampaignAction : followCampaignAction}>
                  <input type="hidden" name="campaignSlug" value={campaign.slug} />
                  <input type="hidden" name="next" value={campaignPath} />
                  <input type="hidden" name="frequency" value="weekly" />
                  <Button type="submit" tone="ghost" className="border border-white/24 text-white hover:bg-white/10">
                    {retentionState?.isFollowing ? "Unfollow Updates" : "Follow Updates"}
                  </Button>
                </form>
              ) : (
                <ButtonLink href={`/login?next=${encodeURIComponent(campaignPath)}`} tone="ghost" className="border border-white/24 text-white hover:bg-white/10">
                  Follow Updates
                </ButtonLink>
              )}
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
                      ? activity.sponsoredFragments > 0
                        ? `${donor} sponsored ${activity.sponsoredFragments.toLocaleString("id-ID")} coral fragments`
                        : `${donor} sponsored this campaign`
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
