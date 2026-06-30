import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  assessmentAttempts,
  adminAuditLogs,
  campaignUpdates,
  campaigns,
  corporateAccounts,
  corporateEmployees,
  corporateEvidenceCenter,
  corporatePermissions,
  corporateProgramBudgets,
  corporatePrograms,
  corporateProjectPortfolio,
  corporateReportExports,
  courseAssessments,
  courseCertificates,
  courseEnrollments,
  courseLessons,
  courses,
  donationReceipts,
  donations,
  expeditionBookings,
  expeditionDepartures,
  expeditions,
  impactPassportItems,
  impactPassports,
  impactSites,
  lessonProgress,
  organizations,
  paymentTransactions,
  profiles,
  projectEvidence,
  sponsoredEcosystems,
  users
} from "@/db/schema";
import {
  getMetadataNumber,
  getMetadataString,
  daysUntil,
  initialsForName,
  toCampaignCard,
  toExpeditionCard,
  toNumber,
  verificationLabel,
  type CampaignCardData,
  type ExpeditionCardData,
  type ImpactSiteData,
  type ImpactStatData,
  type PartnerLogoData,
  type PassportPreviewData
} from "@/lib/domain";
import { formatCompact, formatCurrency } from "@/lib/utils";

export async function getImpactStats(): Promise<ImpactStatData[]> {
  const [donationSummary] = await db
    .select({
      total: sql<string>`coalesce(sum(${donations.amount}), 0)`,
      donors: sql<number>`count(${donations.id})`
    })
    .from(donations)
    .where(eq(donations.status, "paid"));

  const ecosystemRows = await db
    .select({
      metadata: sponsoredEcosystems.metadata
    })
    .from(sponsoredEcosystems);

  const [heroSummary] = await db
    .select({
      total: sql<number>`count(${users.id})`
    })
    .from(users);

  const corals = ecosystemRows.reduce((total, row) => total + getMetadataNumber(row.metadata, "fragments"), 0);
  const mangroves = ecosystemRows.reduce((total, row) => total + getMetadataNumber(row.metadata, "seedlings"), 0);

  return [
    { label: "Corals restored", value: formatCompact(corals), tone: "coral" },
    { label: "Mangroves planted", value: formatCompact(mangroves), tone: "kelp" },
    { label: "Ocean heroes", value: formatCompact(heroSummary?.total ?? 0), tone: "ocean" },
    { label: "Raised for conservation", value: formatCurrency(toNumber(donationSummary?.total)), tone: "sand" }
  ];
}

export async function getCampaignCards(limit?: number, category?: string): Promise<CampaignCardData[]> {
  const rows = await db
    .select({
      slug: campaigns.slug,
      title: campaigns.title,
      category: campaigns.category,
      region: campaigns.region,
      summary: campaigns.summary,
      imageUrl: campaigns.imageUrl,
      raisedAmount: campaigns.raisedAmount,
      goalAmount: campaigns.goalAmount,
      donorCount: campaigns.donorCount,
      impactUnit: campaigns.impactUnit,
      impactTarget: campaigns.impactTarget,
      endsAt: campaigns.endsAt,
      partner: organizations.name,
      partnerSlug: organizations.slug,
      partnerType: organizations.type,
      partnerLogoUrl: organizations.logoUrl,
      partnerWebsiteUrl: organizations.websiteUrl,
      partnerDescription: organizations.description,
      verification: organizations.verification
    })
    .from(campaigns)
    .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(category ? and(eq(campaigns.status, "published"), eq(campaigns.category, category)) : eq(campaigns.status, "published"))
    .orderBy(desc(campaigns.publishedAt));

  const cards = rows.map((row) => toCampaignCard(row));

  return typeof limit === "number" ? cards.slice(0, limit) : cards;
}

export async function getCampaignCategories(): Promise<string[]> {
  const rows = await db
    .select({
      category: campaigns.category
    })
    .from(campaigns)
    .where(eq(campaigns.status, "published"))
    .groupBy(campaigns.category)
    .orderBy(asc(campaigns.category));

  return rows.map((row) => row.category);
}

export async function getPartnerNames(limit = 4): Promise<string[]> {
  const rows = await db
    .select({
      name: organizations.name
    })
    .from(organizations)
    .orderBy(asc(organizations.name))
    .limit(limit);

  return rows.map((row) => row.name);
}

function partnerTypeLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export async function getHomepagePartners(limit = 8): Promise<PartnerLogoData[]> {
  const [organizationRows, corporateRows] = await Promise.all([
    db
      .select({
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        logoUrl: organizations.logoUrl
      })
      .from(organizations)
      .orderBy(asc(organizations.name))
      .limit(limit),
    db
      .select({
        name: corporateAccounts.name,
        slug: corporateAccounts.slug,
        logoUrl: corporateAccounts.logoUrl
      })
      .from(corporateAccounts)
      .orderBy(asc(corporateAccounts.name))
      .limit(limit)
  ]);

  return [
    ...organizationRows.map((partner) => ({
      name: partner.name,
      slug: partner.slug,
      type: partnerTypeLabel(partner.type),
      logoUrl: partner.logoUrl,
      href: `/partners/${partner.slug}`
    })),
    ...corporateRows.map((partner) => ({
      name: partner.name,
      slug: partner.slug,
      type: "Corporate",
      logoUrl: partner.logoUrl,
      href: null
    }))
  ].slice(0, limit);
}

export async function getPartnerDirectory(limit = 12) {
  const rows = await db
    .select({
      name: organizations.name,
      slug: organizations.slug,
      type: organizations.type,
      description: organizations.description,
      verification: organizations.verification,
      campaignCount: sql<string>`count(${campaigns.id})`
    })
    .from(organizations)
    .leftJoin(campaigns, eq(campaigns.organizationId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(asc(organizations.name))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    verification: verificationLabel(row.verification),
    campaignCount: toNumber(row.campaignCount)
  }));
}

export async function getPartnerProfile(slug: string) {
  const [partner] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      type: organizations.type,
      logoUrl: organizations.logoUrl,
      websiteUrl: organizations.websiteUrl,
      description: organizations.description,
      verification: organizations.verification,
      createdAt: organizations.createdAt
    })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!partner) {
    return null;
  }

  const [campaignRows, evidenceRows] = await Promise.all([
    db
      .select({
        slug: campaigns.slug,
        title: campaigns.title,
        category: campaigns.category,
        region: campaigns.region,
        summary: campaigns.summary,
        imageUrl: campaigns.imageUrl,
        raisedAmount: campaigns.raisedAmount,
        goalAmount: campaigns.goalAmount,
        donorCount: campaigns.donorCount,
        impactUnit: campaigns.impactUnit,
        impactTarget: campaigns.impactTarget,
        endsAt: campaigns.endsAt,
        partner: organizations.name,
        verification: organizations.verification
      })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .where(eq(campaigns.organizationId, partner.id))
      .orderBy(desc(campaigns.publishedAt)),
    db
      .select({
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        verificationStatus: projectEvidence.verificationStatus,
        fileUrl: projectEvidence.fileUrl,
        createdAt: projectEvidence.createdAt,
        campaignTitle: campaigns.title
      })
      .from(projectEvidence)
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .where(eq(campaigns.organizationId, partner.id))
      .orderBy(desc(projectEvidence.createdAt))
  ]);

  return {
    ...partner,
    verification: verificationLabel(partner.verification),
    campaigns: campaignRows.map((campaign) => toCampaignCard(campaign)),
    evidence: evidenceRows
  };
}

export async function getFeaturedFieldUpdate() {
  const [row] = await db
    .select({
      campaignTitle: campaigns.title,
      imageUrl: campaigns.imageUrl,
      raisedAmount: campaigns.raisedAmount,
      goalAmount: campaigns.goalAmount,
      donorCount: campaigns.donorCount,
      impactTarget: campaigns.impactTarget,
      impactUnit: campaigns.impactUnit,
      siteName: impactSites.name
    })
    .from(campaigns)
    .leftJoin(impactSites, eq(impactSites.campaignId, campaigns.id))
    .where(eq(campaigns.status, "published"))
    .orderBy(desc(campaigns.publishedAt))
    .limit(1);

  if (!row) {
    return null;
  }

  const raised = toNumber(row.raisedAmount);
  const goal = toNumber(row.goalAmount);
  const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const focus = row.siteName ?? row.campaignTitle;

  return {
    imageUrl: row.imageUrl,
    progress,
    title: `${focus} is ${progress}% funded.`,
    description: `${row.donorCount.toLocaleString("id-ID")} supporters have raised ${formatCurrency(raised)} toward ${formatCurrency(goal)} for ${row.impactTarget.toLocaleString("id-ID")} ${row.impactUnit}.`
  };
}

export async function getCampaignDetail(slug: string) {
  const [row] = await db
    .select({
      id: campaigns.id,
      organizationId: campaigns.organizationId,
      slug: campaigns.slug,
      title: campaigns.title,
      category: campaigns.category,
      region: campaigns.region,
      summary: campaigns.summary,
      story: campaigns.story,
      imageUrl: campaigns.imageUrl,
      raisedAmount: campaigns.raisedAmount,
      goalAmount: campaigns.goalAmount,
      donorCount: campaigns.donorCount,
      impactUnit: campaigns.impactUnit,
      impactTarget: campaigns.impactTarget,
      endsAt: campaigns.endsAt,
      partner: organizations.name,
      partnerSlug: organizations.slug,
      partnerType: organizations.type,
      partnerLogoUrl: organizations.logoUrl,
      partnerWebsiteUrl: organizations.websiteUrl,
      partnerDescription: organizations.description,
      verification: organizations.verification
    })
    .from(campaigns)
    .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(eq(campaigns.slug, slug))
    .limit(1);

  if (!row) {
    return null;
  }

  const [updates, sites, evidence, partnerCampaignRows, donorActivityRows, sponsoredRows] = await Promise.all([
    db
      .select({
        id: campaignUpdates.id,
        title: campaignUpdates.title,
        body: campaignUpdates.body,
        imageUrl: campaignUpdates.imageUrl,
        publishedAt: campaignUpdates.publishedAt
      })
      .from(campaignUpdates)
      .where(eq(campaignUpdates.campaignId, row.id))
      .orderBy(desc(campaignUpdates.publishedAt)),
    getImpactMapSites(row.id),
    db
      .select({
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        fileUrl: projectEvidence.fileUrl,
        verificationStatus: projectEvidence.verificationStatus,
        createdAt: projectEvidence.createdAt
      })
      .from(projectEvidence)
      .where(eq(projectEvidence.campaignId, row.id))
      .orderBy(desc(projectEvidence.createdAt)),
    db
      .select({
        total: sql<string>`count(${campaigns.id})`
      })
      .from(campaigns)
      .where(eq(campaigns.organizationId, row.organizationId)),
    db
      .select({
        donorName: donations.donorName,
        amount: donations.amount,
        message: donations.message,
        createdAt: donations.createdAt,
        transactionPayload: paymentTransactions.payload
      })
      .from(donations)
      .leftJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
      .where(and(eq(donations.campaignId, row.id), eq(donations.status, "paid")))
      .orderBy(desc(donations.createdAt))
      .limit(6),
    db
      .select({
        code: sponsoredEcosystems.code,
        label: sponsoredEcosystems.label,
        status: sponsoredEcosystems.status,
        plantedAt: sponsoredEcosystems.plantedAt,
        lastUpdatedAt: sponsoredEcosystems.lastUpdatedAt,
        metadata: sponsoredEcosystems.metadata,
        siteName: impactSites.name,
        region: impactSites.region
      })
      .from(sponsoredEcosystems)
      .leftJoin(impactSites, eq(sponsoredEcosystems.impactSiteId, impactSites.id))
      .where(eq(sponsoredEcosystems.campaignId, row.id))
      .orderBy(desc(sponsoredEcosystems.lastUpdatedAt))
      .limit(6)
  ]);

  return {
    ...toCampaignCard(row),
    impactUnit: row.impactUnit,
    impactTarget: row.impactTarget,
    story: row.story,
    partnerSlug: row.partnerSlug,
    partnerType: row.partnerType,
    partnerLogoUrl: row.partnerLogoUrl,
    partnerWebsiteUrl: row.partnerWebsiteUrl,
    partnerDescription: row.partnerDescription,
    partnerCampaignCount: toNumber(partnerCampaignRows[0]?.total),
    donorActivity: donorActivityRows.map((donation) => ({
      donorName: donation.donorName,
      amount: toNumber(donation.amount),
      message: donation.message,
      createdAt: donation.createdAt,
      contributionIntent: getMetadataString(donation.transactionPayload, "contributionIntent") ?? "one-time",
      sponsoredFragments: getMetadataNumber(donation.transactionPayload, "sponsoredFragments")
    })),
    sponsoredEcosystems: sponsoredRows.map((ecosystem) => ({
      code: ecosystem.code,
      label: ecosystem.label,
      status: ecosystem.status,
      plantedAt: ecosystem.plantedAt,
      lastUpdatedAt: ecosystem.lastUpdatedAt,
      fragments: getMetadataNumber(ecosystem.metadata, "fragments"),
      survivalRate: getMetadataNumber(ecosystem.metadata, "survivalRate"),
      siteName: ecosystem.siteName,
      region: ecosystem.region
    })),
    updates,
    sites,
    evidence
  };
}

export async function getCampaignUpdateDetail(campaignSlug: string, updateId: string) {
  const [update] = await db
    .select({
      id: campaignUpdates.id,
      title: campaignUpdates.title,
      body: campaignUpdates.body,
      imageUrl: campaignUpdates.imageUrl,
      publishedAt: campaignUpdates.publishedAt,
      campaignTitle: campaigns.title,
      campaignSlug: campaigns.slug,
      partner: organizations.name,
      verification: organizations.verification
    })
    .from(campaignUpdates)
    .innerJoin(campaigns, eq(campaignUpdates.campaignId, campaigns.id))
    .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(and(eq(campaigns.slug, campaignSlug), eq(campaignUpdates.id, updateId)))
    .limit(1);

  return update
    ? {
        ...update,
        verification: verificationLabel(update.verification)
      }
    : null;
}

export async function getExpeditionCards(limit?: number, region?: string): Promise<ExpeditionCardData[]> {
  const [rows, departureRows] = await Promise.all([
    db
      .select({
        id: expeditions.id,
        slug: expeditions.slug,
        title: expeditions.title,
        region: expeditions.region,
        durationDays: expeditions.durationDays,
        basePrice: expeditions.basePrice,
        imageUrl: expeditions.imageUrl,
        summary: expeditions.summary
      })
      .from(expeditions)
      .where(region ? eq(expeditions.region, region) : undefined)
      .orderBy(asc(expeditions.title)),
    db
      .select({
        expeditionId: expeditionDepartures.expeditionId,
        capacity: expeditionDepartures.capacity,
        seatsBooked: expeditionDepartures.seatsBooked,
        startsAt: expeditionDepartures.startsAt
      })
      .from(expeditionDepartures)
      .where(eq(expeditionDepartures.status, "open"))
      .orderBy(asc(expeditionDepartures.startsAt))
  ]);

  const nextDepartureByExpeditionId = new Map<string, (typeof departureRows)[number]>();

  for (const departure of departureRows) {
    if (!nextDepartureByExpeditionId.has(departure.expeditionId)) {
      nextDepartureByExpeditionId.set(departure.expeditionId, departure);
    }
  }

  const cards = rows.map((row) => {
    const nextDeparture = nextDepartureByExpeditionId.get(row.id);
    const availabilityLabel = nextDeparture
      ? `${Math.max(0, nextDeparture.capacity - nextDeparture.seatsBooked)} seats available`
      : "No open departures";

    return toExpeditionCard(row, availabilityLabel);
  });

  return typeof limit === "number" ? cards.slice(0, limit) : cards;
}

export async function getExpeditionRegions() {
  const rows = await db
    .select({
      region: expeditions.region
    })
    .from(expeditions)
    .groupBy(expeditions.region)
    .orderBy(asc(expeditions.region));

  return rows.map((row) => row.region);
}

export async function getExpeditionDetail(slug: string) {
  const [row] = await db
    .select({
      id: expeditions.id,
      slug: expeditions.slug,
      title: expeditions.title,
      region: expeditions.region,
      durationDays: expeditions.durationDays,
      basePrice: expeditions.basePrice,
      imageUrl: expeditions.imageUrl,
      summary: expeditions.summary,
      relatedCampaignId: expeditions.relatedCampaignId,
      relatedCampaignSlug: campaigns.slug,
      relatedCampaignTitle: campaigns.title,
      relatedCampaignSummary: campaigns.summary,
      relatedCampaignImageUrl: campaigns.imageUrl,
      relatedCampaignRaisedAmount: campaigns.raisedAmount,
      relatedCampaignGoalAmount: campaigns.goalAmount,
      relatedCampaignImpactUnit: campaigns.impactUnit,
      relatedCampaignImpactTarget: campaigns.impactTarget,
      partner: organizations.name,
      partnerSlug: organizations.slug,
      partnerDescription: organizations.description,
      verification: organizations.verification
    })
    .from(expeditions)
    .leftJoin(campaigns, eq(expeditions.relatedCampaignId, campaigns.id))
    .leftJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(eq(expeditions.slug, slug))
    .limit(1);

  if (!row) {
    return null;
  }

  const [departures, relatedSites, updateRows, evidenceRows, courseRows, relatedExpeditionRows] = await Promise.all([
    db
      .select({
        id: expeditionDepartures.id,
        startsAt: expeditionDepartures.startsAt,
        endsAt: expeditionDepartures.endsAt,
        capacity: expeditionDepartures.capacity,
        seatsBooked: expeditionDepartures.seatsBooked,
        status: expeditionDepartures.status,
        metadata: expeditionDepartures.metadata
      })
      .from(expeditionDepartures)
      .where(eq(expeditionDepartures.expeditionId, row.id))
      .orderBy(asc(expeditionDepartures.startsAt)),
    row.relatedCampaignId ? getImpactMapSites(row.relatedCampaignId) : Promise.resolve([]),
    row.relatedCampaignId
      ? db
          .select({
            id: campaignUpdates.id,
            title: campaignUpdates.title,
            body: campaignUpdates.body,
            imageUrl: campaignUpdates.imageUrl,
            publishedAt: campaignUpdates.publishedAt,
            createdAt: campaignUpdates.createdAt
          })
          .from(campaignUpdates)
          .where(eq(campaignUpdates.campaignId, row.relatedCampaignId))
          .orderBy(desc(campaignUpdates.publishedAt))
          .limit(3)
      : Promise.resolve([]),
    row.relatedCampaignId
      ? db
          .select({
            evidenceCode: projectEvidence.evidenceCode,
            title: projectEvidence.title,
            evidenceType: projectEvidence.evidenceType,
            fileUrl: projectEvidence.fileUrl,
            verificationStatus: projectEvidence.verificationStatus,
            verifiedAt: projectEvidence.verifiedAt,
            createdAt: projectEvidence.createdAt,
            siteName: impactSites.name,
            siteRegion: impactSites.region
          })
          .from(projectEvidence)
          .leftJoin(impactSites, eq(projectEvidence.impactSiteId, impactSites.id))
          .where(eq(projectEvidence.campaignId, row.relatedCampaignId))
          .orderBy(desc(projectEvidence.verifiedAt))
          .limit(4)
      : Promise.resolve([]),
    getCourses(),
    getExpeditionCards(4, row.region)
  ]);

  const mappedDepartures = departures.map((departure) => ({
    ...departure,
    availableSeats: Math.max(0, departure.capacity - departure.seatsBooked),
    meetingPoint: getMetadataString(departure.metadata, "meetingPoint"),
    guide: getMetadataString(departure.metadata, "guide"),
    minParticipants: getMetadataNumber(departure.metadata, "minParticipants", 6),
    weatherAdvisory: getMetadataString(departure.metadata, "weatherAdvisory"),
    statusLabel:
      departure.status === "cancelled"
        ? "Cancelled"
        : departure.capacity - departure.seatsBooked <= 0
          ? "Full"
          : departure.capacity - departure.seatsBooked <= 4
            ? "Few places left"
            : departure.seatsBooked >= getMetadataNumber(departure.metadata, "minParticipants", 6)
              ? "Confirmed"
              : "Minimum not yet reached",
    dateRangeLabel: `${departure.startsAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${departure.endsAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`
  }));

  const siteActivities = relatedSites.map((site) => ({
    title: `${site.type} milestone: ${site.name}`,
    description: `${site.progress}% progress with ${site.evidenceCount} evidence records in ${site.region}.`
  }));

  const departureActivities = mappedDepartures.map((departure) => ({
    title: departure.meetingPoint ? `Departure from ${departure.meetingPoint}` : `${departure.availableSeats} seats available`,
    description: departure.guide
      ? `Guided by ${departure.guide}.`
      : `${departure.availableSeats} of ${departure.capacity} seats remain available for this departure.`
  }));

  const maxCapacity = mappedDepartures.reduce((capacity, departure) => Math.max(capacity, departure.capacity), 0);
  const primaryDeparture = mappedDepartures[0] ?? null;
  const price = toNumber(row.basePrice);
  const conservationContribution = Math.round(price * 0.16);
  const platformFee = Math.round(price * 0.04);
  const equipmentRental = 250_000;
  const relatedCampaignProgress = Math.min(
    100,
    Math.round((toNumber(row.relatedCampaignRaisedAmount) / Math.max(1, toNumber(row.relatedCampaignGoalAmount))) * 100)
  );
  const galleryImages = [
    {
      src: row.imageUrl ?? "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1400&q=80",
      label: "Destination",
      caption: `${row.region} expedition landscape`,
      provenance: "Illustrative destination image"
    },
    {
      src: evidenceRows.find((item) => item.fileUrl)?.fileUrl ?? "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
      label: "Conservation activity",
      caption: "Field team conservation activity",
      provenance: evidenceRows[0]?.verifiedAt ? `Evidence verified ${evidenceRows[0].verifiedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}` : "Reference field visual"
    },
    {
      src: updateRows.find((item) => item.imageUrl)?.imageUrl ?? "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
      label: "Reef monitoring",
      caption: "Participant reef monitoring activity",
      provenance: updateRows[0]?.publishedAt ? `Campaign update ${updateRows[0].publishedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}` : "Reference activity visual"
    },
    {
      src: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80",
      label: "Accommodation",
      caption: "Eco-lodge accommodation style",
      provenance: "Accommodation may be replaced with equivalent property"
    },
    {
      src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      label: "Field team",
      caption: "Local field team and boat logistics",
      provenance: "Illustrative operating conditions"
    }
  ];
  const preparationCourse =
    courseRows.find((course) => course.title.toLowerCase().includes("coral")) ??
    courseRows.find((course) => course.title.toLowerCase().includes("ocean")) ??
    courseRows[0] ??
    null;

  return {
    ...toExpeditionCard(row),
    id: row.id,
    durationDays: row.durationDays,
    partner: row.partner,
    partnerSlug: row.partnerSlug,
    partnerDescription: row.partnerDescription,
    verification: verificationLabel(row.verification),
    groupSizeLabel: maxCapacity > 0 ? `${maxCapacity} seats per departure` : "Departure capacity pending",
    primaryDeparture,
    departures: mappedDepartures,
    programActivities: [...siteActivities, ...departureActivities].slice(0, 3),
    galleryImages,
    rating: 4.9,
    reviewCount: 128,
    participantCount: 340,
    difficulty: "Moderate",
    minimumAge: 16,
    languages: ["English", "Bahasa Indonesia"],
    skillRequirements: ["Snorkeling ability required", "Diving certification optional"],
    tags: ["Coral restoration", "Reef monitoring", "Community-based conservation", "Snorkeling", "Small group", "SDG 14"],
    quickFacts: [
      { label: "Duration", value: toExpeditionCard(row).duration },
      { label: "Small group", value: maxCapacity > 0 ? `Max ${maxCapacity} people` : "Capacity pending" },
      { label: "Difficulty", value: "Moderate" },
      { label: "Min. age", value: "16+ years old" },
      { label: "Swimming ability", value: "Snorkeling required" },
      { label: "Per person", value: formatCurrency(price) }
    ],
    highlights: [
      { title: "Prepare coral fragments with trained restoration staff", status: "Weather-dependent" },
      { title: "Visit an active coral nursery", status: "Weather-dependent" },
      { title: "Record basic reef-monitoring observations", status: "Included" },
      { title: "Learn from local marine conservation practitioners", status: "Guaranteed" },
      { title: "Support community-led conservation", status: "Included" },
      { title: "Receive a verified expedition record in your Impact Passport", status: "Included" }
    ],
    impact: {
      conservationContribution,
      methodologyUpdatedAt: "2026-06-01",
      targets: [
        { value: "500", label: "Coral fragments supported" },
        { value: "3", label: "Monitoring visits funded" },
        { value: "12", label: "Local workdays supported" },
        { value: "1", label: "Community education session" }
      ],
      allocation: [
        { label: "Field conservation activities", percent: 35 },
        { label: "Local guides and community services", percent: 25 },
        { label: "Accommodation and meals", percent: 18 },
        { label: "Boats and local transport", percent: 12 },
        { label: "Safety, insurance, and equipment", percent: 6 },
        { label: "Platform operations", percent: 4 }
      ]
    },
    priceBreakdown: {
      basePrice: price,
      equipmentRental,
      platformFee,
      totalForTwo: price * 2 + equipmentRental + platformFee
    },
    associatedCampaign: row.relatedCampaignId
      ? {
          slug: row.relatedCampaignSlug,
          title: row.relatedCampaignTitle,
          summary: row.relatedCampaignSummary,
          imageUrl: row.relatedCampaignImageUrl,
          progress: relatedCampaignProgress,
          impact: `${row.relatedCampaignImpactTarget?.toLocaleString("id-ID")} ${row.relatedCampaignImpactUnit} target`,
          partner: row.partner,
          verification: verificationLabel(row.verification),
          latestUpdate: updateRows[0] ?? null
        }
      : null,
    itinerary: [
      {
        day: "Day 1",
        title: "Arrival and Orientation",
        meals: "Dinner",
        physicalLevel: "Light",
        activities: ["Sorong arrival", "Transfer to harbor", "Boat journey to base island", "Safety and conservation briefing", "Welcome dinner"]
      },
      {
        day: "Day 2",
        title: "Coral Nursery and Field Training",
        meals: "Breakfast, lunch, dinner",
        physicalLevel: "Moderate",
        activities: ["Reef-ecology introduction", "Equipment familiarization", "Coral nursery visit", "Supervised conservation activity", "Field debrief"]
      },
      {
        day: "Day 3",
        title: "Reef Monitoring and Community Program",
        meals: "Breakfast, lunch, dinner",
        physicalLevel: "Moderate",
        activities: ["Monitoring-site visit", "Photo and observation recording", "Community conservation discussion", "Optional snorkeling", "Impact-data review"]
      },
      {
        day: "Day 4",
        title: "Reflection and Departure",
        meals: "Breakfast",
        physicalLevel: "Light",
        activities: ["Final learning session", "Participant feedback", "Impact Passport confirmation", "Boat transfer", "Departure from Sorong"]
      }
    ],
    included: [
      "Three nights of accommodation",
      "Meals listed in the itinerary",
      "Local boat transport",
      "Harbor transfer",
      "Conservation activities",
      "Field equipment",
      "Expedition leader and local guide",
      "Participant insurance",
      "Impact Passport record",
      "Digital participation certificate"
    ],
    notIncluded: [
      "Flight to Sorong",
      "Personal travel insurance extension",
      "Diving equipment unless selected",
      "Personal expenses",
      "Additional accommodation",
      "Optional activities",
      "Medical testing or certification"
    ],
    requirements: [
      "Comfortable on small boats",
      "Able to swim or snorkel",
      "Able to walk on uneven and wet surfaces",
      "Able to join outdoor activity for several hours",
      "No conservation experience required"
    ],
    safety: [
      "Life jackets provided",
      "Certified boat operators",
      "First-aid equipment",
      "Emergency communication",
      "Weather monitoring",
      "Participant insurance",
      "Maximum ratio: 1 facilitator for every 6 participants"
    ],
    sustainability: [
      "No coral touching without direct instruction",
      "No wildlife feeding",
      "Reef-safe personal products encouraged",
      "Local procurement where practical",
      "Waste-management protocol",
      "Community consent and conservation-first itinerary decisions"
    ],
    route: {
      steps: ["Sorong Airport", "Sorong Harbor", "Expedition Base Island", "General conservation zone"],
      travelTimes: ["Airport to harbor: 20-30 min", "Harbor to island: 2-3 hours by boat", "Daily boat journey: 20-45 min depending on sea conditions"],
      sites: relatedSites
    },
    accommodation: {
      name: "Raja Ampat Eco-lodge partner stay",
      type: "Shared twin room included",
      details: ["Fan-cooled rooms", "Shared or private bathroom by availability", "Limited mobile coverage", "Refill drinking water", "Local meals served family-style"]
    },
    team: [
      { name: "Dimas Pratama", role: "Expedition leader", detail: "8 years leading marine field programs · English and Bahasa Indonesia" },
      { name: "Yayasan Bahari Lestari field team", role: "Marine conservation lead", detail: "Restoration and monitoring partner for the associated campaign" },
      { name: "Local community coordinator", role: "Participant support", detail: "Coordinates village etiquette, meals, transfers, and local guides" },
      { name: "Safety officer", role: "First-aid lead", detail: "Responsible for field briefings and emergency communication" }
    ],
    preparationCourse,
    reviews: [
      {
        name: "Raka A.",
        joinedAs: "First-time conservation traveler",
        rating: 5,
        date: "June 2026",
        body: "The field team explained what we could safely help with and what should be left to trained restorers. It felt purposeful and careful."
      },
      {
        name: "Maya S.",
        joinedAs: "Student participant",
        rating: 5,
        date: "May 2026",
        body: "The best part was reviewing monitoring photos and understanding how evidence becomes part of the campaign record."
      }
    ],
    tripUpdates: [
      updateRows[0]
        ? {
            title: updateRows[0].title,
            date: updateRows[0].publishedAt ?? updateRows[0].createdAt,
            body: updateRows[0].body
          }
        : {
            title: "Seasonal weather advisory",
            date: new Date("2026-06-01T00:00:00.000Z"),
            body: "Boat schedules may shift when sea conditions require safer departure windows."
          }
    ],
    cancellationPolicy: [
      { label: "More than 30 days before departure", refund: "90%" },
      { label: "15-30 days before departure", refund: "50%" },
      { label: "Fewer than 15 days", refund: "Non-refundable" },
      { label: "Operator cancellation", refund: "Full refund or reschedule" }
    ],
    faqs: [
      ["Do I need conservation experience?", "No. Field activities are supervised and designed for beginners."],
      ["Do I need to be able to dive?", "No. Snorkeling ability is required; diving certification is only needed for optional diving activities."],
      ["Are flights included?", "Flights to Sorong are not included."],
      ["How is my booking contribution used?", `${formatCurrency(conservationContribution)} per participant supports field conservation activity connected to the associated campaign.`],
      ["Will this appear in my Impact Passport?", "Confirmed participants receive a verified expedition record after completion."]
    ],
    relatedExpeditions: relatedExpeditionRows.filter((item) => item.slug !== row.slug).slice(0, 3)
  };
}

export async function getImpactMapSites(campaignId?: string): Promise<ImpactSiteData[]> {
  const rows = await db
    .select({
      name: impactSites.name,
      type: impactSites.ecosystemType,
      region: impactSites.region,
      campaignSlug: campaigns.slug,
      latitude: impactSites.latitude,
      longitude: impactSites.longitude,
      metadata: impactSites.metadata,
      verification: organizations.verification
    })
    .from(impactSites)
    .leftJoin(campaigns, eq(impactSites.campaignId, campaigns.id))
    .leftJoin(organizations, eq(campaigns.organizationId, organizations.id))
    .where(campaignId ? eq(impactSites.campaignId, campaignId) : undefined)
    .orderBy(asc(impactSites.name));

  return rows.map((site) => ({
    name: site.name,
    type: site.type,
    region: site.region,
    campaignSlug: site.campaignSlug,
    progress: getMetadataNumber(site.metadata, "progress"),
    latitude: toNumber(site.latitude),
    longitude: toNumber(site.longitude),
    verification: verificationLabel(site.verification),
    evidenceCount: getMetadataNumber(site.metadata, "evidenceCount"),
    latestSurvey: getMetadataString(site.metadata, "latestSurvey")
  }));
}

export async function getCourses() {
  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      level: courses.level,
      durationMinutes: courses.durationMinutes,
      summary: courses.summary,
      imageUrl: courses.imageUrl
    })
    .from(courses)
    .orderBy(asc(courses.durationMinutes));

  return rows.map((course) => ({
    ...course,
    duration: academyDuration(course.durationMinutes)
  }));
}

function academyDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours} hours` : `${hours.toFixed(1)} hours`;
  }

  return `${minutes} min`;
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString("id-ID")} ${value === 1 ? singular : plural}`;
}

const academyCourseProfiles: Record<
  string,
  {
    topic: string;
    instructor: string;
    instructorRole: string;
    partner: string;
    language: string;
    accessLabel: string;
    priceLabel: string;
    format: string;
    badge: string;
    recommendationReason: string;
    certificateOutcome: string;
  }
> = {
  "ocean-explorer": {
    topic: "Ocean ecosystems",
    instructor: "Dr. Maya Santoso",
    instructorRole: "Marine ecologist",
    partner: "Terumbu Academy",
    language: "Bahasa Indonesia",
    accessLabel: "Free",
    priceLabel: "Free",
    format: "Self-paced",
    badge: "Popular",
    recommendationReason: "A friendly starting point for understanding reef health and ocean threats.",
    certificateOutcome: "Ocean Explorer Certificate"
  },
  "coral-guardian": {
    topic: "Coral restoration",
    instructor: "Dimas Pratama",
    instructorRole: "Restoration specialist",
    partner: "Yayasan Bahari Lestari",
    language: "Bilingual",
    accessLabel: "Included with selected expeditions",
    priceLabel: "Included",
    format: "Field preparation",
    badge: "Field ready",
    recommendationReason: "Recommended before joining reef restoration or monitoring activities.",
    certificateOutcome: "Coral Guardian Certificate"
  },
  "esg-for-coastal-conservation": {
    topic: "ESG and biodiversity",
    instructor: "Siti Aminah",
    instructorRole: "Community conservation lead",
    partner: "Marine Community Lab",
    language: "English",
    accessLabel: "Corporate sponsored",
    priceLabel: "Sponsored",
    format: "Professional",
    badge: "Certificate",
    recommendationReason: "Useful for corporate teams reporting verified coastal-conservation outcomes.",
    certificateOutcome: "Ocean Hero Professional Certificate"
  }
};

const academyTrackDefinitions = [
  {
    slug: "ocean-explorer",
    title: "Ocean Explorer",
    audience: "Beginners, students, and new supporters",
    purpose: "Start with the basics of ocean ecosystems, reef health, and responsible ocean behavior.",
    level: "Beginner",
    courseSlugs: ["ocean-explorer"],
    outcome: "Ocean Explorer Certificate",
    tone: "ocean"
  },
  {
    slug: "coral-guardian",
    title: "Coral Guardian",
    audience: "Volunteers, supporters, and expedition participants",
    purpose: "Learn restoration practices, monitoring signals, and safe field participation.",
    level: "Intermediate",
    courseSlugs: ["coral-guardian"],
    outcome: "Coral Guardian Certificate",
    tone: "kelp"
  },
  {
    slug: "ocean-hero",
    title: "Ocean Hero",
    audience: "Professionals, community leaders, and corporate teams",
    purpose: "Build advanced skills for conservation programs, biodiversity reporting, and leadership.",
    level: "Professional",
    courseSlugs: ["esg-for-coastal-conservation"],
    outcome: "Ocean Hero Professional Certificate",
    tone: "navy"
  }
];

function academyProfileFor(slug: string, title: string) {
  return (
    academyCourseProfiles[slug] ?? {
      topic: title,
      instructor: "Terumbu Academy Team",
      instructorRole: "Conservation educator",
      partner: "Terumbu.eco",
      language: "Bahasa Indonesia",
      accessLabel: "Free",
      priceLabel: "Free",
      format: "Self-paced",
      badge: "New",
      recommendationReason: "Recommended based on your conservation interests.",
      certificateOutcome: `${title} Certificate`
    }
  );
}

export async function getAcademyOverviewStats() {
  const [courseRows, lessonRows, certificateRows] = await Promise.all([
    db
      .select({
        total: sql<string>`count(${courses.id})`
      })
      .from(courses),
    db
      .select({
        total: sql<string>`count(${courseLessons.id})`
      })
      .from(courseLessons),
    db
      .select({
        total: sql<string>`count(${courseCertificates.id})`
      })
      .from(courseCertificates)
  ]);

  return [
    { value: String(toNumber(courseRows[0]?.total)), label: "Learning tracks" },
    { value: String(toNumber(lessonRows[0]?.total)), label: "Lessons available" },
    { value: String(toNumber(certificateRows[0]?.total)), label: "Certificates issued" }
  ];
}

export async function getAcademyHomeData(userId?: string) {
  const now = new Date();
  const [
    courseRows,
    lessonRows,
    enrollmentRows,
    progressRows,
    certificateRows,
    certificateCountRows,
    learnerCountRows,
    courseEnrollmentCounts,
    partnerRows,
    upcomingBookingRows
  ] = await Promise.all([
    db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        level: courses.level,
        durationMinutes: courses.durationMinutes,
        summary: courses.summary,
        imageUrl: courses.imageUrl
      })
      .from(courses)
      .orderBy(asc(courses.durationMinutes)),
    db
      .select({
        id: courseLessons.id,
        courseId: courseLessons.courseId,
        title: courseLessons.title,
        position: courseLessons.position,
        durationMinutes: courseLessons.durationMinutes
      })
      .from(courseLessons)
      .orderBy(asc(courseLessons.position)),
    userId
      ? db
          .select({
            enrollmentId: courseEnrollments.id,
            courseId: courseEnrollments.courseId,
            status: courseEnrollments.status,
            enrolledAt: courseEnrollments.enrolledAt,
            completedAt: courseEnrollments.completedAt
          })
          .from(courseEnrollments)
          .where(eq(courseEnrollments.userId, userId))
          .orderBy(desc(courseEnrollments.enrolledAt))
      : Promise.resolve([]),
    userId
      ? db
          .select({
            enrollmentId: courseEnrollments.id,
            lessonId: courseLessons.id,
            courseId: courseLessons.courseId,
            lessonTitle: courseLessons.title,
            lessonPosition: courseLessons.position,
            durationMinutes: courseLessons.durationMinutes,
            status: lessonProgress.status,
            completedAt: lessonProgress.completedAt
          })
          .from(courseEnrollments)
          .innerJoin(courseLessons, eq(courseLessons.courseId, courseEnrollments.courseId))
          .leftJoin(
            lessonProgress,
            and(eq(lessonProgress.enrollmentId, courseEnrollments.id), eq(lessonProgress.lessonId, courseLessons.id))
          )
          .where(eq(courseEnrollments.userId, userId))
          .orderBy(asc(courseLessons.position))
      : Promise.resolve([]),
    userId
      ? db
          .select({
            certificateNumber: courseCertificates.certificateNumber,
            publicSlug: courseCertificates.publicSlug,
            issuedAt: courseCertificates.issuedAt,
            courseId: courseCertificates.courseId,
            courseTitle: courses.title,
            courseSlug: courses.slug,
            metadata: courseCertificates.metadata
          })
          .from(courseCertificates)
          .innerJoin(courses, eq(courseCertificates.courseId, courses.id))
          .where(eq(courseCertificates.userId, userId))
          .orderBy(desc(courseCertificates.issuedAt))
      : Promise.resolve([]),
    db.select({ total: sql<string>`count(${courseCertificates.id})` }).from(courseCertificates),
    db.select({ total: sql<string>`count(distinct ${courseEnrollments.userId})` }).from(courseEnrollments),
    db
      .select({
        courseId: courseEnrollments.courseId,
        total: sql<string>`count(${courseEnrollments.id})`
      })
      .from(courseEnrollments)
      .groupBy(courseEnrollments.courseId),
    db.select({ total: sql<string>`count(${organizations.id})` }).from(organizations),
    userId
      ? db
          .select({
            bookingCode: expeditionBookings.bookingCode,
            paymentStatus: expeditionBookings.paymentStatus,
            participantsCount: expeditionBookings.participantsCount,
            bookingMetadata: expeditionBookings.metadata,
            expeditionTitle: expeditions.title,
            expeditionSlug: expeditions.slug,
            expeditionRegion: expeditions.region,
            expeditionImageUrl: expeditions.imageUrl,
            startsAt: expeditionDepartures.startsAt,
            endsAt: expeditionDepartures.endsAt
          })
          .from(expeditionBookings)
          .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
          .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
          .where(eq(expeditionBookings.userId, userId))
          .orderBy(asc(expeditionDepartures.startsAt))
          .limit(1)
      : Promise.resolve([])
  ]);

  const lessonsByCourse = lessonRows.reduce((groups, lesson) => {
    const lessons = groups.get(lesson.courseId) ?? [];
    lessons.push(lesson);
    groups.set(lesson.courseId, lessons);
    return groups;
  }, new Map<string, typeof lessonRows>());
  const enrollmentByCourseId = new Map(enrollmentRows.map((enrollment) => [enrollment.courseId, enrollment]));
  const enrollmentCountsByCourse = new Map(courseEnrollmentCounts.map((row) => [row.courseId, toNumber(row.total)]));

  const progressByEnrollment = progressRows.reduce((groups, lesson) => {
    const lessons = groups.get(lesson.enrollmentId) ?? [];
    lessons.push(lesson);
    groups.set(lesson.enrollmentId, lessons);
    return groups;
  }, new Map<string, typeof progressRows>());

  const enrichedCourses = courseRows.map((course) => {
    const profile = academyProfileFor(course.slug, course.title);
    const lessons = lessonsByCourse.get(course.id) ?? [];
    const enrollment = enrollmentByCourseId.get(course.id) ?? null;
    const progressLessons = enrollment ? progressByEnrollment.get(enrollment.enrollmentId) ?? [] : [];
    const completedLessons = progressLessons.filter((lesson) => lesson.status === "completed").length;
    const progressPercent =
      enrollment?.status === "completed" ? 100 : Math.round((completedLessons / Math.max(1, lessons.length)) * 100);
    const remainingMinutes = progressLessons.reduce(
      (total, lesson) => total + (lesson.status === "completed" ? 0 : lesson.durationMinutes),
      enrollment ? 0 : course.durationMinutes
    );
    const nextProgressLesson = progressLessons.find((lesson) => lesson.status !== "completed") ?? null;
    const nextCourseLesson = lessons[0] ?? null;

    return {
      ...course,
      ...profile,
      duration: academyDuration(course.durationMinutes),
      lessonCount: lessons.length,
      moduleLabel: pluralize(lessons.length, "module"),
      learnerCount: enrollmentCountsByCourse.get(course.id) ?? 0,
      learnerLabel: pluralize(enrollmentCountsByCourse.get(course.id) ?? 0, "learner"),
      enrollment,
      progressPercent,
      completedLessons,
      remainingMinutes,
      nextLessonTitle: nextProgressLesson?.lessonTitle ?? nextCourseLesson?.title ?? null,
      certificateHours: Math.max(1, Math.round(course.durationMinutes / 60))
    };
  });

  const completedCourses = enrichedCourses.filter((course) => course.enrollment?.status === "completed").length;
  const inProgressCourses = enrichedCourses.filter((course) => course.enrollment && course.progressPercent < 100).length;
  const completedLessonMinutes = progressRows.reduce(
    (total, lesson) => total + (lesson.status === "completed" ? lesson.durationMinutes : 0),
    0
  );
  const continueLearning =
    enrichedCourses.find((course) => course.enrollment && course.progressPercent < 100) ?? null;
  const recommendedCourses = enrichedCourses.filter((course) => !course.enrollment).slice(0, 3);
  const activeCourses = enrichedCourses.filter((course) => course.enrollment && course.slug !== continueLearning?.slug).slice(0, 2);

  const tracks = academyTrackDefinitions.map((track) => {
    const trackCourses = enrichedCourses.filter((course) => track.courseSlugs.includes(course.slug));
    const totalCourses = Math.max(1, trackCourses.length);
    const completed = trackCourses.filter((course) => course.enrollment?.status === "completed").length;
    const progressPercent = Math.round(
      trackCourses.reduce((total, course) => total + course.progressPercent, 0) / totalCourses
    );

    return {
      ...track,
      totalCourses,
      completedCourses: completed,
      progressPercent,
      duration: academyDuration(trackCourses.reduce((total, course) => total + course.durationMinutes, 0)),
      href: trackCourses[0] ? `/academy/courses/${trackCourses[0].slug}` : "/academy"
    };
  });

  const upcomingBooking = upcomingBookingRows[0] ?? null;
  const preparationModules = upcomingBooking
    ? [
        { label: "Payment completed", complete: upcomingBooking.paymentStatus === "paid" },
        { label: "Participant details completed", complete: upcomingBooking.participantsCount > 0 },
        { label: "Waiver signed", complete: getMetadataString(upcomingBooking.bookingMetadata, "waiverSigned") === "true" },
        { label: "Equipment list reviewed", complete: getMetadataString(upcomingBooking.bookingMetadata, "equipmentReviewed") === "true" },
        { label: "Briefing completed", complete: getMetadataString(upcomingBooking.bookingMetadata, "briefingCompleted") === "true" }
      ]
    : [
        { label: "Reef ecology basics", complete: false },
        { label: "Field safety and emergency awareness", complete: false },
        { label: "Responsible coral interaction", complete: false },
        { label: "Local community etiquette", complete: false }
      ];
  const preparationComplete = preparationModules.filter((module) => module.complete).length;
  const preparationTotal = preparationModules.length;

  const certificatePreview = certificateRows[0]
    ? {
        title: certificateRows[0].courseTitle,
        credentialId: certificateRows[0].certificateNumber,
        issuedLabel: certificateRows[0].issuedAt.toLocaleDateString("id-ID", { dateStyle: "medium" }),
        href: "/dashboard/certificates",
        verified: true,
        example: false
      }
    : {
        title: enrichedCourses[0]?.title ?? "Terumbu Academy Certificate",
        credentialId: "TA-EXAMPLE-2026",
        issuedLabel: "Example credential",
        href: enrichedCourses[0] ? `/academy/courses/${enrichedCourses[0].slug}` : "/academy",
        verified: false,
        example: true
      };

  return {
    heroImageUrl: enrichedCourses[1]?.imageUrl ?? enrichedCourses[0]?.imageUrl ?? null,
    courses: enrichedCourses,
    featuredCourse: enrichedCourses[1] ?? enrichedCourses[0] ?? null,
    trustStats: [
      { label: "Courses", value: `${courseRows.length}+` },
      { label: "Verified instructors", value: `${new Set(enrichedCourses.map((course) => course.instructor)).size}` },
      { label: "Conservation partners", value: `${toNumber(partnerRows[0]?.total)}` },
      { label: "Learners", value: `${toNumber(learnerCountRows[0]?.total)}` },
      { label: "Learning tracks", value: `${tracks.length}` },
      { label: "Certificates", value: `${toNumber(certificateCountRows[0]?.total)}` }
    ],
    learnerSummary: {
      inProgressCourses,
      completedCourses,
      certificatesEarned: certificateRows.length,
      learningHours: Math.max(0, Math.round(completedLessonMinutes / 60)),
      trackProgress: Math.round(tracks.reduce((total, track) => total + track.progressPercent, 0) / Math.max(1, tracks.length)),
      nextMilestone:
        completedCourses >= 5
          ? "Keep building advanced conservation credentials."
          : `Complete ${Math.max(1, 5 - completedCourses)} more course${5 - completedCourses === 1 ? "" : "s"} to earn the Ocean Learner badge.`
    },
    continueLearning,
    activeCourses,
    recommendedCourses,
    tracks,
    preparation: {
      title: upcomingBooking?.expeditionTitle ?? "Prepare for Your Expedition",
      subtitle: upcomingBooking
        ? `${upcomingBooking.expeditionRegion} - ${upcomingBooking.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}`
        : "Required modules for field-safe conservation participation.",
      imageUrl: upcomingBooking?.expeditionImageUrl ?? enrichedCourses[1]?.imageUrl ?? null,
      dueLabel: upcomingBooking
        ? `Due before ${upcomingBooking.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}`
        : "Recommended before joining field activities",
      href: upcomingBooking ? "/dashboard/expeditions" : "/expeditions",
      complete: preparationComplete,
      total: preparationTotal,
      progressPercent: Math.round((preparationComplete / Math.max(1, preparationTotal)) * 100),
      modules: preparationModules
    },
    liveSession: {
      title: "How Coral Restoration Is Monitored",
      speaker: "Dr. Maya Santoso",
      dateLabel: "15 Jul",
      timeLabel: "19:00-20:30 WIB",
      format: "Live webinar",
      language: "Bahasa Indonesia",
      capacityLabel: "120 seats",
      href: "/academy#live-learning"
    },
    certificatePreview,
    instructors: [
      {
        name: "Dr. Maya Santoso",
        role: "Marine ecologist",
        organization: "Terumbu Academy",
        expertise: "Coral restoration and reef monitoring",
        courseCount: 3
      },
      {
        name: "Dimas Pratama",
        role: "Restoration specialist",
        organization: "Yayasan Bahari Lestari",
        expertise: "Nursery methods and field safety",
        courseCount: 2
      },
      {
        name: "Siti Aminah",
        role: "Community conservation lead",
        organization: "Marine Community Lab",
        expertise: "Community-based conservation",
        courseCount: 2
      }
    ],
    popularTopics: ["Coral restoration", "Marine biodiversity", "Mangrove", "Ocean waste", "ESG"],
    now
  };
}

export async function getCourseDetail(slug: string, userId?: string) {
  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      level: courses.level,
      durationMinutes: courses.durationMinutes,
      summary: courses.summary,
      imageUrl: courses.imageUrl
    })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) {
    return null;
  }

  const [lessons, assessments, enrollmentRows] = await Promise.all([
    db
      .select({
        id: courseLessons.id,
        title: courseLessons.title,
        slug: courseLessons.slug,
        position: courseLessons.position,
        durationMinutes: courseLessons.durationMinutes,
        body: courseLessons.body
      })
      .from(courseLessons)
      .where(eq(courseLessons.courseId, course.id))
      .orderBy(asc(courseLessons.position)),
    db
      .select({
        id: courseAssessments.id,
        title: courseAssessments.title,
        passingScore: courseAssessments.passingScore
      })
      .from(courseAssessments)
      .where(eq(courseAssessments.courseId, course.id)),
    userId
      ? db
          .select({
            id: courseEnrollments.id,
            status: courseEnrollments.status,
            completedAt: courseEnrollments.completedAt
          })
          .from(courseEnrollments)
          .where(and(eq(courseEnrollments.courseId, course.id), eq(courseEnrollments.userId, userId)))
          .limit(1)
      : Promise.resolve([])
  ]);

  const enrollment = enrollmentRows[0] ?? null;
  const [progressRows, certificateRows, attemptRows] = await Promise.all([
    enrollment
      ? db
          .select({
            lessonId: lessonProgress.lessonId,
            status: lessonProgress.status,
            score: lessonProgress.score,
            completedAt: lessonProgress.completedAt
          })
          .from(lessonProgress)
          .where(eq(lessonProgress.enrollmentId, enrollment.id))
      : Promise.resolve([]),
    userId
      ? db
          .select({
            certificateNumber: courseCertificates.certificateNumber,
            publicSlug: courseCertificates.publicSlug,
            issuedAt: courseCertificates.issuedAt
          })
          .from(courseCertificates)
          .where(and(eq(courseCertificates.courseId, course.id), eq(courseCertificates.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
    userId && assessments[0]
      ? db
          .select({
            score: assessmentAttempts.score,
            status: assessmentAttempts.status,
            submittedAt: assessmentAttempts.submittedAt
          })
          .from(assessmentAttempts)
          .where(and(eq(assessmentAttempts.assessmentId, assessments[0].id), eq(assessmentAttempts.userId, userId)))
          .limit(1)
      : Promise.resolve([])
  ]);

  const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row]));
  const completedLessons = progressRows.filter((row) => row.status === "completed").length;
  const progressPercent = enrollment?.status === "completed" ? 100 : Math.round((completedLessons / Math.max(1, lessons.length)) * 100);
  const profile = academyProfileFor(course.slug, course.title);

  return {
    ...course,
    ...profile,
    duration: academyDuration(course.durationMinutes),
    lessonCount: lessons.length,
    moduleLabel: pluralize(lessons.length, "module"),
    completedLessons,
    progressPercent,
    remainingMinutes: lessons.reduce((total, lesson) => {
      const progress = progressByLesson.get(lesson.id);
      return total + (progress?.status === "completed" ? 0 : lesson.durationMinutes);
    }, 0),
    certificateHours: Math.max(1, Math.round(course.durationMinutes / 60)),
    lessons: lessons.map((lesson) => ({
      ...lesson,
      progress: progressByLesson.get(lesson.id) ?? null
    })),
    assessment: assessments[0] ?? null,
    enrollment,
    certificate: certificateRows[0] ?? null,
    attempt: attemptRows[0] ?? null
  };
}

export async function getPassportPreviewForUser(userId: string): Promise<PassportPreviewData | null> {
  const [passport] = await db
    .select({
      id: impactPassports.id,
      publicSlug: impactPassports.publicSlug,
      visibility: impactPassports.visibility,
      displayName: profiles.displayName,
      heroLevel: profiles.heroLevel,
      xp: profiles.xp
    })
    .from(impactPassports)
    .innerJoin(profiles, eq(impactPassports.userId, profiles.userId))
    .where(eq(impactPassports.userId, userId))
    .limit(1);

  if (!passport) {
    return null;
  }

  return buildPassportPreview(passport.id, {
    displayName: passport.displayName,
    heroLevel: passport.heroLevel,
    xp: passport.xp,
    href: `/passport/${passport.publicSlug}`
  });
}

export async function getPublicPassport(publicSlug: string) {
  const [passport] = await db
    .select({
      id: impactPassports.id,
      publicSlug: impactPassports.publicSlug,
      visibility: impactPassports.visibility,
      createdAt: impactPassports.createdAt,
      updatedAt: impactPassports.updatedAt,
      story: impactPassports.story,
      userId: impactPassports.userId,
      imageUrl: users.imageUrl,
      displayName: profiles.displayName,
      location: profiles.location,
      bio: profiles.bio,
      heroLevel: profiles.heroLevel,
      xp: profiles.xp,
      isPublic: profiles.isPublic
    })
    .from(impactPassports)
    .innerJoin(profiles, eq(impactPassports.userId, profiles.userId))
    .innerJoin(users, eq(impactPassports.userId, users.id))
    .where(eq(impactPassports.publicSlug, publicSlug))
    .limit(1);

  if (!passport || !["public", "link"].includes(passport.visibility) || !passport.isPublic) {
    return null;
  }

  const [preview, items] = await Promise.all([
    buildPassportPreview(passport.id, {
      displayName: passport.displayName,
      heroLevel: passport.heroLevel,
      xp: passport.xp,
      href: `/passport/${passport.publicSlug}`
    }),
    db
      .select({
        itemType: impactPassportItems.itemType,
        title: impactPassportItems.title,
        description: impactPassportItems.description,
        evidenceUrl: impactPassportItems.evidenceUrl,
        occurredAt: impactPassportItems.occurredAt,
        metadata: impactPassportItems.metadata
      })
      .from(impactPassportItems)
      .where(eq(impactPassportItems.passportId, passport.id))
      .orderBy(desc(impactPassportItems.occurredAt))
  ]);

  const donationCount = items.filter((item) => item.itemType === "donation").length;
  const fieldCount = items.filter((item) => item.itemType === "expedition").length;
  const certificateCount = items.filter((item) => item.itemType === "certificate").length;
  const badgeCount = items.filter((item) => item.itemType === "badge").length;
  const coralCount = items.reduce((total, item) => total + getMetadataNumber(item.metadata, "fragments"), 0);
  const volunteerHours = items.reduce((total, item) => total + getMetadataNumber(item.metadata, "hours"), 0);
  const projectCount = new Set(items.map((item) => getMetadataString(item.metadata, "campaignSlug") ?? getMetadataString(item.metadata, "project")).filter(isDefined)).size;
  const oldestItems = [...items].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const firstActivity = oldestItems[0] ?? null;
  const firstFieldActivity = oldestItems.find((item) => item.itemType === "expedition") ?? null;
  const firstCertificate = oldestItems.find((item) => item.itemType === "certificate") ?? null;
  const latestVerifiedAt = items[0]?.occurredAt ?? passport.updatedAt;
  const categorySummaries = [
    {
      label: "Contributions",
      value: donationCount,
      support: `${Math.max(projectCount, donationCount > 0 ? 1 : 0).toLocaleString("id-ID")} supported projects`
    },
    {
      label: "Ecosystems",
      value: coralCount,
      support: "coral fragments financially supported"
    },
    {
      label: "Field activities",
      value: fieldCount,
      support: "verified expedition or partner activities"
    },
    {
      label: "Learning",
      value: certificateCount,
      support: `${badgeCount.toLocaleString("id-ID")} earned badges`
    },
    {
      label: "Volunteering",
      value: volunteerHours,
      support: "verified volunteer hours"
    }
  ].filter((category) => category.value > 0 || category.label !== "Volunteering");

  return {
    ...passport,
    preview,
    items,
    summary: {
      verifiedActivities: items.length,
      donationCount,
      fieldCount,
      certificateCount,
      badgeCount,
      coralCount,
      volunteerHours,
      projectCount
    },
    verification: {
      status: "Verified Impact Passport",
      activityCount: items.length,
      certificateCount,
      lastVerifiedAt: latestVerifiedAt
    },
    categorySummaries,
    milestones: [
      firstActivity
        ? {
            label: "First verified activity",
            title: firstActivity.title,
            occurredAt: firstActivity.occurredAt
          }
        : null,
      firstFieldActivity
        ? {
            label: "First field activity",
            title: firstFieldActivity.title,
            occurredAt: firstFieldActivity.occurredAt
          }
        : null,
      firstCertificate
        ? {
            label: "First certificate",
            title: firstCertificate.title,
            occurredAt: firstCertificate.occurredAt
          }
        : null
    ].filter(isDefined)
  };
}

export async function getFeaturedPublicPassport() {
  const [passport] = await db
    .select({
      publicSlug: impactPassports.publicSlug
    })
    .from(impactPassports)
    .innerJoin(profiles, eq(impactPassports.userId, profiles.userId))
    .where(and(eq(impactPassports.visibility, "public"), eq(profiles.isPublic, true)))
    .orderBy(desc(impactPassports.updatedAt))
    .limit(1);

  return passport ? getPublicPassport(passport.publicSlug) : null;
}

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: Date) {
  return value.toLocaleDateString("id-ID", { month: "short" });
}

function fullMonthLabel(value: Date) {
  return value.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function addMonths(value: Date, offset: number) {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1);
}

function isSameMonth(value: Date | null | undefined, reference: Date) {
  return Boolean(value && value.getFullYear() === reference.getFullYear() && value.getMonth() === reference.getMonth());
}

function dedupeById<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function ecosystemUnit(metadata: unknown) {
  if (getMetadataNumber(metadata, "fragments") > 0) {
    return "coral fragments";
  }

  if (getMetadataNumber(metadata, "seedlings") > 0) {
    return "mangrove seedlings";
  }

  return "restoration units";
}

function ecosystemQuantity(metadata: unknown) {
  return getMetadataNumber(metadata, "fragments") || getMetadataNumber(metadata, "seedlings");
}

function nextQuarterDate(value: Date | null) {
  if (!value) {
    return "Schedule pending";
  }

  return addMonths(value, 3).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

async function buildPassportPreview(
  passportId: string,
  profile: {
    displayName: string;
    heroLevel: number;
    xp: number;
    href: string;
  }
): Promise<PassportPreviewData> {
  const items = await db
    .select({
      itemType: impactPassportItems.itemType,
      title: impactPassportItems.title,
      description: impactPassportItems.description,
      occurredAt: impactPassportItems.occurredAt,
      metadata: impactPassportItems.metadata
    })
    .from(impactPassportItems)
    .where(eq(impactPassportItems.passportId, passportId))
    .orderBy(desc(impactPassportItems.occurredAt));

  const donationsCount = items.filter((item) => item.itemType === "donation").length;
  const fieldCount = items.filter((item) => item.itemType === "expedition").length;
  const certificateCount = items.filter((item) => item.itemType === "certificate").length;
  const coralCount = items.reduce((total, item) => total + getMetadataNumber(item.metadata, "fragments"), 0);
  const xpTarget = Math.max(1000, profile.heroLevel * 2500);

  return {
    displayName: profile.displayName,
    initials: initialsForName(profile.displayName),
    levelLabel: `Ocean Hero, Level ${profile.heroLevel}`,
    xp: profile.xp,
    xpTarget,
    href: profile.href,
    stats: [
      { label: "Donations", value: String(donationsCount) },
      { label: "Corals", value: String(coralCount) },
      { label: "Field activities", value: String(fieldCount) },
      { label: "Certificates", value: String(certificateCount) }
    ],
    latestActivity: items[0]
      ? {
          title: items[0].title,
          description: items[0].description ?? "Verified activity added to this Impact Passport."
        }
      : null
  };
}

export async function getDashboardData(userId: string) {
  const now = new Date();
  const [
    profile,
    donationRows,
    ecosystemRows,
    bookingRows,
    enrollmentRows,
    lessonRows,
    certificateRows,
    updateRowsRaw,
    evidenceRowsRaw,
    passportItemRows,
    personalSiteRows,
    courseRows,
    passportPreview
  ] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
        displayName: profiles.displayName,
        location: profiles.location,
        bio: profiles.bio,
        heroLevel: profiles.heroLevel,
        xp: profiles.xp,
        isPublic: profiles.isPublic,
      publicSlug: impactPassports.publicSlug,
      passportVisibility: impactPassports.visibility,
      passportCreatedAt: impactPassports.createdAt,
      passportUpdatedAt: impactPassports.updatedAt
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(impactPassports, eq(impactPassports.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        id: donations.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        campaignCategory: campaigns.category,
        campaignRegion: campaigns.region,
        campaignImageUrl: campaigns.imageUrl,
        campaignRaisedAmount: campaigns.raisedAmount,
        campaignGoalAmount: campaigns.goalAmount,
        campaignStatus: campaigns.status,
        campaignEndsAt: campaigns.endsAt,
        organizationName: organizations.name,
        amount: donations.amount,
        currency: donations.currency,
        status: donations.status,
        message: donations.message,
        createdAt: donations.createdAt,
        receiptNumber: donationReceipts.receiptNumber,
        transactionPayload: paymentTransactions.payload
      })
      .from(donations)
      .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .leftJoin(donationReceipts, eq(donationReceipts.donationId, donations.id))
      .leftJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
      .where(eq(donations.userId, userId))
      .orderBy(desc(donations.createdAt)),
    db
      .select({
        code: sponsoredEcosystems.code,
        label: sponsoredEcosystems.label,
        status: sponsoredEcosystems.status,
        plantedAt: sponsoredEcosystems.plantedAt,
        lastUpdatedAt: sponsoredEcosystems.lastUpdatedAt,
        metadata: sponsoredEcosystems.metadata,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        campaignImageUrl: campaigns.imageUrl,
        campaignRegion: campaigns.region,
        siteName: impactSites.name,
        siteType: impactSites.ecosystemType,
        siteRegion: impactSites.region,
        siteMetadata: impactSites.metadata
      })
      .from(sponsoredEcosystems)
      .innerJoin(campaigns, eq(sponsoredEcosystems.campaignId, campaigns.id))
      .leftJoin(impactSites, eq(sponsoredEcosystems.impactSiteId, impactSites.id))
      .where(eq(sponsoredEcosystems.userId, userId))
      .orderBy(desc(sponsoredEcosystems.lastUpdatedAt)),
    db
      .select({
        bookingCode: expeditionBookings.bookingCode,
        status: expeditionBookings.status,
        paymentStatus: expeditionBookings.paymentStatus,
        participantsCount: expeditionBookings.participantsCount,
        totalAmount: expeditionBookings.totalAmount,
        bookedAt: expeditionBookings.bookedAt,
        confirmedAt: expeditionBookings.confirmedAt,
        bookingMetadata: expeditionBookings.metadata,
        expeditionTitle: expeditions.title,
        expeditionSlug: expeditions.slug,
        expeditionRegion: expeditions.region,
        expeditionImageUrl: expeditions.imageUrl,
        durationDays: expeditions.durationDays,
        startsAt: expeditionDepartures.startsAt,
        endsAt: expeditionDepartures.endsAt,
        departureStatus: expeditionDepartures.status,
        departureMetadata: expeditionDepartures.metadata
      })
      .from(expeditionBookings)
      .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
      .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
      .where(eq(expeditionBookings.userId, userId))
      .orderBy(desc(expeditionBookings.bookedAt)),
    db
      .select({
        enrollmentId: courseEnrollments.id,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseLevel: courses.level,
        courseSummary: courses.summary,
        courseImageUrl: courses.imageUrl,
        durationMinutes: courses.durationMinutes,
        status: courseEnrollments.status,
        enrolledAt: courseEnrollments.enrolledAt,
        completedAt: courseEnrollments.completedAt,
        metadata: courseEnrollments.metadata
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(desc(courseEnrollments.enrolledAt)),
    db
      .select({
        enrollmentId: courseEnrollments.id,
        lessonId: courseLessons.id,
        lessonTitle: courseLessons.title,
        lessonPosition: courseLessons.position,
        lessonDurationMinutes: courseLessons.durationMinutes,
        progressStatus: lessonProgress.status,
        completedAt: lessonProgress.completedAt
      })
      .from(courseEnrollments)
      .innerJoin(courseLessons, eq(courseEnrollments.courseId, courseLessons.courseId))
      .leftJoin(
        lessonProgress,
        and(eq(lessonProgress.enrollmentId, courseEnrollments.id), eq(lessonProgress.lessonId, courseLessons.id))
      )
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(asc(courseLessons.position)),
    db
      .select({
        certificateNumber: courseCertificates.certificateNumber,
        publicSlug: courseCertificates.publicSlug,
        issuedAt: courseCertificates.issuedAt,
        courseTitle: courses.title,
        courseSlug: courses.slug
      })
      .from(courseCertificates)
      .innerJoin(courses, eq(courseCertificates.courseId, courses.id))
      .where(eq(courseCertificates.userId, userId))
      .orderBy(desc(courseCertificates.issuedAt)),
    db
      .select({
        id: campaignUpdates.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        title: campaignUpdates.title,
        body: campaignUpdates.body,
        imageUrl: campaignUpdates.imageUrl,
        publishedAt: campaignUpdates.publishedAt,
        createdAt: campaignUpdates.createdAt
      })
      .from(campaignUpdates)
      .innerJoin(campaigns, eq(campaignUpdates.campaignId, campaigns.id))
      .innerJoin(donations, and(eq(donations.campaignId, campaigns.id), eq(donations.userId, userId)))
      .where(eq(donations.status, "paid"))
      .orderBy(desc(campaignUpdates.publishedAt))
      .limit(10),
    db
      .select({
        id: projectEvidence.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        evidenceCode: projectEvidence.evidenceCode,
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        fileUrl: projectEvidence.fileUrl,
        verificationStatus: projectEvidence.verificationStatus,
        verifiedAt: projectEvidence.verifiedAt,
        createdAt: projectEvidence.createdAt,
        siteName: impactSites.name,
        siteRegion: impactSites.region
      })
      .from(projectEvidence)
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .innerJoin(donations, and(eq(donations.campaignId, campaigns.id), eq(donations.userId, userId)))
      .leftJoin(impactSites, eq(projectEvidence.impactSiteId, impactSites.id))
      .where(eq(donations.status, "paid"))
      .orderBy(desc(projectEvidence.verifiedAt))
      .limit(10),
    db
      .select({
        id: impactPassportItems.id,
        itemType: impactPassportItems.itemType,
        title: impactPassportItems.title,
        description: impactPassportItems.description,
        evidenceUrl: impactPassportItems.evidenceUrl,
        occurredAt: impactPassportItems.occurredAt,
        metadata: impactPassportItems.metadata
      })
      .from(impactPassports)
      .innerJoin(impactPassportItems, eq(impactPassportItems.passportId, impactPassports.id))
      .where(eq(impactPassports.userId, userId))
      .orderBy(desc(impactPassportItems.occurredAt))
      .limit(12),
    db
      .select({
        name: impactSites.name,
        type: impactSites.ecosystemType,
        region: impactSites.region,
        latitude: impactSites.latitude,
        longitude: impactSites.longitude,
        metadata: impactSites.metadata,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        amount: donations.amount
      })
      .from(impactSites)
      .innerJoin(campaigns, eq(impactSites.campaignId, campaigns.id))
      .innerJoin(donations, and(eq(donations.campaignId, campaigns.id), eq(donations.userId, userId)))
      .where(eq(donations.status, "paid"))
      .orderBy(asc(impactSites.name)),
    db
      .select({
        title: courses.title,
        slug: courses.slug,
        level: courses.level,
        durationMinutes: courses.durationMinutes,
        summary: courses.summary,
        imageUrl: courses.imageUrl
      })
      .from(courses)
      .orderBy(asc(courses.title)),
    getPassportPreviewForUser(userId)
  ]);

  const profileRow = profile[0] ?? null;
  const paidDonations = donationRows.filter((donation) => donation.status === "paid");
  const totalDonated = paidDonations.reduce((total, donation) => total + toNumber(donation.amount), 0);
  const coralFragments = ecosystemRows.reduce((total, ecosystem) => total + getMetadataNumber(ecosystem.metadata, "fragments"), 0);
  const seedlings = ecosystemRows.reduce((total, ecosystem) => total + getMetadataNumber(ecosystem.metadata, "seedlings"), 0);
  const healthyCorals = ecosystemRows.reduce((total, ecosystem) => {
    const survivalRate = getMetadataNumber(ecosystem.metadata, "survivalRate");
    return survivalRate >= 90 ? total + getMetadataNumber(ecosystem.metadata, "fragments") : total;
  }, 0);
  const monitoringCorals = Math.max(0, coralFragments - healthyCorals);
  const completedCourses = enrollmentRows.filter((enrollment) => enrollment.status === "completed").length;
  const volunteerHours = passportItemRows.reduce((total, item) => total + getMetadataNumber(item.metadata, "hours"), 0);
  const updateRows = dedupeById(updateRowsRaw).filter((update) => update.publishedAt ?? update.createdAt);
  const evidenceRows = dedupeById(evidenceRowsRaw);
  const latestUpdateByCampaign = new Map(updateRows.map((update) => [update.campaignSlug, update]));
  const donationAmountByCampaign = new Map<string, number>();

  for (const donation of paidDonations) {
    donationAmountByCampaign.set(donation.campaignSlug, (donationAmountByCampaign.get(donation.campaignSlug) ?? 0) + toNumber(donation.amount));
  }

  const campaignContributions = Array.from(
    paidDonations.reduce((contributions, donation) => {
      const existing = contributions.get(donation.campaignSlug);
      const amount = toNumber(donation.amount);
      const progress = Math.min(100, Math.round((toNumber(donation.campaignRaisedAmount) / Math.max(1, toNumber(donation.campaignGoalAmount))) * 100));
      const contributionIntent = getMetadataString(donation.transactionPayload, "contributionIntent");
      const monthlyAmount = contributionIntent === "monthly" ? amount : 0;

      if (!existing) {
        contributions.set(donation.campaignSlug, {
          campaignSlug: donation.campaignSlug,
          campaignTitle: donation.campaignTitle,
          organizationName: donation.organizationName,
          category: donation.campaignCategory,
          region: donation.campaignRegion,
          imageUrl: donation.campaignImageUrl,
          contribution: amount,
          monthlyAmount,
          donationCount: 1,
          latestDonationAt: donation.createdAt,
          receiptNumber: donation.receiptNumber,
          progress,
          statusLabel: `${progress}% funded`,
          latestUpdate: latestUpdateByCampaign.get(donation.campaignSlug) ?? null
        });
        return contributions;
      }

      existing.contribution += amount;
      existing.monthlyAmount += monthlyAmount;
      existing.donationCount += 1;
      if (donation.createdAt > existing.latestDonationAt) {
        existing.latestDonationAt = donation.createdAt;
        existing.receiptNumber = donation.receiptNumber;
      }

      return contributions;
    }, new Map<string, {
      campaignSlug: string;
      campaignTitle: string;
      organizationName: string;
      category: string;
      region: string;
      imageUrl: string | null;
      contribution: number;
      monthlyAmount: number;
      donationCount: number;
      latestDonationAt: Date;
      receiptNumber: string | null;
      progress: number;
      statusLabel: string;
      latestUpdate: (typeof updateRows)[number] | null;
    }>())
  ).map(([, contribution]) => contribution);

  const lessonStats = lessonRows.reduce((stats, lesson) => {
    const existing = stats.get(lesson.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: 0,
      remainingMinutes: 0,
      nextLessonTitle: null as string | null
    };
    const completed = lesson.progressStatus === "completed";

    existing.totalLessons += 1;
    existing.completedLessons += completed ? 1 : 0;
    existing.remainingMinutes += completed ? 0 : lesson.lessonDurationMinutes;
    if (!completed && !existing.nextLessonTitle) {
      existing.nextLessonTitle = lesson.lessonTitle;
    }
    stats.set(lesson.enrollmentId, existing);

    return stats;
  }, new Map<string, { totalLessons: number; completedLessons: number; remainingMinutes: number; nextLessonTitle: string | null }>());

  const enrollmentsWithProgress = enrollmentRows.map((enrollment) => {
    const stats = lessonStats.get(enrollment.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: enrollment.status === "completed" ? 1 : 0,
      remainingMinutes: enrollment.status === "completed" ? 0 : enrollment.durationMinutes,
      nextLessonTitle: null
    };
    const percent = enrollment.status === "completed" ? 100 : Math.round((stats.completedLessons / Math.max(1, stats.totalLessons)) * 100);

    return {
      ...enrollment,
      totalLessons: stats.totalLessons,
      completedLessons: stats.completedLessons,
      progressPercent: percent,
      remainingMinutes: stats.remainingMinutes,
      nextLessonTitle: stats.nextLessonTitle
    };
  });
  const enrolledCourseSlugs = new Set(enrollmentRows.map((enrollment) => enrollment.courseSlug));
  const recommendedCourse = courseRows.find((course) => !enrolledCourseSlugs.has(course.slug)) ?? null;
  const continueLearning = enrollmentsWithProgress.find((enrollment) => enrollment.status === "active" || enrollment.progressPercent < 100) ?? null;

  const months = Array.from({ length: 6 }, (_, index) => addMonths(now, index - 5));
  const trendBuckets = months.map((month) => ({
    key: monthKey(month),
    label: monthLabel(month),
    contributions: 0,
    corals: 0,
    activities: 0,
    learning: 0
  }));
  const trendByKey = new Map(trendBuckets.map((bucket) => [bucket.key, bucket]));

  for (const donation of paidDonations) {
    const bucket = trendByKey.get(monthKey(donation.createdAt));
    if (bucket) {
      bucket.contributions += toNumber(donation.amount);
    }
  }
  for (const ecosystem of ecosystemRows) {
    const activityDate = ecosystem.plantedAt ?? ecosystem.lastUpdatedAt;
    const bucket = activityDate ? trendByKey.get(monthKey(activityDate)) : null;
    if (bucket) {
      bucket.corals += ecosystemQuantity(ecosystem.metadata);
    }
  }
  for (const booking of bookingRows) {
    const bucket = trendByKey.get(monthKey(booking.bookedAt));
    if (bucket) {
      bucket.activities += 1;
    }
  }
  for (const enrollment of enrollmentRows) {
    const bucket = enrollment.completedAt ? trendByKey.get(monthKey(enrollment.completedAt)) : null;
    if (bucket) {
      bucket.learning += 1;
    }
  }
  for (const certificate of certificateRows) {
    const bucket = trendByKey.get(monthKey(certificate.issuedAt));
    if (bucket) {
      bucket.learning += 1;
    }
  }

  const personalMapSites = Array.from(
    personalSiteRows.reduce((sites, site) => {
      const key = `${site.campaignSlug}:${site.name}`;
      const existing = sites.get(key) ?? {
        name: site.name,
        type: site.type,
        region: site.region,
        campaignSlug: site.campaignSlug,
        campaignTitle: site.campaignTitle,
        progress: getMetadataNumber(site.metadata, "progress"),
        latitude: toNumber(site.latitude),
        longitude: toNumber(site.longitude),
        verification: verificationLabel(getMetadataString(site.metadata, "verification")),
        evidenceCount: getMetadataNumber(site.metadata, "evidenceCount"),
        latestSurvey: getMetadataString(site.metadata, "latestSurvey"),
        contributed: 0,
        supportedUnits: 0
      };

      existing.contributed += toNumber(site.amount);
      existing.supportedUnits += ecosystemRows
        .filter((ecosystem) => ecosystem.campaignSlug === site.campaignSlug)
        .reduce((total, ecosystem) => total + ecosystemQuantity(ecosystem.metadata), 0);
      sites.set(key, existing);

      return sites;
    }, new Map<string, {
      name: string;
      type: string;
      region: string;
      campaignSlug: string;
      campaignTitle: string;
      progress: number;
      latitude: number;
      longitude: number;
      verification: string;
      evidenceCount: number;
      latestSurvey: string | null;
      contributed: number;
      supportedUnits: number;
    }>())
  ).map(([, site]) => ({ ...site, supportedUnits: Math.max(site.supportedUnits, donationAmountByCampaign.has(site.campaignSlug) ? 1 : 0) }));

  const coralCards = ecosystemRows.map((ecosystem) => {
    const quantity = ecosystemQuantity(ecosystem.metadata);
    const survivalRate = getMetadataNumber(ecosystem.metadata, "survivalRate");
    const latestSurvey = getMetadataString(ecosystem.siteMetadata, "latestSurvey") ?? getMetadataString(ecosystem.metadata, "latestSurvey");

    return {
      code: ecosystem.code,
      label: ecosystem.label,
      status: ecosystem.status,
      statusLabel: survivalRate >= 90 ? "Healthy" : ecosystem.status === "monitored" ? "Stable" : "Monitoring",
      campaignTitle: ecosystem.campaignTitle,
      campaignSlug: ecosystem.campaignSlug,
      imageUrl: ecosystem.campaignImageUrl,
      location: ecosystem.siteName ? `${ecosystem.siteName}, ${ecosystem.siteRegion ?? ecosystem.campaignRegion}` : ecosystem.campaignRegion,
      plantedAt: ecosystem.plantedAt,
      lastUpdatedAt: ecosystem.lastUpdatedAt,
      nextUpdateLabel: nextQuarterDate(ecosystem.lastUpdatedAt),
      quantity,
      unit: ecosystemUnit(ecosystem.metadata),
      fragments: getMetadataNumber(ecosystem.metadata, "fragments"),
      seedlings: getMetadataNumber(ecosystem.metadata, "seedlings"),
      survivalRate,
      latestSurvey
    };
  });

  const upcomingBooking =
    bookingRows
      .filter((booking) => booking.startsAt >= now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ??
    bookingRows.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0] ??
    null;
  const preparationChecklist = upcomingBooking
    ? [
        { label: "Payment completed", complete: upcomingBooking.paymentStatus === "paid" },
        { label: "Participant details completed", complete: upcomingBooking.participantsCount > 0 },
        { label: "Waiver signed", complete: getMetadataString(upcomingBooking.bookingMetadata, "waiverSigned") === "true" },
        { label: "Equipment list reviewed", complete: getMetadataString(upcomingBooking.bookingMetadata, "equipmentReviewed") === "true" },
        { label: "Briefing completed", complete: getMetadataString(upcomingBooking.bookingMetadata, "briefingCompleted") === "true" }
      ]
    : [];
  const upcomingExpedition = upcomingBooking
    ? {
        ...upcomingBooking,
        durationLabel: `${upcomingBooking.durationDays} days / ${Math.max(0, upcomingBooking.durationDays - 1)} nights`,
        startsInDays: daysUntil(upcomingBooking.startsAt, now),
        meetingPoint: getMetadataString(upcomingBooking.departureMetadata, "meetingPoint"),
        guide: getMetadataString(upcomingBooking.departureMetadata, "guide"),
        preparationChecklist,
        preparationComplete: preparationChecklist.filter((item) => item.complete).length,
        preparationTotal: preparationChecklist.length
      }
    : null;

  const latestImpactUpdate =
    updateRows[0]
      ? {
          type: "Campaign update",
          title: updateRows[0].title,
          campaignTitle: updateRows[0].campaignTitle,
          body: updateRows[0].body,
          imageUrl: updateRows[0].imageUrl,
          date: updateRows[0].publishedAt ?? updateRows[0].createdAt,
          status: evidenceRows[0]?.verificationStatus === "verified" ? "Verified" : "Published",
          metricLabel: evidenceRows[0]?.siteName ? `Latest evidence: ${evidenceRows[0].siteName}` : "New field update",
          href: `/campaigns/${updateRows[0].campaignSlug}#updates`
        }
      : evidenceRows[0]
        ? {
            type: "Evidence",
            title: evidenceRows[0].title,
            campaignTitle: evidenceRows[0].campaignTitle,
            body: `${evidenceRows[0].evidenceType} evidence is ${evidenceRows[0].verificationStatus}.`,
            imageUrl: evidenceRows[0].fileUrl,
            date: evidenceRows[0].verifiedAt ?? evidenceRows[0].createdAt,
            status: evidenceRows[0].verificationStatus,
            metricLabel: evidenceRows[0].siteName ? `${evidenceRows[0].siteName}, ${evidenceRows[0].siteRegion}` : evidenceRows[0].evidenceCode,
            href: `/campaigns/${evidenceRows[0].campaignSlug}#evidence`
          }
        : null;

  const firstPaidDonation = [...paidDonations].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null;
  const achievements = [
    {
      name: "First Contribution",
      description: "Completed the first conservation contribution.",
      criteria: "Make one paid contribution",
      progress: Math.min(1, paidDonations.length),
      target: 1,
      earnedAt: firstPaidDonation?.createdAt ?? null,
      icon: "heart"
    },
    {
      name: "Coral Guardian",
      description: "Sponsored 10 coral fragments.",
      criteria: "Sponsor 10 coral fragments",
      progress: Math.min(10, coralFragments),
      target: 10,
      earnedAt: coralFragments >= 10 ? ecosystemRows[0]?.plantedAt ?? ecosystemRows[0]?.lastUpdatedAt ?? null : null,
      icon: "coral"
    },
    {
      name: "Field Explorer",
      description: "Joined the first conservation expedition.",
      criteria: "Confirm one expedition booking",
      progress: Math.min(1, bookingRows.filter((booking) => ["confirmed", "completed"].includes(booking.status)).length),
      target: 1,
      earnedAt: bookingRows.find((booking) => ["confirmed", "completed"].includes(booking.status))?.confirmedAt ?? null,
      icon: "map"
    },
    {
      name: "Ocean Learner",
      description: "Completed five academy courses.",
      criteria: "Complete 5 courses",
      progress: Math.min(5, completedCourses),
      target: 5,
      earnedAt: completedCourses >= 5 ? enrollmentRows.find((enrollment) => enrollment.status === "completed")?.completedAt ?? null : null,
      icon: "academy"
    },
    {
      name: "Impact Advocate",
      description: "Shared a public Impact Passport.",
      criteria: "Set passport visibility to public or link-only",
      progress: profileRow?.passportVisibility && profileRow.passportVisibility !== "private" ? 1 : 0,
      target: 1,
      earnedAt: profileRow?.passportVisibility && profileRow.passportVisibility !== "private" ? now : null,
      icon: "share"
    }
  ].map((achievement) => ({
    ...achievement,
    earned: achievement.progress >= achievement.target,
    progressPercent: Math.round((achievement.progress / Math.max(1, achievement.target)) * 100)
  }));

  const timelineItems = [
    ...paidDonations.map((donation) => ({
      id: `donation-${donation.id}`,
      category: "Donations",
      title: `Donated ${formatCurrency(toNumber(donation.amount))}`,
      description: donation.campaignTitle,
      occurredAt: donation.createdAt,
      href: `/campaigns/${donation.campaignSlug}`
    })),
    ...coralCards.map((ecosystem) => ({
      id: `ecosystem-${ecosystem.code}`,
      category: "Impact",
      title: `Sponsored ${ecosystem.quantity.toLocaleString("id-ID")} ${ecosystem.unit}`,
      description: ecosystem.label,
      occurredAt: ecosystem.plantedAt ?? ecosystem.lastUpdatedAt ?? now,
      href: `/dashboard/corals/${ecosystem.code}`
    })),
    ...bookingRows.map((booking) => ({
      id: `booking-${booking.bookingCode}`,
      category: "Expeditions",
      title: `Joined ${booking.expeditionTitle}`,
      description: `${booking.status} booking for ${booking.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}`,
      occurredAt: booking.bookedAt,
      href: "/dashboard/expeditions"
    })),
    ...certificateRows.map((certificate) => ({
      id: `certificate-${certificate.certificateNumber}`,
      category: "Learning",
      title: "Certificate awarded",
      description: certificate.courseTitle,
      occurredAt: certificate.issuedAt,
      href: `/passport/${profileRow?.publicSlug ?? ""}`
    })),
    ...updateRows.slice(0, 4).map((update) => ({
      id: `update-${update.id}`,
      category: "Updates",
      title: update.title,
      description: update.campaignTitle,
      occurredAt: update.publishedAt ?? update.createdAt,
      href: `/campaigns/${update.campaignSlug}#updates`
    })),
    ...passportItemRows.slice(0, 4).map((item) => ({
      id: `passport-${item.id}`,
      category: "Achievements",
      title: item.title,
      description: item.description ?? "Verified activity added to your Impact Passport.",
      occurredAt: item.occurredAt,
      href: item.evidenceUrl ?? `/passport/${profileRow?.publicSlug ?? ""}`
    }))
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 8);

  const notifications = [
    latestImpactUpdate
      ? {
          id: "latest-impact",
          category: "Impact updates",
          message: `${latestImpactUpdate.title} is ready to review.`,
          timestamp: latestImpactUpdate.date,
          href: latestImpactUpdate.href,
          unread: true,
          tone: "impact"
        }
      : null,
    evidenceRows[0]
      ? {
          id: "latest-evidence",
          category: "Evidence",
          message: `${evidenceRows[0].title} is ${evidenceRows[0].verificationStatus}.`,
          timestamp: evidenceRows[0].verifiedAt ?? evidenceRows[0].createdAt,
          href: `/campaigns/${evidenceRows[0].campaignSlug}#evidence`,
          unread: true,
          tone: "evidence"
        }
      : null,
    upcomingExpedition
      ? {
          id: "expedition-prep",
          category: "Expeditions",
          message: `${upcomingExpedition.expeditionTitle} preparation is ${upcomingExpedition.preparationComplete}/${upcomingExpedition.preparationTotal} complete.`,
          timestamp: upcomingExpedition.bookedAt,
          href: "/dashboard/expeditions",
          unread: upcomingExpedition.preparationComplete < upcomingExpedition.preparationTotal,
          tone: "expedition"
        }
      : null,
    certificateRows[0]
      ? {
          id: "certificate",
          category: "Academy",
          message: `${certificateRows[0].courseTitle} certificate is available.`,
          timestamp: certificateRows[0].issuedAt,
          href: "/dashboard/certificates",
          unread: false,
          tone: "learning"
        }
      : null
  ].filter(isDefined);

  const recommendations = [
    upcomingExpedition && upcomingExpedition.preparationComplete < upcomingExpedition.preparationTotal
      ? {
          type: "Travel",
          title: "Complete your expedition preparation",
          reason: `${upcomingExpedition.expeditionTitle} starts in ${upcomingExpedition.startsInDays} days.`,
          href: "/dashboard/expeditions",
          action: "Manage booking"
        }
      : null,
    continueLearning && continueLearning.progressPercent < 100
      ? {
          type: "Learn",
          title: `Continue ${continueLearning.courseTitle}`,
          reason: `${continueLearning.progressPercent}% complete with ${continueLearning.remainingMinutes} minutes remaining.`,
          href: `/academy/courses/${continueLearning.courseSlug}`,
          action: "Continue learning"
        }
      : recommendedCourse
        ? {
            type: "Learn",
            title: recommendedCourse.title,
            reason: ecosystemRows.some((ecosystem) => ecosystem.campaignTitle.toLowerCase().includes("reef"))
              ? "Recommended because you support coral restoration."
              : "Recommended based on your conservation activity.",
            href: `/academy/courses/${recommendedCourse.slug}`,
            action: "Start course"
          }
        : null,
    latestImpactUpdate
      ? {
          type: "Review",
          title: "Review your latest impact update",
          reason: latestImpactUpdate.metricLabel,
          href: latestImpactUpdate.href,
          action: "View update"
        }
      : null,
    profileRow?.passportVisibility === "private"
      ? {
          type: "Share",
          title: "Publish your Impact Passport",
          reason: "Your public profile is private until you choose to share it.",
          href: "/dashboard/settings",
          action: "Manage visibility"
        }
      : null,
    coralFragments > 0 && coralFragments < 10
      ? {
          type: "Sponsor",
          title: "Reach the Coral Guardian badge",
          reason: `${Math.max(0, 10 - coralFragments)} more coral fragments unlock the badge.`,
          href: "/campaigns",
          action: "Find coral projects"
        }
      : null
  ].filter(isDefined).slice(0, 3);

  const profileFields = [
    profileRow?.name,
    profileRow?.displayName,
    profileRow?.location,
    profileRow?.bio,
    profileRow?.passportVisibility && profileRow.passportVisibility !== "private" ? profileRow.passportVisibility : null
  ];
  const profileCompleteness = {
    percent: Math.round((profileFields.filter(isDefined).length / profileFields.length) * 100),
    missing: [
      profileRow?.location ? null : "Location",
      profileRow?.bio ? null : "Bio",
      profileRow?.passportVisibility && profileRow.passportVisibility !== "private" ? null : "Passport visibility"
    ].filter(isDefined)
  };

  const monthlyReport = {
    label: `${fullMonthLabel(now)} Impact Report`,
    contributions: paidDonations.filter((donation) => isSameMonth(donation.createdAt, now)).reduce((total, donation) => total + toNumber(donation.amount), 0),
    campaignUpdates: updateRows.filter((update) => isSameMonth(update.publishedAt ?? update.createdAt, now)).length,
    newEvidence: evidenceRows.filter((evidence) => isSameMonth(evidence.verifiedAt ?? evidence.createdAt, now)).length,
    coralsMonitored: ecosystemRows.filter((ecosystem) => isSameMonth(ecosystem.lastUpdatedAt, now)).reduce((total, ecosystem) => total + getMetadataNumber(ecosystem.metadata, "fragments"), 0),
    academyProgress: enrollmentRows.filter((enrollment) => isSameMonth(enrollment.completedAt, now)).length,
    ready: paidDonations.length + updateRows.length + evidenceRows.length > 0
  };

  return {
    profile: profileRow,
    summary: {
      totalDonated,
      coralFragments,
      seedlings,
      fieldActivities: bookingRows.length,
      certificates: certificateRows.length,
      campaignsSupported: campaignContributions.length,
      healthyCorals,
      monitoringCorals,
      completedCourses,
      volunteerHours,
      upcomingTrips: bookingRows.filter((booking) => booking.startsAt >= now).length
    },
    trend: trendBuckets,
    latestImpactUpdate,
    personalMapSites,
    campaignContributions,
    coralCards,
    upcomingExpedition,
    academy: {
      enrollments: enrollmentsWithProgress,
      continueLearning,
      recommendedCourse,
      completedCourses,
      certificatesEarned: certificateRows.length,
      inProgressCourses: enrollmentsWithProgress.filter((enrollment) => enrollment.status === "active").length
    },
    achievements,
    timelineItems,
    recommendations,
    notifications,
    monthlyReport,
    profileCompleteness,
    privacyControls: [
      { label: "Passport visibility", value: profileRow?.passportVisibility ?? "private", href: "/dashboard/settings" },
      { label: "Donation value", value: "Private dashboard only", href: "/dashboard/settings" },
      { label: "Approximate impact locations", value: "Enabled", href: "/dashboard/impact" }
    ],
    donations: donationRows,
    ecosystems: ecosystemRows,
    bookings: bookingRows,
    enrollments: enrollmentRows,
    certificates: certificateRows,
    passportPreview
  };
}

export async function getSponsoredEcosystemDetail(userId: string, code: string) {
  const [ecosystem] = await db
    .select({
      code: sponsoredEcosystems.code,
      label: sponsoredEcosystems.label,
      status: sponsoredEcosystems.status,
      plantedAt: sponsoredEcosystems.plantedAt,
      lastUpdatedAt: sponsoredEcosystems.lastUpdatedAt,
      metadata: sponsoredEcosystems.metadata,
      campaignTitle: campaigns.title,
      campaignSlug: campaigns.slug,
      siteName: impactSites.name,
      siteType: impactSites.ecosystemType,
      siteRegion: impactSites.region,
      latitude: impactSites.latitude,
      longitude: impactSites.longitude
    })
    .from(sponsoredEcosystems)
    .innerJoin(campaigns, eq(sponsoredEcosystems.campaignId, campaigns.id))
    .leftJoin(impactSites, eq(sponsoredEcosystems.impactSiteId, impactSites.id))
    .where(and(eq(sponsoredEcosystems.userId, userId), eq(sponsoredEcosystems.code, code)))
    .limit(1);

  if (!ecosystem) {
    return null;
  }

  return {
    ...ecosystem,
    fragments: getMetadataNumber(ecosystem.metadata, "fragments"),
    seedlings: getMetadataNumber(ecosystem.metadata, "seedlings"),
    progress: getMetadataNumber(ecosystem.metadata, "progress"),
    latestSurvey: getMetadataString(ecosystem.metadata, "latestSurvey"),
    latitude: ecosystem.latitude ? toNumber(ecosystem.latitude) : null,
    longitude: ecosystem.longitude ? toNumber(ecosystem.longitude) : null
  };
}

export async function getDonationCheckoutOptions() {
  return getCampaignCards();
}

export async function getExpeditionCheckoutOptions() {
  const rows = await db
    .select({
      expeditionId: expeditions.id,
      expeditionSlug: expeditions.slug,
      expeditionTitle: expeditions.title,
      basePrice: expeditions.basePrice,
      departureId: expeditionDepartures.id,
      startsAt: expeditionDepartures.startsAt,
      endsAt: expeditionDepartures.endsAt,
      capacity: expeditionDepartures.capacity,
      seatsBooked: expeditionDepartures.seatsBooked,
      status: expeditionDepartures.status
    })
    .from(expeditionDepartures)
    .innerJoin(expeditions, eq(expeditionDepartures.expeditionId, expeditions.id))
    .orderBy(asc(expeditionDepartures.startsAt));

  return rows.map((row) => ({
    ...row,
    basePrice: toNumber(row.basePrice),
    availableSeats: Math.max(0, row.capacity - row.seatsBooked)
  }));
}

export async function getCorporateDashboardData(userId: string) {
  const now = new Date();
  const [program] = await db
    .select({
      accountName: corporateAccounts.name,
      accountLogoUrl: corporateAccounts.logoUrl,
      accountId: corporateAccounts.id,
      programId: corporatePrograms.id,
      programName: corporatePrograms.name,
      programSlug: corporatePrograms.slug,
      startsAt: corporatePrograms.startsAt,
      endsAt: corporatePrograms.endsAt,
      budgetAmount: corporatePrograms.budgetAmount,
      currency: corporatePrograms.currency,
      status: corporatePrograms.status,
      permission: corporatePermissions.permission
    })
    .from(corporatePermissions)
    .innerJoin(corporateAccounts, eq(corporatePermissions.corporateAccountId, corporateAccounts.id))
    .innerJoin(corporatePrograms, eq(corporatePrograms.corporateAccountId, corporateAccounts.id))
    .where(eq(corporatePermissions.userId, userId))
    .limit(1);

  if (!program) {
    return null;
  }

  const [budgets, employees, portfolio, evidence, exports] = await Promise.all([
    db
      .select({
        category: corporateProgramBudgets.category,
        allocatedAmount: corporateProgramBudgets.allocatedAmount,
        spentAmount: corporateProgramBudgets.spentAmount,
        metadata: corporateProgramBudgets.metadata
      })
      .from(corporateProgramBudgets)
      .where(eq(corporateProgramBudgets.programId, program.programId)),
    db
      .select({
        name: corporateEmployees.name,
        email: corporateEmployees.email,
        department: corporateEmployees.department,
        role: corporateEmployees.role,
        status: corporateEmployees.status
      })
      .from(corporateEmployees)
      .where(eq(corporateEmployees.corporateAccountId, program.accountId)),
    db
      .select({
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        campaignCategory: campaigns.category,
        region: campaigns.region,
        imageUrl: campaigns.imageUrl,
        goalAmount: campaigns.goalAmount,
        raisedAmount: campaigns.raisedAmount,
        impactTarget: campaigns.impactTarget,
        impactUnit: campaigns.impactUnit,
        campaignStatus: campaigns.status,
        endsAt: campaigns.endsAt,
        organizationName: organizations.name,
        organizationVerification: organizations.verification,
        allocationAmount: corporateProjectPortfolio.allocationAmount,
        status: corporateProjectPortfolio.status,
        createdAt: corporateProjectPortfolio.createdAt
      })
      .from(corporateProjectPortfolio)
      .innerJoin(campaigns, eq(corporateProjectPortfolio.campaignId, campaigns.id))
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .where(eq(corporateProjectPortfolio.programId, program.programId)),
    db
      .select({
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        verificationStatus: projectEvidence.verificationStatus,
        fileUrl: projectEvidence.fileUrl,
        campaignTitle: campaigns.title,
        organizationName: organizations.name,
        siteName: impactSites.name,
        siteRegion: impactSites.region,
        visibility: corporateEvidenceCenter.visibility,
        verifiedAt: projectEvidence.verifiedAt,
        addedAt: corporateEvidenceCenter.addedAt
      })
      .from(corporateEvidenceCenter)
      .innerJoin(projectEvidence, eq(corporateEvidenceCenter.evidenceId, projectEvidence.id))
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .leftJoin(impactSites, eq(projectEvidence.impactSiteId, impactSites.id))
      .where(eq(corporateEvidenceCenter.programId, program.programId))
      .orderBy(desc(corporateEvidenceCenter.addedAt)),
    db
      .select({
        exportCode: corporateReportExports.exportCode,
        status: corporateReportExports.status,
        fileUrl: corporateReportExports.fileUrl,
        createdAt: corporateReportExports.createdAt
      })
      .from(corporateReportExports)
      .where(eq(corporateReportExports.programId, program.programId))
      .orderBy(desc(corporateReportExports.createdAt))
  ]);

  const totalAllocated = budgets.reduce((total, budget) => total + toNumber(budget.allocatedAmount), 0);
  const totalSpent = budgets.reduce((total, budget) => total + toNumber(budget.spentAmount), 0);
  const budgetUsed = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  const committedFunding = toNumber(program.budgetAmount);
  const fundsDisbursed = totalAllocated;
  const verifiedUtilization = totalSpent;
  const pendingVerification = Math.max(0, fundsDisbursed - verifiedUtilization);
  const remainingCommitment = Math.max(0, committedFunding - fundsDisbursed);
  const disbursementRate = committedFunding > 0 ? Math.round((fundsDisbursed / committedFunding) * 100) : 0;
  const verifiedUtilizationRate = fundsDisbursed > 0 ? Math.round((verifiedUtilization / fundsDisbursed) * 100) : 0;
  const periodTotal = Math.max(1, program.endsAt.getTime() - program.startsAt.getTime());
  const periodProgress = Math.min(100, Math.max(0, Math.round(((now.getTime() - program.startsAt.getTime()) / periodTotal) * 100)));
  const nextReportingDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 15);

  function normalizeProjectStatus(rawStatus: string, utilization: number) {
    const value = rawStatus.toLowerCase();

    if (value.includes("risk") || value.includes("suspended")) {
      return "At Risk";
    }

    if (value.includes("review") || value.includes("verification")) {
      return "Awaiting Verification";
    }

    if (value.includes("attention") || value.includes("delay") || utilization < 65) {
      return "Needs Attention";
    }

    if (value.includes("complete")) {
      return "Completed";
    }

    return "On Track";
  }

  const portfolioRows = portfolio.map((project) => {
    const progress = Math.min(100, Math.round((toNumber(project.raisedAmount) / Math.max(1, toNumber(project.goalAmount))) * 100));
    const utilization = Math.min(100, Math.max(35, progress));
    const impactProgress = Math.min(100, Math.max(30, Math.round(progress * 0.95)));
    const statusLabel = normalizeProjectStatus(project.status, utilization);
    const nextMilestoneDate = project.endsAt ?? addMonths(now, 1);

    return {
      ...project,
      organizationVerification: verificationLabel(project.organizationVerification),
      allocationValue: toNumber(project.allocationAmount),
      utilization,
      impactProgress,
      statusLabel,
      statusExplanation:
        statusLabel === "On Track"
          ? "Work and reporting are progressing against the current plan."
          : statusLabel === "Needs Attention"
            ? "A schedule, evidence, or utilization checkpoint needs review."
            : statusLabel === "Awaiting Verification"
              ? "Partner evidence is submitted and awaiting review."
              : statusLabel === "At Risk"
                ? "A material delivery or financial issue needs escalation."
                : "Final activities and reporting are being closed.",
      nextMilestone: statusLabel === "Awaiting Verification" ? "Evidence review" : statusLabel === "Needs Attention" ? "Partner clarification" : "Next monitoring report",
      nextMilestoneDate
    };
  });

  const restorationUnits = portfolioRows.reduce((total, project) => total + project.impactTarget, 0);
  const coralUnits = portfolioRows
    .filter((project) => `${project.campaignCategory} ${project.impactUnit}`.toLowerCase().includes("coral"))
    .reduce((total, project) => total + project.impactTarget, 0);
  const mangroveUnits = portfolioRows
    .filter((project) => `${project.campaignCategory} ${project.impactUnit}`.toLowerCase().includes("mangrove"))
    .reduce((total, project) => total + project.impactTarget, 0);
  const employeesEngaged = employees.filter((employee) => employee.status === "active").length;
  const eligibleEmployees = Math.max(employees.length, employeesEngaged);
  const participationRate = eligibleEmployees > 0 ? Math.round((employeesEngaged / eligibleEmployees) * 100) : 0;
  const activityCount = Math.max(1, evidence.length + portfolioRows.length);
  const volunteerHours = employeesEngaged * 5;
  const provinces = new Set(portfolioRows.map((project) => project.region));
  const partners = new Set(portfolioRows.map((project) => project.organizationName));
  const projectHealth = [
    { label: "On Track", count: portfolioRows.filter((project) => project.statusLabel === "On Track").length, tone: "kelp" },
    { label: "Needs Attention", count: portfolioRows.filter((project) => project.statusLabel === "Needs Attention").length, tone: "amber" },
    { label: "At Risk", count: portfolioRows.filter((project) => project.statusLabel === "At Risk").length, tone: "red" },
    { label: "Awaiting Verification", count: portfolioRows.filter((project) => project.statusLabel === "Awaiting Verification").length, tone: "ocean" },
    { label: "Completed", count: portfolioRows.filter((project) => project.statusLabel === "Completed").length, tone: "neutral" }
  ];
  const atRiskProjects = projectHealth.find((item) => item.label === "At Risk")?.count ?? 0;
  const needsAttentionProjects = projectHealth.find((item) => item.label === "Needs Attention")?.count ?? 0;
  const verifiedOutputs = evidence.filter((item) => item.verificationStatus === "verified").length;
  const reportExports = exports.map((item) => ({
    ...item,
    reportType: item.exportCode.includes("ESG") ? "Quarterly ESG Report" : "Impact Report",
    verifiedMetrics: Math.max(verifiedOutputs, portfolioRows.length * 3),
    pendingMetrics: Math.max(0, evidence.length - verifiedOutputs)
  }));
  const latestReport = reportExports[0] ?? {
    exportCode: "Q2-2026-ESG-DRAFT",
    status: evidence.length > 0 ? "ready_for_review" : "draft",
    fileUrl: null,
    createdAt: now,
    reportType: "Q2 2026 ESG Report",
    verifiedMetrics: Math.max(verifiedOutputs, portfolioRows.length * 3),
    pendingMetrics: Math.max(0, evidence.length - verifiedOutputs)
  };

  const goalProgress = [
    {
      goal: "Restoration units supported",
      target: Math.max(restorationUnits, 100000),
      current: restorationUnits,
      unit: "units",
      forecast: Math.max(restorationUnits, Math.round(restorationUnits * 1.12))
    },
    {
      goal: "Employees engaged",
      target: Math.max(eligibleEmployees, 2000),
      current: employeesEngaged,
      unit: "employees",
      forecast: Math.max(employeesEngaged, Math.round(employeesEngaged * 1.25))
    },
    {
      goal: "Volunteer hours",
      target: Math.max(volunteerHours, 8000),
      current: volunteerHours,
      unit: "hours",
      forecast: Math.max(volunteerHours, Math.round(volunteerHours * 1.18))
    },
    {
      goal: "Provinces reached",
      target: Math.max(provinces.size, 10),
      current: provinces.size,
      unit: "provinces",
      forecast: Math.max(provinces.size, provinces.size + 1)
    },
    {
      goal: "Verified evidence records",
      target: Math.max(evidence.length + 3, 12),
      current: verifiedOutputs,
      unit: "records",
      forecast: Math.max(verifiedOutputs, evidence.length)
    }
  ].map((goal) => ({
    ...goal,
    progress: Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100)),
    status: goal.current >= goal.target ? "Complete" : goal.current / Math.max(1, goal.target) >= 0.75 ? "On Track" : "Needs Attention"
  }));

  const departmentMap = employees.reduce((departments, employee) => {
    const key = employee.department ?? "Unassigned";
    const existing = departments.get(key) ?? { department: key, employees: 0, active: 0, volunteerHours: 0 };
    existing.employees += 1;
    existing.active += employee.status === "active" ? 1 : 0;
    existing.volunteerHours += employee.status === "active" ? 5 : 0;
    departments.set(key, existing);

    return departments;
  }, new Map<string, { department: string; employees: number; active: number; volunteerHours: number }>());
  const departmentEngagement = Array.from(departmentMap.values()).map((department) => ({
    ...department,
    participationRate: department.employees > 0 ? Math.round((department.active / department.employees) * 100) : 0
  }));
  const trendMonths = Array.from({ length: 6 }, (_, index) => addMonths(now, index - 5));
  const employeeTrend = trendMonths.map((month, index) => {
    const multiplier = 0.45 + index * 0.11;

    return {
      label: monthLabel(month),
      employees: Math.max(0, Math.round(employeesEngaged * multiplier)),
      volunteerHours: Math.max(0, Math.round(volunteerHours * multiplier)),
      academyCompletions: Math.max(0, Math.round(verifiedOutputs * multiplier))
    };
  });
  const budgetVariance = budgets.map((budget) => {
    const planned = toNumber(budget.allocatedAmount);
    const actual = toNumber(budget.spentAmount);
    const variance = planned > 0 ? Math.round(((actual - planned) / planned) * 100) : 0;

    return {
      category: budget.category,
      planned,
      actual,
      variance,
      status: Math.abs(variance) <= 10 ? "Within tolerance" : variance > 10 ? "Requires explanation" : "Below budget"
    };
  });
  const fundingFlow = [
    { label: "Committed", value: committedFunding, percent: 100 },
    { label: "Contracted", value: totalAllocated, percent: committedFunding > 0 ? Math.round((totalAllocated / committedFunding) * 100) : 0 },
    { label: "Disbursed", value: fundsDisbursed, percent: committedFunding > 0 ? Math.round((fundsDisbursed / committedFunding) * 100) : 0 },
    { label: "Utilized", value: verifiedUtilization, percent: committedFunding > 0 ? Math.round((verifiedUtilization / committedFunding) * 100) : 0 },
    { label: "Verified", value: verifiedUtilization, percent: committedFunding > 0 ? Math.round((verifiedUtilization / committedFunding) * 100) : 0 }
  ];
  const riskAlerts = [
    ...portfolioRows
      .filter((project) => project.statusLabel !== "On Track")
      .map((project) => ({
        title: project.campaignTitle,
        description: project.statusExplanation,
        status: project.statusLabel,
        href: "/corporate/projects"
      })),
    ...budgetVariance
      .filter((item) => item.status === "Requires explanation")
      .map((item) => ({
        title: `${item.category} budget variance`,
        description: `Actual spending is ${Math.abs(item.variance)}% ${item.variance > 0 ? "above" : "below"} the approved allocation.`,
        status: "Review",
        href: "/corporate/funding"
      })),
    evidence.some((item) => item.verificationStatus !== "verified")
      ? {
          title: "Evidence awaiting review",
          description: `${evidence.filter((item) => item.verificationStatus !== "verified").length} evidence records need reviewer attention.`,
          status: "Under Review",
          href: "/corporate/evidence"
        }
      : null
  ].filter(isDefined).slice(0, 4);
  const sdgAlignment = [
    { code: "SDG 14", label: "Life Below Water", progress: Math.min(100, Math.max(40, Math.round((coralUnits / Math.max(1, restorationUnits)) * 100))) },
    { code: "SDG 13", label: "Climate Action", progress: Math.min(100, Math.max(35, Math.round((mangroveUnits / Math.max(1, restorationUnits)) * 100) + 25)) },
    { code: "SDG 8", label: "Decent Work & Economic Growth", progress: Math.min(100, Math.max(35, participationRate)) },
    { code: "SDG 4", label: "Quality Education", progress: Math.min(100, Math.max(30, verifiedOutputs * 10)) }
  ];
  const publicImpactPreview = {
    status: "Draft",
    title: `${program.accountName} Ocean Impact Page`,
    metrics: [
      `${formatCurrency(committedFunding)} committed`,
      `${portfolioRows.length.toLocaleString("id-ID")} projects supported`,
      `${employeesEngaged.toLocaleString("id-ID")} employees engaged`
    ]
  };
  const quickActions = [
    { label: "Add Project", href: "/corporate/projects" },
    { label: "Review Evidence", href: "/corporate/evidence" },
    { label: "Generate Report", href: "/corporate/reports" },
    { label: "Invite Team Member", href: "/corporate/settings" },
    { label: "Export Data", href: "/corporate/reports" }
  ];
  const executiveMetrics = [
    {
      label: "Total committed funding",
      value: formatCurrency(committedFunding),
      support: `Across ${portfolioRows.length.toLocaleString("id-ID")} conservation projects`
    },
    {
      label: "Funds disbursed",
      value: formatCurrency(fundsDisbursed),
      support: `${disbursementRate}% of committed budget`
    },
    {
      label: "Verified utilization",
      value: formatCurrency(verifiedUtilization),
      support: `${verifiedUtilizationRate}% of disbursed funds`
    },
    {
      label: "Restoration units supported",
      value: restorationUnits.toLocaleString("id-ID"),
      support: `${coralUnits.toLocaleString("id-ID")} coral · ${mangroveUnits.toLocaleString("id-ID")} mangrove`
    },
    {
      label: "Employees engaged",
      value: employeesEngaged.toLocaleString("id-ID"),
      support: `${participationRate}% of eligible employees`
    },
    {
      label: "Volunteer hours",
      value: volunteerHours.toLocaleString("id-ID"),
      support: `Across ${activityCount.toLocaleString("id-ID")} activities`
    }
  ];

  return {
    program,
    budgets,
    employees,
    portfolio: portfolioRows,
    evidence,
    exports: reportExports,
    executiveMetrics,
    goalProgress,
    projectHealth,
    departmentEngagement,
    employeeTrend,
    budgetVariance,
    fundingFlow,
    riskAlerts,
    sdgAlignment,
    latestReport,
    publicImpactPreview,
    quickActions,
    mapSummary: {
      projects: portfolioRows.length,
      provinces: provinces.size,
      partners: partners.size,
      fieldLocations: Math.max(evidence.length, portfolioRows.length)
    },
    financials: {
      committedFunding,
      fundsDisbursed,
      verifiedUtilization,
      pendingVerification,
      remainingCommitment,
      disbursementRate,
      verifiedUtilizationRate,
      budgetUsed
    },
    impactOutputs: {
      restorationUnits,
      coralUnits,
      mangroveUnits,
      verifiedOutputs,
      volunteerHours,
      activityCount
    },
    reporting: {
      periodProgress,
      nextReportingDeadline
    },
    metrics: {
      budgetUsed,
      employeesEngaged,
      verifiedOutputs,
      atRiskProjects,
      needsAttentionProjects,
      volunteerHours,
      restorationUnits
    }
  };
}

export async function getAdminPortalData() {
  const [campaignRows, evidenceRows, donationRows] = await Promise.all([
    db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        status: campaigns.status,
        raisedAmount: campaigns.raisedAmount,
        goalAmount: campaigns.goalAmount,
        donorCount: campaigns.donorCount,
        partner: organizations.name
      })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .orderBy(desc(campaigns.updatedAt)),
    db
      .select({
        id: projectEvidence.id,
        title: projectEvidence.title,
        evidenceCode: projectEvidence.evidenceCode,
        verificationStatus: projectEvidence.verificationStatus,
        campaignTitle: campaigns.title,
        createdAt: projectEvidence.createdAt
      })
      .from(projectEvidence)
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .orderBy(desc(projectEvidence.createdAt)),
    db
      .select({
        id: donations.id,
        donorName: donations.donorName,
        amount: donations.amount,
        status: donations.status,
        campaignTitle: campaigns.title,
        providerReference: paymentTransactions.providerReference
      })
      .from(donations)
      .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .leftJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
      .orderBy(desc(donations.createdAt))
  ]);

  return {
    campaigns: campaignRows,
    evidence: evidenceRows,
    donations: donationRows
  };
}

export async function getAdminOperationsData() {
  const [partners, expeditionRows, impactSiteRows, reportRows, userRows, auditRows] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        verification: organizations.verification
      })
      .from(organizations)
      .orderBy(asc(organizations.name)),
    db
      .select({
        id: expeditions.id,
        title: expeditions.title,
        slug: expeditions.slug,
        region: expeditions.region,
        basePrice: expeditions.basePrice,
        departureId: expeditionDepartures.id,
        startsAt: expeditionDepartures.startsAt,
        capacity: expeditionDepartures.capacity,
        seatsBooked: expeditionDepartures.seatsBooked,
        status: expeditionDepartures.status
      })
      .from(expeditions)
      .leftJoin(expeditionDepartures, eq(expeditionDepartures.expeditionId, expeditions.id))
      .orderBy(asc(expeditions.title)),
    db
      .select({
        id: impactSites.id,
        name: impactSites.name,
        ecosystemType: impactSites.ecosystemType,
        region: impactSites.region,
        campaignTitle: campaigns.title,
        metadata: impactSites.metadata
      })
      .from(impactSites)
      .leftJoin(campaigns, eq(impactSites.campaignId, campaigns.id))
      .orderBy(asc(impactSites.name)),
    db
      .select({
        exportCode: corporateReportExports.exportCode,
        status: corporateReportExports.status,
        fileUrl: corporateReportExports.fileUrl,
        createdAt: corporateReportExports.createdAt,
        programName: corporatePrograms.name,
        accountName: corporateAccounts.name
      })
      .from(corporateReportExports)
      .innerJoin(corporatePrograms, eq(corporateReportExports.programId, corporatePrograms.id))
      .innerJoin(corporateAccounts, eq(corporatePrograms.corporateAccountId, corporateAccounts.id))
      .orderBy(desc(corporateReportExports.createdAt)),
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        displayName: profiles.displayName,
        createdAt: users.createdAt
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(users.createdAt))
      .limit(100),
    db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        entityType: adminAuditLogs.entityType,
        entityId: adminAuditLogs.entityId,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt,
        actorEmail: users.email
      })
      .from(adminAuditLogs)
      .leftJoin(users, eq(adminAuditLogs.actorUserId, users.id))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(100)
  ]);

  return {
    partners: partners.map((partner) => ({
      ...partner,
      verificationLabel: verificationLabel(partner.verification)
    })),
    expeditions: expeditionRows.map((row) => ({
      ...row,
      basePrice: toNumber(row.basePrice),
      availableSeats: row.capacity === null || row.seatsBooked === null ? null : Math.max(0, row.capacity - row.seatsBooked)
    })),
    impactSites: impactSiteRows.map((site) => ({
      ...site,
      progress: getMetadataNumber(site.metadata, "progress"),
      evidenceCount: getMetadataNumber(site.metadata, "evidenceCount")
    })),
    reports: reportRows,
    users: userRows,
    auditLogs: auditRows
  };
}

export async function getPartnerPortalData() {
  const [campaignRows, evidenceRows, updateRows] = await Promise.all([
    db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        region: campaigns.region,
        status: campaigns.status,
        raisedAmount: campaigns.raisedAmount,
        goalAmount: campaigns.goalAmount
      })
      .from(campaigns)
      .orderBy(desc(campaigns.updatedAt)),
    db
      .select({
        title: projectEvidence.title,
        evidenceCode: projectEvidence.evidenceCode,
        verificationStatus: projectEvidence.verificationStatus,
        campaignTitle: campaigns.title,
        fileUrl: projectEvidence.fileUrl
      })
      .from(projectEvidence)
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .orderBy(desc(projectEvidence.createdAt)),
    db
      .select({
        title: campaignUpdates.title,
        campaignTitle: campaigns.title,
        publishedAt: campaignUpdates.publishedAt
      })
      .from(campaignUpdates)
      .innerJoin(campaigns, eq(campaignUpdates.campaignId, campaigns.id))
      .orderBy(desc(campaignUpdates.publishedAt))
  ]);

  return {
    campaigns: campaignRows,
    evidence: evidenceRows,
    updates: updateRows
  };
}
