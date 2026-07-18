import { and, asc, desc, eq, inArray, lte, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  assessmentAttempts,
  assessmentChoices,
  assessmentQuestions,
  adminAuditLogs,
  campaignActivities,
  campaignBudgetLineItems,
  campaignUpdates,
  campaigns,
  campaignFollowSubscriptions,
  campaignMediaItems,
  campaignTimelinePhases,
  corporateAccounts,
  corporateContributions,
  corporateEmployeeEventRegistrations,
  corporateEmployeeEvents,
  corporateEmployees,
  corporateEmployeeInvites,
  corporateEvidenceCenter,
  corporateIntegrations,
  corporatePermissions,
  corporateProgramBudgets,
  corporatePrograms,
  corporateProjectPortfolio,
  corporateReportExports,
  corporateSecuritySettings,
  courseAssessments,
  courseCertificates,
  courseEnrollments,
  courseLessons,
  courses,
  donationReceipts,
  donationSubscriptions,
  donations,
  evidenceReviewEvents,
  expeditionBookings,
  expeditionDepartures,
  expeditionInterestRequests,
  expeditionReviews,
  expeditions,
  impactPassportItems,
  impactPassports,
  impactSites,
  lessonProgress,
  monthlyImpactReports,
  notificationPreferences,
  organizationTeamMembers,
  organizationUsers,
  organizations,
  paymentOperations,
  paymentTransactions,
  profiles,
  projectEvidence,
  sessions,
  roles,
  sponsoredEcosystems,
  userPaymentMethods,
  userNotifications,
  userSavedCampaigns,
  userSavedCourses,
  userRoles,
  users
} from "@/db/schema";
import {
  assessmentAttemptCount,
  assessmentAttemptHistory,
  buildAssessmentAnalytics,
  selectedChoiceIdsFromAssessmentMetadata
} from "@/lib/academy-assessment";
import { campaignBudgetUtilization, campaignContentCompleteness } from "@/lib/campaign-content";
import { corporateReportArtifactSourceUrl } from "@/lib/corporate-report-artifact-links";
import {
  getMetadataNumber,
  getMetadataNumberOrString,
  getMetadataString,
  daysUntil,
  evidenceSourceHref,
  evidenceStage,
  evidenceStageLabel,
  initialsForName,
  toCampaignCard,
  toExpeditionCard,
  toNumber,
  verificationLabel,
  type CampaignCardData,
  type EvidenceSourceData,
  type ExpeditionCardData,
  type ImpactSiteData,
  type ImpactStatData,
  type PartnerLogoData,
  type PassportPreviewData
} from "@/lib/domain";
import { systemGlobalRoleOptions } from "@/lib/admin-user-management";
import {
  activeSubscriptionStatuses,
  canArchivePaymentMethod,
  canCancelSubscription,
  canUsePaymentMethodForSubscription,
  isPaymentMethodExpired
} from "@/lib/billing-lifecycle";
import { buildCoralEvidenceStream, buildMonitoringHistory } from "@/lib/coral-monitoring";
import { buildCorporateSecurityChecklist, splitAllowedEmailDomains } from "@/lib/corporate-governance";
import {
  corporateEventRegistrationAvailability,
  normalizeCorporateEmployeeEventStatus,
  normalizeCorporateEmployeeEventType,
  normalizeCorporateEventRegistrationStatus
} from "@/lib/corporate-lifecycle";
import { verifyPassword } from "@/lib/password";
import {
  normalizePassportCategoryVisibility,
  normalizePassportEvidenceConsent,
  passportItemIsVisible,
  passportShareAccessProof,
  passportShareAccessStatus
} from "@/lib/passport-sharing";
import { corporateCapabilitiesForPermission } from "@/lib/corporate-permissions";
import { corporateReportFormatLabel, corporateReportTypeLabel, scheduledReportIsDue } from "@/lib/corporate-report-lifecycle";
import { evidenceReviewActionLabel, evidenceReviewStage, evidenceStatusLabel } from "@/lib/evidence-review-workflow";
import {
  buildDefaultExpeditionDetailMetadata,
  expeditionMetadataEditorJson,
  metadataDate,
  normalizeExpeditionDetailMetadata
} from "@/lib/expedition-metadata";
import {
  canCancelExpeditionBooking,
  expeditionDepartureAvailability,
  normalizeExpeditionInterestRequestStatus,
  normalizeExpeditionInterestRequestType
} from "@/lib/expedition-booking-lifecycle";
import { normalizeExpeditionReviewStatus } from "@/lib/expedition-reviews";
import { partnerCapabilitiesForRoles } from "@/lib/partner-permissions";
import { formatCompact, formatCurrency } from "@/lib/utils";

type EvidenceReviewEventSummary = {
  id: string;
  action: string;
  label: string;
  actor: string;
  assignedToUserId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  visibility: string;
  occurredAt: Date;
};

async function getEvidenceReviewEventsByEvidenceIds(evidenceIds: string[]) {
  const uniqueIds = Array.from(new Set(evidenceIds.filter(Boolean)));
  const grouped = new Map<string, EvidenceReviewEventSummary[]>();

  if (uniqueIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({
      id: evidenceReviewEvents.id,
      evidenceId: evidenceReviewEvents.evidenceId,
      action: evidenceReviewEvents.action,
      assignedToUserId: evidenceReviewEvents.assignedToUserId,
      fromStatus: evidenceReviewEvents.fromStatus,
      toStatus: evidenceReviewEvents.toStatus,
      note: evidenceReviewEvents.note,
      visibility: evidenceReviewEvents.visibility,
      createdAt: evidenceReviewEvents.createdAt,
      actorName: users.name,
      actorEmail: users.email
    })
    .from(evidenceReviewEvents)
    .leftJoin(users, eq(evidenceReviewEvents.actorUserId, users.id))
    .where(inArray(evidenceReviewEvents.evidenceId, uniqueIds))
    .orderBy(asc(evidenceReviewEvents.createdAt));

  for (const row of rows) {
    const events = grouped.get(row.evidenceId) ?? [];
    events.push({
      id: row.id,
      action: row.action,
      label: evidenceReviewActionLabel(row.action),
      actor: row.actorName ?? row.actorEmail ?? "Terumbu platform",
      assignedToUserId: row.assignedToUserId,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      note: row.note,
      visibility: row.visibility,
      occurredAt: row.createdAt
    });
    grouped.set(row.evidenceId, events);
  }

  return grouped;
}

function latestEvidenceReviewNote(events: EvidenceReviewEventSummary[], fallback?: string | null) {
  const event = [...events].reverse().find((item) => item.note && item.visibility !== "internal");

  return event?.note ?? fallback ?? null;
}

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

export async function getCampaignRetentionState(userId: string, campaignSlug: string) {
  const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, campaignSlug)).limit(1);

  if (!campaign) {
    return {
      isSaved: false,
      isFollowing: false
    };
  }

  const [saved, follow] = await Promise.all([
    db
      .select({ id: userSavedCampaigns.id, status: userSavedCampaigns.status })
      .from(userSavedCampaigns)
      .where(and(eq(userSavedCampaigns.userId, userId), eq(userSavedCampaigns.campaignId, campaign.id)))
      .limit(1),
    db
      .select({ id: campaignFollowSubscriptions.id, status: campaignFollowSubscriptions.status, frequency: campaignFollowSubscriptions.frequency })
      .from(campaignFollowSubscriptions)
      .where(and(eq(campaignFollowSubscriptions.userId, userId), eq(campaignFollowSubscriptions.campaignId, campaign.id)))
      .limit(1)
  ]);

  return {
    isSaved: saved[0]?.status === "active",
    isFollowing: follow[0]?.status === "active",
    followFrequency: follow[0]?.frequency ?? "weekly"
  };
}

export async function getNotificationPreferences(userId: string) {
  const [preferences] = await db
    .select({
      campaignUpdates: notificationPreferences.campaignUpdates,
      evidenceAlerts: notificationPreferences.evidenceAlerts,
      expeditionReminders: notificationPreferences.expeditionReminders,
      academyUpdates: notificationPreferences.academyUpdates,
      monthlyImpactEmail: notificationPreferences.monthlyImpactEmail,
      monthlyImpactReport: notificationPreferences.monthlyImpactReport
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return preferences ?? defaultNotificationPreferences();
}

export async function getUnreadNotificationCount(userId: string) {
  const [summary] = await db
    .select({ total: sql<number>`count(${userNotifications.id})` })
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), sql`${userNotifications.readAt} is null`));

  return Number(summary?.total ?? 0);
}

export async function getRetentionCenterData(userId: string) {
  const [savedRows, followedRows, notificationRows, reportRows, preferences] = await Promise.all([
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
        verification: organizations.verification,
        savedAt: userSavedCampaigns.savedAt
      })
      .from(userSavedCampaigns)
      .innerJoin(campaigns, eq(userSavedCampaigns.campaignId, campaigns.id))
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .where(and(eq(userSavedCampaigns.userId, userId), eq(userSavedCampaigns.status, "active")))
      .orderBy(desc(userSavedCampaigns.savedAt)),
    db
      .select({
        slug: campaigns.slug,
        title: campaigns.title,
        category: campaigns.category,
        region: campaigns.region,
        imageUrl: campaigns.imageUrl,
        frequency: campaignFollowSubscriptions.frequency,
        followedAt: campaignFollowSubscriptions.createdAt,
        latestUpdateTitle: campaignUpdates.title,
        latestUpdateAt: campaignUpdates.publishedAt
      })
      .from(campaignFollowSubscriptions)
      .innerJoin(campaigns, eq(campaignFollowSubscriptions.campaignId, campaigns.id))
      .leftJoin(campaignUpdates, eq(campaignUpdates.campaignId, campaigns.id))
      .where(and(eq(campaignFollowSubscriptions.userId, userId), eq(campaignFollowSubscriptions.status, "active")))
      .orderBy(desc(campaignFollowSubscriptions.updatedAt), desc(campaignUpdates.publishedAt)),
    db
      .select({
        id: userNotifications.id,
        category: userNotifications.category,
        title: userNotifications.title,
        message: userNotifications.message,
        href: userNotifications.href,
        readAt: userNotifications.readAt,
        createdAt: userNotifications.createdAt
      })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(12),
    db
      .select({
        id: monthlyImpactReports.id,
        reportMonth: monthlyImpactReports.reportMonth,
        status: monthlyImpactReports.status,
        label: monthlyImpactReports.label,
        contributions: monthlyImpactReports.contributions,
        campaignUpdates: monthlyImpactReports.campaignUpdates,
        newEvidence: monthlyImpactReports.newEvidence,
        coralsMonitored: monthlyImpactReports.coralsMonitored,
        academyProgress: monthlyImpactReports.academyProgress,
        emailedAt: monthlyImpactReports.emailedAt,
        metadata: monthlyImpactReports.metadata,
        generatedAt: monthlyImpactReports.generatedAt
      })
      .from(monthlyImpactReports)
      .where(eq(monthlyImpactReports.userId, userId))
      .orderBy(desc(monthlyImpactReports.generatedAt))
      .limit(6),
    getNotificationPreferences(userId)
  ]);
  const followedBySlug = new Map<string, (typeof followedRows)[number]>();

  for (const row of followedRows) {
    if (!followedBySlug.has(row.slug)) {
      followedBySlug.set(row.slug, row);
    }
  }

  return {
    savedCampaigns: savedRows.map((row) => ({
      ...toCampaignCard(row),
      savedAt: row.savedAt
    })),
    followedCampaigns: Array.from(followedBySlug.values()),
    notifications: notificationRows.map((notification) => ({
      ...notification,
      unread: !notification.readAt
    })),
    reports: reportRows.map((report) => ({
      ...report,
      contributions: toNumber(report.contributions)
    })),
    preferences
  };
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
        rejectionReason: projectEvidence.rejectionReason,
        reviewedAt: projectEvidence.reviewedAt,
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

  const [
    updates,
    sites,
    evidence,
    partnerCampaignRows,
    donorActivityRows,
    sponsoredRows,
    mediaRows,
    budgetRows,
    timelineRows,
    teamRows
  ] = await Promise.all([
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
        id: projectEvidence.id,
        evidenceCode: projectEvidence.evidenceCode,
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        fileUrl: projectEvidence.fileUrl,
        verificationStatus: projectEvidence.verificationStatus,
        createdAt: projectEvidence.createdAt,
        verifiedAt: projectEvidence.verifiedAt,
        metadata: projectEvidence.metadata,
        siteName: impactSites.name,
        siteRegion: impactSites.region
      })
      .from(projectEvidence)
      .leftJoin(impactSites, eq(projectEvidence.impactSiteId, impactSites.id))
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
      .limit(6),
    db
      .select({
        id: campaignMediaItems.id,
        title: campaignMediaItems.title,
        mediaType: campaignMediaItems.mediaType,
        fileUrl: campaignMediaItems.fileUrl,
        thumbnailUrl: campaignMediaItems.thumbnailUrl,
        altText: campaignMediaItems.altText,
        caption: campaignMediaItems.caption,
        provenance: campaignMediaItems.provenance,
        sortOrder: campaignMediaItems.sortOrder,
        isFeatured: campaignMediaItems.isFeatured
      })
      .from(campaignMediaItems)
      .where(eq(campaignMediaItems.campaignId, row.id))
      .orderBy(desc(campaignMediaItems.isFeatured), asc(campaignMediaItems.sortOrder), asc(campaignMediaItems.title)),
    db
      .select({
        id: campaignBudgetLineItems.id,
        category: campaignBudgetLineItems.category,
        description: campaignBudgetLineItems.description,
        amount: campaignBudgetLineItems.amount,
        spentAmount: campaignBudgetLineItems.spentAmount,
        sortOrder: campaignBudgetLineItems.sortOrder
      })
      .from(campaignBudgetLineItems)
      .where(eq(campaignBudgetLineItems.campaignId, row.id))
      .orderBy(asc(campaignBudgetLineItems.sortOrder), asc(campaignBudgetLineItems.category)),
    db
      .select({
        id: campaignTimelinePhases.id,
        title: campaignTimelinePhases.title,
        description: campaignTimelinePhases.description,
        status: campaignTimelinePhases.status,
        startsAt: campaignTimelinePhases.startsAt,
        endsAt: campaignTimelinePhases.endsAt,
        deliverable: campaignTimelinePhases.deliverable,
        evidenceNote: campaignTimelinePhases.evidenceNote,
        sortOrder: campaignTimelinePhases.sortOrder
      })
      .from(campaignTimelinePhases)
      .where(eq(campaignTimelinePhases.campaignId, row.id))
      .orderBy(asc(campaignTimelinePhases.sortOrder), asc(campaignTimelinePhases.startsAt)),
    db
      .select({
        id: organizationTeamMembers.id,
        name: organizationTeamMembers.name,
        role: organizationTeamMembers.role,
        bio: organizationTeamMembers.bio,
        imageUrl: organizationTeamMembers.imageUrl,
        profileUrl: organizationTeamMembers.profileUrl,
        sortOrder: organizationTeamMembers.sortOrder
      })
      .from(organizationTeamMembers)
      .where(and(eq(organizationTeamMembers.organizationId, row.organizationId), eq(organizationTeamMembers.isPublic, true)))
      .orderBy(asc(organizationTeamMembers.sortOrder), asc(organizationTeamMembers.name))
  ]);
  const budgetLineItems = budgetRows.map((item) => ({
    ...item,
    amount: toNumber(item.amount),
    spentAmount: toNumber(item.spentAmount)
  }));

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
    mediaGallery: mediaRows,
    budgetLineItems,
    budgetUtilization: campaignBudgetUtilization(budgetLineItems),
    timelinePhases: timelineRows,
    organizationTeam: teamRows,
    contentCompleteness: campaignContentCompleteness({
      media: mediaRows.length,
      budget: budgetRows.length,
      timeline: timelineRows.length,
      team: teamRows.length
    }),
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
        status: expeditionDepartures.status,
        metadata: expeditionDepartures.metadata,
        startsAt: expeditionDepartures.startsAt
      })
      .from(expeditionDepartures)
      .orderBy(asc(expeditionDepartures.startsAt))
  ]);

  const nextDepartureByExpeditionId = new Map<string, (typeof departureRows)[number]>();

  for (const departure of departureRows) {
    const current = nextDepartureByExpeditionId.get(departure.expeditionId);
    const availability = expeditionDepartureAvailability({
      status: departure.status,
      capacity: departure.capacity,
      seatsBooked: departure.seatsBooked,
      minParticipants: getMetadataNumber(departure.metadata, "minParticipants", 6)
    });
    const currentAvailability = current
      ? expeditionDepartureAvailability({
          status: current.status,
          capacity: current.capacity,
          seatsBooked: current.seatsBooked,
          minParticipants: getMetadataNumber(current.metadata, "minParticipants", 6)
        })
      : null;

    if (!current || (!currentAvailability?.canBook && availability.canBook)) {
      nextDepartureByExpeditionId.set(departure.expeditionId, departure);
    }
  }

  const cards = rows.map((row) => {
    const nextDeparture = nextDepartureByExpeditionId.get(row.id);
    const nextAvailability = nextDeparture
      ? expeditionDepartureAvailability({
          status: nextDeparture.status,
          capacity: nextDeparture.capacity,
          seatsBooked: nextDeparture.seatsBooked,
          minParticipants: getMetadataNumber(nextDeparture.metadata, "minParticipants", 6)
        })
      : null;
    const availabilityLabel = nextAvailability?.canBook
      ? `${nextAvailability.availableSeats} seats available`
      : nextAvailability?.label ?? "No open departures";

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
      metadata: expeditions.metadata,
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

  const [departures, relatedSites, updateRows, evidenceRows, courseRows, relatedExpeditionRows, reviewRows, participantSummaryRows] = await Promise.all([
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
    getExpeditionCards(4, row.region),
    db
      .select({
        id: expeditionReviews.id,
        rating: expeditionReviews.rating,
        title: expeditionReviews.title,
        body: expeditionReviews.body,
        createdAt: expeditionReviews.createdAt,
        reviewerName: users.name,
        reviewerDisplayName: profiles.displayName
      })
      .from(expeditionReviews)
      .leftJoin(users, eq(expeditionReviews.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(expeditionReviews.expeditionId, row.id), eq(expeditionReviews.status, "published")))
      .orderBy(desc(expeditionReviews.createdAt))
      .limit(24),
    db
      .select({
        participantCount: sql<number>`coalesce(sum(${expeditionBookings.participantsCount}), 0)`,
        bookingCount: sql<number>`count(${expeditionBookings.id})`
      })
      .from(expeditionBookings)
      .where(and(eq(expeditionBookings.expeditionId, row.id), inArray(expeditionBookings.status, ["confirmed", "completed"])))
  ]);

  const mappedDepartures = departures.map((departure) => {
    const minParticipants = getMetadataNumber(departure.metadata, "minParticipants", 6);
    const availability = expeditionDepartureAvailability({
      status: departure.status,
      capacity: departure.capacity,
      seatsBooked: departure.seatsBooked,
      minParticipants
    });

    return {
      ...departure,
      availableSeats: availability.availableSeats,
      canBook: availability.canBook,
      availabilityCode: availability.code,
      availabilityMessage: availability.message,
      meetingPoint: getMetadataString(departure.metadata, "meetingPoint"),
      guide: getMetadataString(departure.metadata, "guide"),
      minParticipants,
      weatherAdvisory: getMetadataString(departure.metadata, "weatherAdvisory"),
      statusLabel: availability.label,
      dateRangeLabel: `${departure.startsAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${departure.endsAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`
    };
  });

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
  const relatedCampaignProgress = Math.min(
    100,
    Math.round((toNumber(row.relatedCampaignRaisedAmount) / Math.max(1, toNumber(row.relatedCampaignGoalAmount))) * 100)
  );
  const defaultGalleryImages = [
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
  const defaultTripUpdates = [
    updateRows[0]
      ? {
          title: updateRows[0].title,
          date: (updateRows[0].publishedAt ?? updateRows[0].createdAt).toISOString(),
          body: updateRows[0].body
        }
      : {
          title: "Seasonal weather advisory",
          date: "2026-06-01T00:00:00.000Z",
          body: "Boat schedules may shift when sea conditions require safer departure windows."
        }
  ];
  const durationLabel = toExpeditionCard(row).duration;
  const selectedPreparationCourse =
    courseRows.find((course) => course.title.toLowerCase().includes("coral")) ??
    courseRows.find((course) => course.title.toLowerCase().includes("ocean")) ??
    courseRows[0] ??
    null;
  const expeditionMetadata = normalizeExpeditionDetailMetadata(
    row.metadata,
    buildDefaultExpeditionDetailMetadata({
      title: row.title,
      region: row.region,
      durationLabel,
      price,
      maxCapacity,
      galleryImages: defaultGalleryImages,
      tripUpdates: defaultTripUpdates,
      hostedBy: {
        title: `Hosted by Terumbu.eco${row.partner ? ` and ${row.partner}` : ""}`,
        verificationLabel: `${verificationLabel(row.verification)} Expedition Partner`,
        profileHref: row.partnerSlug ? `/partners/${row.partnerSlug}` : "",
        profileLabel: "View partner profile"
      },
      preparationCourse: selectedPreparationCourse
        ? {
            title: selectedPreparationCourse.title,
            summary: selectedPreparationCourse.summary,
            imageUrl: selectedPreparationCourse.imageUrl,
            href: `/academy/courses/${selectedPreparationCourse.slug}`,
            ctaLabel: "Preview Course"
          }
        : undefined
    })
  );
  const reviewCount = reviewRows.length;
  const averageRating = reviewCount > 0 ? Number((reviewRows.reduce((total, review) => total + review.rating, 0) / reviewCount).toFixed(1)) : 0;
  const participantSummary = participantSummaryRows[0] ?? { participantCount: 0, bookingCount: 0 };
  const publicParticipantCount = Number(participantSummary.participantCount ?? 0);
  const publicReviews = reviewRows.map((review) => ({
    id: review.id,
    name: review.reviewerDisplayName ?? review.reviewerName ?? "Verified participant",
    joinedAs: "Completed expedition participant",
    rating: review.rating,
    date: review.createdAt.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    body: review.title ? `${review.title}. ${review.body}` : review.body
  }));
  const publicReviewCategories =
    reviewCount > 0
      ? [
          { label: "Average rating", value: `${averageRating.toFixed(1)} / 5` },
          { label: "Verified reviews", value: reviewCount.toLocaleString("id-ID") },
          { label: "Completed bookings", value: Number(participantSummary.bookingCount ?? 0).toLocaleString("id-ID") }
        ]
      : [];
  const conservationContribution = expeditionMetadata.impact.conservationContribution ?? Math.round((price * expeditionMetadata.impact.contributionPercent) / 100);
  const platformFee = expeditionMetadata.priceBreakdown.platformFee ?? Math.round((price * expeditionMetadata.priceBreakdown.platformFeePercent) / 100);
  const equipmentRental = expeditionMetadata.priceBreakdown.equipmentRental;

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
    metadataJson: expeditionMetadataEditorJson(expeditionMetadata),
    categoryLabel: expeditionMetadata.categoryLabel,
    activitySummary: expeditionMetadata.activitySummary,
    hostedBy: expeditionMetadata.hostedBy,
    galleryImages: expeditionMetadata.galleryImages,
    rating: averageRating,
    reviewCount,
    participantCount: publicParticipantCount,
    difficulty: expeditionMetadata.difficulty,
    minimumAge: expeditionMetadata.minimumAge,
    languages: expeditionMetadata.languages,
    skillRequirements: expeditionMetadata.skillRequirements,
    tags: expeditionMetadata.tags,
    quickFacts: expeditionMetadata.quickFacts,
    overview: expeditionMetadata.overview,
    highlights: expeditionMetadata.highlights,
    impact: {
      conservationContribution,
      title: expeditionMetadata.impact.title,
      summary: expeditionMetadata.impact.summary,
      methodologyUpdatedAt: expeditionMetadata.impact.methodologyUpdatedAt,
      methodologyNote: expeditionMetadata.impact.methodologyNote,
      targets: expeditionMetadata.impact.targets,
      allocation: expeditionMetadata.impact.allocation
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
    itineraryTitle: expeditionMetadata.itineraryTitle,
    itineraryDisclaimer: expeditionMetadata.itineraryDisclaimer,
    itinerary: expeditionMetadata.itinerary,
    included: expeditionMetadata.included,
    notIncluded: expeditionMetadata.notIncluded,
    requirements: expeditionMetadata.requirements,
    safety: expeditionMetadata.safety,
    emergencyPlanSummary: expeditionMetadata.emergencyPlanSummary,
    sustainability: expeditionMetadata.sustainability,
    route: {
      ...expeditionMetadata.route,
      sites: relatedSites
    },
    accommodation: expeditionMetadata.accommodation,
    team: expeditionMetadata.team,
    preparationCourse: expeditionMetadata.preparationCourse,
    reviewCategories: publicReviewCategories,
    reviews: publicReviews,
    tripUpdates: expeditionMetadata.tripUpdates.map((update) => ({ ...update, date: metadataDate(update.date) })),
    cancellationPolicy: expeditionMetadata.cancellationPolicy,
    faqs: expeditionMetadata.faqs.map((item) => [item.question, item.answer] as const),
    finalCta: expeditionMetadata.finalCta,
    weatherAdvisory: expeditionMetadata.weatherAdvisory,
    bookingTrustIndicators: expeditionMetadata.bookingTrustIndicators,
    relatedExpeditions: relatedExpeditionRows.filter((item) => item.slug !== row.slug).slice(0, 3)
  };
}

type EvidenceSourceRow = {
  id: string;
  evidenceCode: string;
  title: string;
  evidenceType: string;
  fileUrl: string;
  verificationStatus: string;
  verifiedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  campaignSlug: string | null;
};

function toEvidenceSourceData(evidence: EvidenceSourceRow): EvidenceSourceData {
  const stage = evidenceStage(evidence.metadata, evidence.evidenceType);
  const surveyDate = getMetadataString(evidence.metadata, "surveyDate") ?? evidence.verifiedAt?.toISOString().slice(0, 10) ?? evidence.createdAt.toISOString().slice(0, 10);
  const survivalRate = getMetadataNumberOrString(evidence.metadata, "survivalRate");
  const sortedWaste = getMetadataNumberOrString(evidence.metadata, "sortedWasteKg");
  const seedlingsReady = getMetadataNumberOrString(evidence.metadata, "seedlingsReady");
  const explicitMetricValue = getMetadataNumberOrString(evidence.metadata, "metricValue");
  const metricLabel =
    getMetadataString(evidence.metadata, "metricLabel") ??
    (survivalRate ? "Survival rate" : sortedWaste ? "Waste sorted" : seedlingsReady ? "Seedlings ready" : null);
  const derivedMetricValue = survivalRate ? `${survivalRate}%` : sortedWaste ? `${sortedWaste} kg` : seedlingsReady;
  const metricValue = explicitMetricValue ?? derivedMetricValue;
  const sourceHref = evidenceSourceHref(evidence.campaignSlug, evidence.evidenceCode) ?? evidence.fileUrl;

  return {
    id: evidence.id,
    code: evidence.evidenceCode,
    title: evidence.title,
    evidenceType: evidence.evidenceType,
    fileUrl: evidence.fileUrl,
    verificationStatus: evidence.verificationStatus,
    stage,
    stageLabel: evidenceStageLabel(stage),
    surveyDate,
    observation: getMetadataString(evidence.metadata, "observation") ?? getMetadataString(evidence.metadata, "summary"),
    metricLabel,
    metricValue,
    createdAt: evidence.createdAt,
    verifiedAt: evidence.verifiedAt,
    sourceHref
  };
}

function monitoringHistoryForEvidence(evidence: EvidenceSourceData[]) {
  return buildMonitoringHistory(evidence);
}

export async function getImpactMapSites(campaignId?: string): Promise<ImpactSiteData[]> {
  const rows = await db
    .select({
      id: impactSites.id,
      name: impactSites.name,
      type: impactSites.ecosystemType,
      region: impactSites.region,
      campaignSlug: campaigns.slug,
      campaignTitle: campaigns.title,
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

  if (rows.length === 0) {
    return [];
  }

  const siteIds = rows.map((site) => site.id);
  const evidenceRows = await db
    .select({
      id: projectEvidence.id,
      impactSiteId: projectEvidence.impactSiteId,
      evidenceCode: projectEvidence.evidenceCode,
      title: projectEvidence.title,
      evidenceType: projectEvidence.evidenceType,
      fileUrl: projectEvidence.fileUrl,
      verificationStatus: projectEvidence.verificationStatus,
      verifiedAt: projectEvidence.verifiedAt,
      metadata: projectEvidence.metadata,
      createdAt: projectEvidence.createdAt,
      campaignSlug: campaigns.slug
    })
    .from(projectEvidence)
    .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
    .where(inArray(projectEvidence.impactSiteId, siteIds))
    .orderBy(desc(projectEvidence.verifiedAt), desc(projectEvidence.createdAt));

  const evidenceBySite = evidenceRows.reduce((grouped, evidence) => {
    if (!evidence.impactSiteId) {
      return grouped;
    }

    const item = toEvidenceSourceData(evidence);
    const siteEvidence = grouped.get(evidence.impactSiteId) ?? [];

    siteEvidence.push(item);
    grouped.set(evidence.impactSiteId, siteEvidence);

    return grouped;
  }, new Map<string, EvidenceSourceData[]>());

  return rows.map((site) => {
    const evidence = evidenceBySite.get(site.id) ?? [];
    const before = evidence.find((item) => item.stage === "before") ?? null;
    const after = evidence.find((item) => item.stage === "after") ?? evidence.find((item) => item.stage === "monitoring") ?? null;
    const beforeAfter = before || after ? { before, after } : null;
    const latestEvidence = evidence[0] ?? null;
    const monitoringHistory = monitoringHistoryForEvidence(evidence);
    const verifiedEvidenceCount = evidence.filter((item) => item.verificationStatus === "verified").length;
    const pendingEvidenceCount = evidence.filter((item) => item.verificationStatus !== "verified").length;

    return {
      id: site.id,
      name: site.name,
      type: site.type,
      region: site.region,
      campaignSlug: site.campaignSlug,
      campaignTitle: site.campaignTitle,
      progress: getMetadataNumber(site.metadata, "progress"),
      latitude: toNumber(site.latitude),
      longitude: toNumber(site.longitude),
      verification: verificationLabel(site.verification),
      evidenceCount: evidence.length || getMetadataNumber(site.metadata, "evidenceCount"),
      verifiedEvidenceCount,
      pendingEvidenceCount,
      latestSurvey: latestEvidence?.surveyDate ?? getMetadataString(site.metadata, "latestSurvey"),
      latestEvidence,
      beforeAfter,
      monitoringHistory,
      evidence
    };
  });
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
      imageUrl: courses.imageUrl,
      status: courses.status
    })
    .from(courses)
    .where(eq(courses.status, "published"))
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
    savedCourseRows,
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
        imageUrl: courses.imageUrl,
        status: courses.status
      })
      .from(courses)
      .where(eq(courses.status, "published"))
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
            courseId: userSavedCourses.courseId,
            savedAt: userSavedCourses.savedAt
          })
          .from(userSavedCourses)
          .where(and(eq(userSavedCourses.userId, userId), eq(userSavedCourses.status, "active")))
          .orderBy(desc(userSavedCourses.savedAt))
      : Promise.resolve([]),
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
  const savedCourseIds = new Set(savedCourseRows.map((row) => row.courseId));
  const savedCourseOrder = new Map(savedCourseRows.map((row, index) => [row.courseId, index]));

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
      isSaved: savedCourseIds.has(course.id),
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
  const savedCourses = enrichedCourses
    .filter((course) => course.isSaved)
    .sort((a, b) => (savedCourseOrder.get(a.id) ?? 0) - (savedCourseOrder.get(b.id) ?? 0));

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
    savedCourses,
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
      description: courses.description,
      imageUrl: courses.imageUrl,
      status: courses.status
    })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.status, "published")))
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
        body: courseLessons.body,
        isPreview: courseLessons.isPreview
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
  const [progressRows, certificateRows, attemptRows, savedCourseRows, assessmentQuestionRows] = await Promise.all([
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
            submittedAt: assessmentAttempts.submittedAt,
            metadata: assessmentAttempts.metadata
          })
          .from(assessmentAttempts)
          .where(and(eq(assessmentAttempts.assessmentId, assessments[0].id), eq(assessmentAttempts.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
    userId
      ? db
          .select({
            status: userSavedCourses.status
          })
          .from(userSavedCourses)
          .where(and(eq(userSavedCourses.courseId, course.id), eq(userSavedCourses.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
    assessments[0]
      ? db
          .select({
            questionId: assessmentQuestions.id,
            questionText: assessmentQuestions.questionText,
            questionPosition: assessmentQuestions.position,
            questionPoints: assessmentQuestions.points,
            choiceId: assessmentChoices.id,
            choiceText: assessmentChoices.choiceText,
            choicePosition: assessmentChoices.position,
            isCorrect: assessmentChoices.isCorrect
          })
          .from(assessmentQuestions)
          .innerJoin(assessmentChoices, eq(assessmentChoices.questionId, assessmentQuestions.id))
          .where(and(eq(assessmentQuestions.assessmentId, assessments[0].id), eq(assessmentQuestions.status, "active")))
          .orderBy(asc(assessmentQuestions.position), asc(assessmentChoices.position))
      : Promise.resolve([])
  ]);

  const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row]));
  const completedLessons = progressRows.filter((row) => row.status === "completed").length;
  const progressPercent = enrollment?.status === "completed" ? 100 : Math.round((completedLessons / Math.max(1, lessons.length)) * 100);
  const profile = academyProfileFor(course.slug, course.title);
  const attemptRow = attemptRows[0] ?? null;
  const selectedChoiceIds = selectedChoiceIdsFromAssessmentMetadata(attemptRow?.metadata);
  const showAssessmentFeedback = Boolean(attemptRow);
  const questionMap = new Map<string, {
    id: string;
    text: string;
    position: number;
    points: number;
    choices: Array<{
      id: string;
      text: string;
      position: number;
      isSelected: boolean;
      isCorrect: boolean;
    }>;
  }>();

  for (const row of assessmentQuestionRows) {
    const question = questionMap.get(row.questionId) ?? {
      id: row.questionId,
      text: row.questionText,
      position: row.questionPosition,
      points: row.questionPoints,
      choices: []
    };

    question.choices.push({
      id: row.choiceId,
      text: row.choiceText,
      position: row.choicePosition,
      isSelected: selectedChoiceIds[row.questionId] === row.choiceId,
      isCorrect: showAssessmentFeedback ? row.isCorrect : false
    });
    questionMap.set(row.questionId, question);
  }

  const assessmentQuestionsForUi = Array.from(questionMap.values())
    .sort((a, b) => a.position - b.position)
    .map((question) => {
      const choices = question.choices.sort((a, b) => a.position - b.position);
      const selectedChoice = choices.find((choice) => choice.isSelected) ?? null;
      const correctChoice = showAssessmentFeedback ? choices.find((choice) => choice.isCorrect) ?? null : null;

      return {
        ...question,
        choices,
        selectedChoiceId: selectedChoice?.id ?? null,
        selectedChoiceText: selectedChoice?.text ?? null,
        correctChoiceId: correctChoice?.id ?? null,
        correctChoiceText: correctChoice?.text ?? null,
        wasCorrect: showAssessmentFeedback ? Boolean(selectedChoice?.isCorrect) : null
      };
    });
  const assessment = assessments[0]
    ? {
        ...assessments[0],
        questions: assessmentQuestionsForUi
      }
    : null;
  const attempt = attemptRow
    ? {
        ...attemptRow,
        attemptCount: assessmentAttemptCount(attemptRow.metadata),
        history: assessmentAttemptHistory(attemptRow.metadata)
      }
    : null;

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
    assessment,
    enrollment,
    certificate: certificateRows[0] ?? null,
    attempt,
    isSaved: savedCourseRows[0]?.status === "active"
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

type PublicPassportAccessOptions = {
  token?: string | null;
  accessProof?: string | null;
  now?: Date;
};

export async function getPublicPassport(publicSlug: string, options: PublicPassportAccessOptions = {}) {
  const providedToken = typeof options.token === "string" ? options.token : null;
  const [passport] = await db
    .select({
      id: impactPassports.id,
      publicSlug: impactPassports.publicSlug,
      visibility: impactPassports.visibility,
      shareToken: impactPassports.shareToken,
      shareExpiresAt: impactPassports.shareExpiresAt,
      shareAccessHash: impactPassports.shareAccessHash,
      categoryVisibility: impactPassports.categoryVisibility,
      evidenceConsent: impactPassports.evidenceConsent,
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

  if (!passport) {
    return null;
  }

  const accessProof = Boolean(
    passport.shareAccessHash && providedToken && options.accessProof === passportShareAccessProof(passport.publicSlug, providedToken, passport.shareAccessHash)
  );
  const accessStatus = passportShareAccessStatus({
    visibility: passport.visibility,
    isPublic: passport.isPublic,
    shareToken: passport.shareToken,
    providedToken,
    shareExpiresAt: passport.shareExpiresAt,
    now: options.now,
    requiresAccessCode: Boolean(passport.shareAccessHash),
    accessCodeValid: accessProof
  });

  if (!accessStatus.ok) {
    return null;
  }

  const [preview, itemRows] = await Promise.all([
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

  const categoryVisibility = normalizePassportCategoryVisibility(passport.categoryVisibility);
  const evidenceConsent = normalizePassportEvidenceConsent(passport.evidenceConsent);
  const items = itemRows
    .filter((item) => passportItemIsVisible(item.itemType, categoryVisibility))
    .map((item) => (evidenceConsent === "hide_evidence" ? { ...item, evidenceUrl: null } : item));
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
    id: passport.id,
    publicSlug: passport.publicSlug,
    visibility: passport.visibility,
    shareExpiresAt: passport.visibility === "link" ? passport.shareExpiresAt : null,
    hasAccessCode: Boolean(passport.shareAccessHash),
    categoryVisibility,
    evidenceConsent,
    createdAt: passport.createdAt,
    updatedAt: passport.updatedAt,
    story: passport.story,
    userId: passport.userId,
    imageUrl: passport.imageUrl,
    displayName: passport.displayName,
    location: passport.location,
    bio: passport.bio,
    heroLevel: passport.heroLevel,
    xp: passport.xp,
    isPublic: passport.isPublic,
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

export async function getPublicPassportAccessHint(publicSlug: string, options: Pick<PublicPassportAccessOptions, "token" | "now"> = {}) {
  const providedToken = typeof options.token === "string" ? options.token : null;
  const [passport] = await db
    .select({
      publicSlug: impactPassports.publicSlug,
      visibility: impactPassports.visibility,
      shareToken: impactPassports.shareToken,
      shareExpiresAt: impactPassports.shareExpiresAt,
      shareAccessHash: impactPassports.shareAccessHash,
      isPublic: profiles.isPublic
    })
    .from(impactPassports)
    .innerJoin(profiles, eq(impactPassports.userId, profiles.userId))
    .where(eq(impactPassports.publicSlug, publicSlug))
    .limit(1);

  if (!passport?.shareAccessHash) {
    return null;
  }

  const accessStatus = passportShareAccessStatus({
    visibility: passport.visibility,
    isPublic: passport.isPublic,
    shareToken: passport.shareToken,
    providedToken,
    shareExpiresAt: passport.shareExpiresAt,
    now: options.now
  });

  return accessStatus.ok
    ? {
        publicSlug: passport.publicSlug,
        visibility: passport.visibility,
        shareExpiresAt: passport.shareExpiresAt,
        requiresAccessCode: true
      }
    : null;
}

export async function getPassportShareUnlock({
  publicSlug,
  token,
  accessCode,
  now = new Date()
}: {
  publicSlug: string;
  token: string | null;
  accessCode: string;
  now?: Date;
}) {
  const [passport] = await db
    .select({
      visibility: impactPassports.visibility,
      shareToken: impactPassports.shareToken,
      shareExpiresAt: impactPassports.shareExpiresAt,
      shareAccessHash: impactPassports.shareAccessHash,
      isPublic: profiles.isPublic
    })
    .from(impactPassports)
    .innerJoin(profiles, eq(impactPassports.userId, profiles.userId))
    .where(eq(impactPassports.publicSlug, publicSlug))
    .limit(1);

  if (!passport?.shareAccessHash || !token) {
    return null;
  }

  const tokenStatus = passportShareAccessStatus({
    visibility: passport.visibility,
    isPublic: passport.isPublic,
    shareToken: passport.shareToken,
    providedToken: token,
    shareExpiresAt: passport.shareExpiresAt,
    now
  });

  if (!tokenStatus.ok || !verifyPassword(accessCode, passport.shareAccessHash)) {
    return null;
  }

  return {
    accessProof: passportShareAccessProof(publicSlug, token, passport.shareAccessHash),
    shareExpiresAt: passport.shareExpiresAt
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

function reportMonthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(value: Date, offset: number) {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1);
}

function governanceActor(permission: string | null | undefined) {
  const labels: Record<string, string> = {
    "program.manage": "ESG Program Manager",
    executive_viewer: "Executive Viewer",
    esg_manager: "ESG Program Manager",
    finance_reviewer: "Finance Reviewer",
    employee_engagement: "Employee Engagement Manager",
    auditor: "External Reviewer"
  };

  return labels[permission ?? ""] ?? "Corporate user";
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

function defaultNotificationPreferences() {
  return {
    campaignUpdates: true,
    evidenceAlerts: true,
    expeditionReminders: true,
    academyUpdates: true,
    monthlyImpactEmail: true,
    monthlyImpactReport: true
  };
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
    passportPreview,
    savedCampaignRows,
    savedCourseRows,
    followedUpdateRows,
    notificationPreferenceRows,
    monthlyImpactReportRows
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
        passportShareToken: impactPassports.shareToken,
        passportShareExpiresAt: impactPassports.shareExpiresAt,
        passportHasAccessCode: sql<boolean>`(${impactPassports.shareAccessHash} is not null)`,
        passportCategoryVisibility: impactPassports.categoryVisibility,
        passportEvidenceConsent: impactPassports.evidenceConsent,
        passportShareUpdatedAt: impactPassports.shareUpdatedAt,
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
        campaignId: campaigns.id,
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
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        campaignImageUrl: campaigns.imageUrl,
        campaignRegion: campaigns.region,
        impactSiteId: sponsoredEcosystems.impactSiteId,
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
        id: expeditionBookings.id,
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
        departureMetadata: expeditionDepartures.metadata,
        reviewId: expeditionReviews.id,
        reviewRating: expeditionReviews.rating,
        reviewTitle: expeditionReviews.title,
        reviewBody: expeditionReviews.body,
        reviewStatus: expeditionReviews.status,
        reviewCreatedAt: expeditionReviews.createdAt,
        reviewUpdatedAt: expeditionReviews.updatedAt
      })
      .from(expeditionBookings)
      .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
      .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
      .leftJoin(expeditionReviews, eq(expeditionReviews.bookingId, expeditionBookings.id))
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
        campaignId: campaigns.id,
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
        impactSiteId: projectEvidence.impactSiteId,
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        evidenceCode: projectEvidence.evidenceCode,
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        fileUrl: projectEvidence.fileUrl,
        verificationStatus: projectEvidence.verificationStatus,
        verifiedAt: projectEvidence.verifiedAt,
        metadata: projectEvidence.metadata,
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
        id: impactSites.id,
        type: impactSites.ecosystemType,
        region: impactSites.region,
        latitude: impactSites.latitude,
        longitude: impactSites.longitude,
        metadata: impactSites.metadata,
        campaignId: campaigns.id,
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
    getPassportPreviewForUser(userId),
    db
      .select({
        slug: campaigns.slug,
        title: campaigns.title,
        category: campaigns.category,
        region: campaigns.region,
        imageUrl: campaigns.imageUrl,
        savedAt: userSavedCampaigns.savedAt
      })
      .from(userSavedCampaigns)
      .innerJoin(campaigns, eq(userSavedCampaigns.campaignId, campaigns.id))
      .where(and(eq(userSavedCampaigns.userId, userId), eq(userSavedCampaigns.status, "active")))
      .orderBy(desc(userSavedCampaigns.savedAt))
      .limit(6),
    db
      .select({
        slug: courses.slug,
        title: courses.title,
        level: courses.level,
        summary: courses.summary,
        imageUrl: courses.imageUrl,
        durationMinutes: courses.durationMinutes,
        savedAt: userSavedCourses.savedAt
      })
      .from(userSavedCourses)
      .innerJoin(courses, eq(userSavedCourses.courseId, courses.id))
      .where(and(eq(userSavedCourses.userId, userId), eq(userSavedCourses.status, "active"), eq(courses.status, "published")))
      .orderBy(desc(userSavedCourses.savedAt))
      .limit(6),
    db
      .select({
        id: campaignUpdates.id,
        title: campaignUpdates.title,
        publishedAt: campaignUpdates.publishedAt,
        createdAt: campaignUpdates.createdAt,
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        frequency: campaignFollowSubscriptions.frequency
      })
      .from(campaignFollowSubscriptions)
      .innerJoin(campaigns, eq(campaignFollowSubscriptions.campaignId, campaigns.id))
      .innerJoin(campaignUpdates, eq(campaignUpdates.campaignId, campaigns.id))
      .where(and(eq(campaignFollowSubscriptions.userId, userId), eq(campaignFollowSubscriptions.status, "active")))
      .orderBy(desc(campaignUpdates.publishedAt), desc(campaignUpdates.createdAt))
      .limit(6),
    db
      .select({
        campaignUpdates: notificationPreferences.campaignUpdates,
        evidenceAlerts: notificationPreferences.evidenceAlerts,
        expeditionReminders: notificationPreferences.expeditionReminders,
        academyUpdates: notificationPreferences.academyUpdates,
        monthlyImpactEmail: notificationPreferences.monthlyImpactEmail,
        monthlyImpactReport: notificationPreferences.monthlyImpactReport
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1),
    db
      .select({
        id: monthlyImpactReports.id,
        reportMonth: monthlyImpactReports.reportMonth,
        status: monthlyImpactReports.status,
        label: monthlyImpactReports.label,
        contributions: monthlyImpactReports.contributions,
        campaignUpdates: monthlyImpactReports.campaignUpdates,
        newEvidence: monthlyImpactReports.newEvidence,
        coralsMonitored: monthlyImpactReports.coralsMonitored,
        academyProgress: monthlyImpactReports.academyProgress,
        emailedAt: monthlyImpactReports.emailedAt,
        metadata: monthlyImpactReports.metadata,
        generatedAt: monthlyImpactReports.generatedAt
      })
      .from(monthlyImpactReports)
      .where(eq(monthlyImpactReports.userId, userId))
      .orderBy(desc(monthlyImpactReports.generatedAt))
      .limit(6)
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
  const evidenceByImpactSite = evidenceRows.reduce((grouped, evidence) => {
    if (!evidence.impactSiteId) {
      return grouped;
    }

    const siteEvidence = grouped.get(evidence.impactSiteId) ?? [];

    siteEvidence.push(toEvidenceSourceData(evidence));
    grouped.set(evidence.impactSiteId, siteEvidence);

    return grouped;
  }, new Map<string, EvidenceSourceData[]>());
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
      const evidence = evidenceByImpactSite.get(site.id) ?? [];
      const before = evidence.find((item) => item.stage === "before") ?? null;
      const after = evidence.find((item) => item.stage === "after") ?? evidence.find((item) => item.stage === "monitoring") ?? null;
      const verifiedEvidenceCount = evidence.filter((item) => item.verificationStatus === "verified").length;
      const pendingEvidenceCount = evidence.filter((item) => item.verificationStatus !== "verified").length;
      const existing = sites.get(key) ?? {
        id: site.id,
        name: site.name,
        type: site.type,
        region: site.region,
        campaignSlug: site.campaignSlug,
        campaignTitle: site.campaignTitle,
        progress: getMetadataNumber(site.metadata, "progress"),
        latitude: toNumber(site.latitude),
        longitude: toNumber(site.longitude),
        verification: verificationLabel(getMetadataString(site.metadata, "verification")),
        evidenceCount: evidence.length || getMetadataNumber(site.metadata, "evidenceCount"),
        verifiedEvidenceCount,
        pendingEvidenceCount,
        latestSurvey: evidence[0]?.surveyDate ?? getMetadataString(site.metadata, "latestSurvey"),
        latestEvidence: evidence[0] ?? null,
        beforeAfter: before || after ? { before, after } : null,
        monitoringHistory: monitoringHistoryForEvidence(evidence),
        evidence,
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
      id: string;
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
      verifiedEvidenceCount: number;
      pendingEvidenceCount: number;
      latestSurvey: string | null;
      latestEvidence: EvidenceSourceData | null;
      beforeAfter: {
        before: EvidenceSourceData | null;
        after: EvidenceSourceData | null;
      } | null;
      monitoringHistory: ReturnType<typeof monitoringHistoryForEvidence>;
      evidence: EvidenceSourceData[];
      contributed: number;
      supportedUnits: number;
    }>())
  ).map(([, site]) => ({ ...site, supportedUnits: Math.max(site.supportedUnits, donationAmountByCampaign.has(site.campaignSlug) ? 1 : 0) }));

  const coralCards = ecosystemRows.map((ecosystem) => {
    const quantity = ecosystemQuantity(ecosystem.metadata);
    const survivalRate = getMetadataNumber(ecosystem.metadata, "survivalRate");
    const evidenceStream = buildCoralEvidenceStream(ecosystem.impactSiteId ? evidenceByImpactSite.get(ecosystem.impactSiteId) ?? [] : []);
    const latestSurvey =
      evidenceStream.latestSurvey ??
      getMetadataString(ecosystem.siteMetadata, "latestSurvey") ??
      getMetadataString(ecosystem.metadata, "latestSurvey");

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
      latestSurvey,
      evidenceCount: evidenceStream.evidence.length,
      verifiedEvidenceCount: evidenceStream.verifiedEvidenceCount,
      pendingEvidenceCount: evidenceStream.pendingEvidenceCount
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

  const preferences = notificationPreferenceRows[0] ?? defaultNotificationPreferences();
  const notificationCandidates = [
    ...followedUpdateRows.slice(0, 4).map((update) => ({
      notificationCode: `follow-update-${update.id}`,
      category: "Followed campaigns",
      title: update.title,
      message: `${update.campaignTitle} published a new update.`,
      href: `/campaigns/${update.campaignSlug}/updates/${update.id}`,
      sourceType: "campaign_update",
      sourceId: update.id,
      timestamp: update.publishedAt ?? update.createdAt,
      enabled: preferences.campaignUpdates
    })),
    latestImpactUpdate
      ? {
          notificationCode: "latest-impact",
          category: "Impact updates",
          title: latestImpactUpdate.title,
          message: `${latestImpactUpdate.title} is ready to review.`,
          href: latestImpactUpdate.href,
          sourceType: "impact_update",
          sourceId: null,
          timestamp: latestImpactUpdate.date,
          enabled: preferences.campaignUpdates
        }
      : null,
    evidenceRows[0]
      ? {
          notificationCode: `evidence-${evidenceRows[0].id}`,
          category: "Evidence",
          title: evidenceRows[0].title,
          message: `${evidenceRows[0].title} is ${evidenceRows[0].verificationStatus}.`,
          href: `/campaigns/${evidenceRows[0].campaignSlug}#evidence`,
          sourceType: "project_evidence",
          sourceId: evidenceRows[0].id,
          timestamp: evidenceRows[0].verifiedAt ?? evidenceRows[0].createdAt,
          enabled: preferences.evidenceAlerts
        }
      : null,
    upcomingExpedition
      ? {
          notificationCode: `expedition-prep-${upcomingExpedition.id}`,
          category: "Expeditions",
          title: upcomingExpedition.expeditionTitle,
          message: `${upcomingExpedition.expeditionTitle} preparation is ${upcomingExpedition.preparationComplete}/${upcomingExpedition.preparationTotal} complete.`,
          href: "/dashboard/expeditions",
          sourceType: "expedition_booking",
          sourceId: upcomingExpedition.id,
          timestamp: upcomingExpedition.bookedAt,
          enabled: preferences.expeditionReminders && upcomingExpedition.preparationComplete < upcomingExpedition.preparationTotal
        }
      : null,
    certificateRows[0]
      ? {
          notificationCode: `certificate-${certificateRows[0].certificateNumber}`,
          category: "Academy",
          title: certificateRows[0].courseTitle,
          message: `${certificateRows[0].courseTitle} certificate is available.`,
          href: "/dashboard/certificates",
          sourceType: "course_certificate",
          sourceId: null,
          timestamp: certificateRows[0].issuedAt,
          enabled: preferences.academyUpdates
        }
      : null
  ].filter(isDefined).filter((notification) => notification.enabled);

  if (notificationCandidates.length > 0) {
    await db
      .insert(userNotifications)
      .values(
        notificationCandidates.map((notification) => ({
          userId,
          notificationCode: notification.notificationCode,
          category: notification.category,
          title: notification.title,
          message: notification.message,
          href: notification.href,
          sourceType: notification.sourceType,
          sourceId: notification.sourceId,
          createdAt: notification.timestamp,
          updatedAt: now
        }))
      )
      .onConflictDoUpdate({
        target: [userNotifications.userId, userNotifications.notificationCode],
        set: {
          category: sql`excluded.category`,
          title: sql`excluded.title`,
          message: sql`excluded.message`,
          href: sql`excluded.href`,
          sourceType: sql`excluded.source_type`,
          sourceId: sql`excluded.source_id`,
          updatedAt: now
        }
      });
  }

  const notificationRows = await db
    .select({
      id: userNotifications.id,
      category: userNotifications.category,
      title: userNotifications.title,
      message: userNotifications.message,
      href: userNotifications.href,
      readAt: userNotifications.readAt,
      createdAt: userNotifications.createdAt
    })
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(8);
  const notifications = notificationRows.map((notification) => ({
    ...notification,
    timestamp: notification.createdAt,
    unread: !notification.readAt
  }));

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

  const currentReportMonth = reportMonthKey(now);
  const currentStoredReport = monthlyImpactReportRows.find((report) => report.reportMonth === currentReportMonth) ?? null;
  const monthlyReport = {
    id: currentStoredReport?.id ?? null,
    label: currentStoredReport?.label ?? `${fullMonthLabel(now)} Impact Report`,
    reportMonth: currentReportMonth,
    contributions: currentStoredReport ? toNumber(currentStoredReport.contributions) : paidDonations.filter((donation) => isSameMonth(donation.createdAt, now)).reduce((total, donation) => total + toNumber(donation.amount), 0),
    campaignUpdates: currentStoredReport?.campaignUpdates ?? updateRows.filter((update) => isSameMonth(update.publishedAt ?? update.createdAt, now)).length,
    newEvidence: currentStoredReport?.newEvidence ?? evidenceRows.filter((evidence) => isSameMonth(evidence.verifiedAt ?? evidence.createdAt, now)).length,
    coralsMonitored:
      currentStoredReport?.coralsMonitored ??
      ecosystemRows.filter((ecosystem) => isSameMonth(ecosystem.lastUpdatedAt, now)).reduce((total, ecosystem) => total + getMetadataNumber(ecosystem.metadata, "fragments"), 0),
    academyProgress: currentStoredReport?.academyProgress ?? enrollmentRows.filter((enrollment) => isSameMonth(enrollment.completedAt, now)).length,
    ready: paidDonations.length + updateRows.length + evidenceRows.length > 0 || Boolean(currentStoredReport),
    persisted: Boolean(currentStoredReport),
    emailedAt: currentStoredReport?.emailedAt ?? null,
    generatedAt: currentStoredReport?.generatedAt ?? null,
    metadata: currentStoredReport?.metadata ?? null,
    downloadHref: currentStoredReport ? `/dashboard/reports/${currentStoredReport.id}/download` : null,
    preferenceEnabled: preferences.monthlyImpactReport,
    emailEnabled: preferences.monthlyImpactEmail
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
      savedCourses: savedCourseRows,
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
    unreadNotificationCount: notifications.filter((notification) => notification.unread).length,
    monthlyReport,
    savedCampaigns: savedCampaignRows,
    followedUpdates: followedUpdateRows,
    notificationPreferences: preferences,
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

export async function getBillingData(userId: string) {
  const [paymentMethodRows, subscriptionRows, operationRows] = await Promise.all([
    db
      .select({
        id: userPaymentMethods.id,
        provider: userPaymentMethods.provider,
        providerPaymentMethodId: userPaymentMethods.providerPaymentMethodId,
        label: userPaymentMethods.label,
        brand: userPaymentMethods.brand,
        last4: userPaymentMethods.last4,
        expMonth: userPaymentMethods.expMonth,
        expYear: userPaymentMethods.expYear,
        isDefault: userPaymentMethods.isDefault,
        status: userPaymentMethods.status,
        createdAt: userPaymentMethods.createdAt,
        updatedAt: userPaymentMethods.updatedAt
      })
      .from(userPaymentMethods)
      .where(eq(userPaymentMethods.userId, userId))
      .orderBy(desc(userPaymentMethods.isDefault), desc(userPaymentMethods.updatedAt)),
    db
      .select({
        id: donationSubscriptions.id,
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        campaignImageUrl: campaigns.imageUrl,
        amount: donationSubscriptions.amount,
        currency: donationSubscriptions.currency,
        interval: donationSubscriptions.interval,
        status: donationSubscriptions.status,
        paymentMethodId: donationSubscriptions.paymentMethodId,
        providerSubscriptionReference: donationSubscriptions.providerSubscriptionReference,
        startedAt: donationSubscriptions.startedAt,
        nextBillingAt: donationSubscriptions.nextBillingAt,
        cancelledAt: donationSubscriptions.cancelledAt,
        paymentMethodLabel: userPaymentMethods.label,
        paymentMethodLast4: userPaymentMethods.last4
      })
      .from(donationSubscriptions)
      .innerJoin(campaigns, eq(donationSubscriptions.campaignId, campaigns.id))
      .leftJoin(userPaymentMethods, eq(donationSubscriptions.paymentMethodId, userPaymentMethods.id))
      .where(eq(donationSubscriptions.userId, userId))
      .orderBy(desc(donationSubscriptions.updatedAt)),
    db
      .select({
        id: paymentOperations.id,
        operationCode: paymentOperations.operationCode,
        operationType: paymentOperations.operationType,
        entityType: paymentOperations.entityType,
        donationId: paymentOperations.donationId,
        bookingId: paymentOperations.bookingId,
        subscriptionId: paymentOperations.subscriptionId,
        status: paymentOperations.status,
        amount: paymentOperations.amount,
        currency: paymentOperations.currency,
        reason: paymentOperations.reason,
        createdAt: paymentOperations.createdAt,
        processedAt: paymentOperations.processedAt
      })
      .from(paymentOperations)
      .where(eq(paymentOperations.requestedByUserId, userId))
      .orderBy(desc(paymentOperations.createdAt))
      .limit(30)
  ]);

  const activeSubscriptionCountsByPaymentMethod = new Map<string, number>();

  for (const subscription of subscriptionRows) {
    if (!subscription.paymentMethodId || !activeSubscriptionStatuses.includes(subscription.status as (typeof activeSubscriptionStatuses)[number])) {
      continue;
    }

    activeSubscriptionCountsByPaymentMethod.set(subscription.paymentMethodId, (activeSubscriptionCountsByPaymentMethod.get(subscription.paymentMethodId) ?? 0) + 1);
  }

  const paymentMethods = paymentMethodRows.map((method) => {
    const activeSubscriptionCount = activeSubscriptionCountsByPaymentMethod.get(method.id) ?? 0;

    return {
      ...method,
      isExpired: isPaymentMethodExpired(method.expMonth, method.expYear),
      canUseForSubscriptions: canUsePaymentMethodForSubscription(method),
      activeSubscriptionCount,
      canArchive: canArchivePaymentMethod({
        status: method.status,
        activeSubscriptionCount
      })
    };
  });

  return {
    paymentMethods,
    subscriptions: subscriptionRows.map((subscription) => ({
      ...subscription,
      canCancel: canCancelSubscription(subscription.status)
    })),
    operations: operationRows,
    pendingRefundDonationIds: new Set(
      operationRows
        .filter((operation) => operation.operationType === "refund" && operation.entityType === "donation" && operation.status === "pending" && operation.donationId)
        .map((operation) => operation.donationId as string)
    ),
    pendingRefundBookingIds: new Set(
      operationRows
        .filter((operation) => operation.operationType === "refund" && operation.entityType === "expedition_booking" && operation.status === "pending" && operation.bookingId)
        .map((operation) => operation.bookingId as string)
    )
  };
}

export async function getSponsoredEcosystemDetail(userId: string, code: string) {
  const [ecosystem] = await db
    .select({
      id: sponsoredEcosystems.id,
      campaignId: sponsoredEcosystems.campaignId,
      impactSiteId: sponsoredEcosystems.impactSiteId,
      code: sponsoredEcosystems.code,
      label: sponsoredEcosystems.label,
      status: sponsoredEcosystems.status,
      plantedAt: sponsoredEcosystems.plantedAt,
      lastUpdatedAt: sponsoredEcosystems.lastUpdatedAt,
      metadata: sponsoredEcosystems.metadata,
      campaignTitle: campaigns.title,
      campaignSlug: campaigns.slug,
      campaignImageUrl: campaigns.imageUrl,
      siteName: impactSites.name,
      siteType: impactSites.ecosystemType,
      siteRegion: impactSites.region,
      siteMetadata: impactSites.metadata,
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

  const allEvidenceRows = await db
    .select({
      id: projectEvidence.id,
      impactSiteId: projectEvidence.impactSiteId,
      evidenceCode: projectEvidence.evidenceCode,
      title: projectEvidence.title,
      evidenceType: projectEvidence.evidenceType,
      fileUrl: projectEvidence.fileUrl,
      verificationStatus: projectEvidence.verificationStatus,
      verifiedAt: projectEvidence.verifiedAt,
      metadata: projectEvidence.metadata,
      createdAt: projectEvidence.createdAt,
      campaignSlug: campaigns.slug
    })
    .from(projectEvidence)
    .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
    .where(eq(projectEvidence.campaignId, ecosystem.campaignId))
    .orderBy(desc(projectEvidence.verifiedAt), desc(projectEvidence.createdAt))
    .limit(12);

  const siteEvidenceRows = ecosystem.impactSiteId ? allEvidenceRows.filter((evidence) => evidence.impactSiteId === ecosystem.impactSiteId) : [];
  const evidence = (siteEvidenceRows.length > 0 ? siteEvidenceRows : allEvidenceRows).map(toEvidenceSourceData);
  const evidenceStream = buildCoralEvidenceStream(evidence);
  const fallbackLatestSurvey = getMetadataString(ecosystem.siteMetadata, "latestSurvey") ?? getMetadataString(ecosystem.metadata, "latestSurvey");
  const latitude = ecosystem.latitude ? toNumber(ecosystem.latitude) : null;
  const longitude = ecosystem.longitude ? toNumber(ecosystem.longitude) : null;

  return {
    ...ecosystem,
    fragments: getMetadataNumber(ecosystem.metadata, "fragments"),
    seedlings: getMetadataNumber(ecosystem.metadata, "seedlings"),
    quantity: ecosystemQuantity(ecosystem.metadata),
    unit: ecosystemUnit(ecosystem.metadata),
    progress: getMetadataNumber(ecosystem.metadata, "progress"),
    survivalRate: getMetadataNumber(ecosystem.metadata, "survivalRate"),
    latestSurvey: evidenceStream.latestSurvey ?? fallbackLatestSurvey,
    latitude,
    longitude,
    evidenceCount: evidenceStream.evidence.length,
    verifiedEvidenceCount: evidenceStream.verifiedEvidenceCount,
    pendingEvidenceCount: evidenceStream.pendingEvidenceCount,
    latestEvidence: evidenceStream.latestEvidence,
    beforeAfter: evidenceStream.beforeAfter,
    monitoringHistory: evidenceStream.monitoringHistory,
    evidence: evidenceStream.evidence,
    mediaGallery: evidenceStream.mediaGallery,
    mapSite:
      latitude !== null && longitude !== null && ecosystem.siteName
        ? {
            id: ecosystem.impactSiteId ?? ecosystem.id,
            name: ecosystem.siteName,
            type: ecosystem.siteType ?? "Ecosystem",
            region: ecosystem.siteRegion ?? "Region pending",
            campaignSlug: ecosystem.campaignSlug,
            campaignTitle: ecosystem.campaignTitle,
            progress: getMetadataNumber(ecosystem.siteMetadata, "progress") || getMetadataNumber(ecosystem.metadata, "progress"),
            latitude,
            longitude,
            verification: evidenceStream.verifiedEvidenceCount > 0 ? "Verified evidence linked" : "Linked site",
            evidenceCount: evidenceStream.evidence.length,
            verifiedEvidenceCount: evidenceStream.verifiedEvidenceCount,
            pendingEvidenceCount: evidenceStream.pendingEvidenceCount,
            latestSurvey: evidenceStream.latestSurvey ?? fallbackLatestSurvey,
            latestEvidence: evidenceStream.latestEvidence,
            beforeAfter: evidenceStream.beforeAfter,
            monitoringHistory: evidenceStream.monitoringHistory,
            evidence: evidenceStream.evidence
          }
        : null
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
      status: expeditionDepartures.status,
      metadata: expeditionDepartures.metadata
    })
    .from(expeditionDepartures)
    .innerJoin(expeditions, eq(expeditionDepartures.expeditionId, expeditions.id))
    .orderBy(asc(expeditionDepartures.startsAt));

  return rows
    .map((row) => {
      const availability = expeditionDepartureAvailability({
        status: row.status,
        capacity: row.capacity,
        seatsBooked: row.seatsBooked,
        minParticipants: getMetadataNumber(row.metadata, "minParticipants", 6)
      });

      return {
        ...row,
        basePrice: toNumber(row.basePrice),
        availableSeats: availability.availableSeats,
        canBook: availability.canBook,
        availabilityCode: availability.code,
        availabilityLabel: availability.label,
        availabilityMessage: availability.message
      };
    })
    .filter((row) => row.canBook);
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

  const [
    budgets,
    employees,
    employeeInvites,
    employeeEvents,
    employeeEventRegistrations,
    portfolio,
    evidence,
    exports,
    contributions,
    integrations,
    securityRows,
    auditRows
  ] = await Promise.all([
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
        id: corporateEmployees.id,
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
        id: corporateEmployeeInvites.id,
        employeeId: corporateEmployeeInvites.employeeId,
        email: corporateEmployeeInvites.email,
        token: corporateEmployeeInvites.token,
        permission: corporateEmployeeInvites.permission,
        status: corporateEmployeeInvites.status,
        expiresAt: corporateEmployeeInvites.expiresAt,
        acceptedAt: corporateEmployeeInvites.acceptedAt,
        createdAt: corporateEmployeeInvites.createdAt
      })
      .from(corporateEmployeeInvites)
      .where(and(eq(corporateEmployeeInvites.corporateAccountId, program.accountId), eq(corporateEmployeeInvites.status, "pending")))
      .orderBy(desc(corporateEmployeeInvites.createdAt)),
    db
      .select({
        id: corporateEmployeeEvents.id,
        title: corporateEmployeeEvents.title,
        eventType: corporateEmployeeEvents.eventType,
        status: corporateEmployeeEvents.status,
        startsAt: corporateEmployeeEvents.startsAt,
        endsAt: corporateEmployeeEvents.endsAt,
        location: corporateEmployeeEvents.location,
        capacity: corporateEmployeeEvents.capacity,
        waitlistEnabled: corporateEmployeeEvents.waitlistEnabled,
        description: corporateEmployeeEvents.description,
        createdAt: corporateEmployeeEvents.createdAt,
        updatedAt: corporateEmployeeEvents.updatedAt
      })
      .from(corporateEmployeeEvents)
      .where(and(eq(corporateEmployeeEvents.corporateAccountId, program.accountId), eq(corporateEmployeeEvents.programId, program.programId)))
      .orderBy(asc(corporateEmployeeEvents.startsAt), asc(corporateEmployeeEvents.title)),
    db
      .select({
        id: corporateEmployeeEventRegistrations.id,
        eventId: corporateEmployeeEventRegistrations.eventId,
        employeeId: corporateEmployeeEventRegistrations.employeeId,
        status: corporateEmployeeEventRegistrations.status,
        checkedInAt: corporateEmployeeEventRegistrations.checkedInAt,
        attendanceHours: corporateEmployeeEventRegistrations.attendanceHours,
        notes: corporateEmployeeEventRegistrations.notes,
        createdAt: corporateEmployeeEventRegistrations.createdAt,
        updatedAt: corporateEmployeeEventRegistrations.updatedAt,
        employeeName: corporateEmployees.name,
        employeeEmail: corporateEmployees.email,
        employeeDepartment: corporateEmployees.department,
        eventTitle: corporateEmployeeEvents.title,
        eventStartsAt: corporateEmployeeEvents.startsAt,
        eventEndsAt: corporateEmployeeEvents.endsAt,
        eventLocation: corporateEmployeeEvents.location
      })
      .from(corporateEmployeeEventRegistrations)
      .innerJoin(corporateEmployeeEvents, eq(corporateEmployeeEventRegistrations.eventId, corporateEmployeeEvents.id))
      .innerJoin(corporateEmployees, eq(corporateEmployeeEventRegistrations.employeeId, corporateEmployees.id))
      .where(and(eq(corporateEmployeeEvents.corporateAccountId, program.accountId), eq(corporateEmployeeEvents.programId, program.programId)))
      .orderBy(desc(corporateEmployeeEvents.startsAt), asc(corporateEmployees.name)),
    db
      .select({
        campaignId: campaigns.id,
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
        id: projectEvidence.id,
        evidenceCode: projectEvidence.evidenceCode,
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        verificationStatus: projectEvidence.verificationStatus,
        fileUrl: projectEvidence.fileUrl,
        metadata: projectEvidence.metadata,
        assignedReviewerUserId: projectEvidence.assignedReviewerUserId,
        clarificationNote: projectEvidence.clarificationNote,
        clarificationRequestedAt: projectEvidence.clarificationRequestedAt,
        clarificationResolvedAt: projectEvidence.clarificationResolvedAt,
        rejectionReason: projectEvidence.rejectionReason,
        reviewedAt: projectEvidence.reviewedAt,
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
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
        id: corporateReportExports.id,
        exportCode: corporateReportExports.exportCode,
        reportType: corporateReportExports.reportType,
        exportFormat: corporateReportExports.exportFormat,
        artifactVersion: corporateReportExports.artifactVersion,
        status: corporateReportExports.status,
        fileUrl: corporateReportExports.fileUrl,
        previewUrl: corporateReportExports.previewUrl,
        evidenceBundleUrl: corporateReportExports.evidenceBundleUrl,
        publicSlug: corporateReportExports.publicSlug,
        scheduledFor: corporateReportExports.scheduledFor,
        generatedAt: corporateReportExports.generatedAt,
        approvedAt: corporateReportExports.approvedAt,
        publishedAt: corporateReportExports.publishedAt,
        artifactManifest: corporateReportExports.artifactManifest,
        metadata: corporateReportExports.metadata,
        createdAt: corporateReportExports.createdAt
      })
      .from(corporateReportExports)
      .where(eq(corporateReportExports.programId, program.programId))
      .orderBy(desc(corporateReportExports.createdAt)),
    db
      .select({
        id: corporateContributions.id,
        referenceCode: corporateContributions.referenceCode,
        contributionType: corporateContributions.contributionType,
        amount: corporateContributions.amount,
        currency: corporateContributions.currency,
        status: corporateContributions.status,
        countsTowardCampaignGoal: corporateContributions.countsTowardCampaignGoal,
        contributionDate: corporateContributions.contributionDate,
        notes: corporateContributions.notes,
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title
      })
      .from(corporateContributions)
      .innerJoin(campaigns, eq(corporateContributions.campaignId, campaigns.id))
      .where(eq(corporateContributions.programId, program.programId))
      .orderBy(desc(corporateContributions.contributionDate)),
    db
      .select({
        id: corporateIntegrations.id,
        integrationType: corporateIntegrations.integrationType,
        providerName: corporateIntegrations.providerName,
        owner: corporateIntegrations.owner,
        status: corporateIntegrations.status,
        nextAction: corporateIntegrations.nextAction,
        lastSyncAt: corporateIntegrations.lastSyncAt,
        updatedAt: corporateIntegrations.updatedAt
      })
      .from(corporateIntegrations)
      .where(eq(corporateIntegrations.corporateAccountId, program.accountId))
      .orderBy(asc(corporateIntegrations.integrationType), asc(corporateIntegrations.providerName)),
    db
      .select({
        id: corporateSecuritySettings.id,
        mfaRequired: corporateSecuritySettings.mfaRequired,
        exportLoggingEnabled: corporateSecuritySettings.exportLoggingEnabled,
        sessionHistoryEnabled: corporateSecuritySettings.sessionHistoryEnabled,
        retentionPolicyDays: corporateSecuritySettings.retentionPolicyDays,
        domainRestrictionEnabled: corporateSecuritySettings.domainRestrictionEnabled,
        allowedEmailDomains: corporateSecuritySettings.allowedEmailDomains,
        updatedAt: corporateSecuritySettings.updatedAt
      })
      .from(corporateSecuritySettings)
      .where(eq(corporateSecuritySettings.corporateAccountId, program.accountId))
      .limit(1),
    db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        entityType: adminAuditLogs.entityType,
        entityId: adminAuditLogs.entityId,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt
      })
      .from(adminAuditLogs)
      .where(
        sql`(${adminAuditLogs.action} like 'corporate.%' and (${adminAuditLogs.metadata}->>'programId' = ${program.programId} or ${adminAuditLogs.metadata}->>'accountId' = ${program.accountId} or ${adminAuditLogs.entityId} = ${program.programId} or ${adminAuditLogs.entityId} = ${program.accountId}))`
      )
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(12)
  ]);

  const inviteByEmployee = new Map(employeeInvites.map((invite) => [invite.employeeId, invite]));
  const employeeRows = employees.map((employee) => {
    const invite = inviteByEmployee.get(employee.id);
    const employeeRegistrations = employeeEventRegistrations
      .filter((registration) => registration.employeeId === employee.id)
      .map((registration) => ({
        status: normalizeCorporateEventRegistrationStatus(registration.status),
        attendanceHours: toNumber(registration.attendanceHours),
        checkedInAt: registration.checkedInAt
      }));
    const attendedRegistrations = employeeRegistrations.filter((registration) => registration.status === "attended");

    return {
      ...employee,
      attendance: {
        registeredEvents: employeeRegistrations.filter((registration) => registration.status === "registered").length,
        waitlistedEvents: employeeRegistrations.filter((registration) => registration.status === "waitlisted").length,
        attendedEvents: attendedRegistrations.length,
        volunteerHours: attendedRegistrations.reduce((total, registration) => total + registration.attendanceHours, 0),
        latestCheckInAt:
          attendedRegistrations
            .map((registration) => registration.checkedInAt)
            .filter(isDefined)
            .sort((left, right) => right.getTime() - left.getTime())[0] ?? null
      },
      invite: invite
        ? {
            id: invite.id,
            token: invite.token,
            permission: invite.permission,
            status: invite.status,
            expiresAt: invite.expiresAt,
            acceptedAt: invite.acceptedAt,
            createdAt: invite.createdAt,
            acceptHref: `/corporate/invite/${invite.token}`
          }
        : null
    };
  });

  const employeeEventRegistrationRows = employeeEventRegistrations.map((registration) => {
    const status = normalizeCorporateEventRegistrationStatus(registration.status);

    return {
      ...registration,
      status,
      statusLabel: status.replaceAll("_", " "),
      attendanceHoursValue: toNumber(registration.attendanceHours)
    };
  });
  const registrationsByEvent = new Map<string, typeof employeeEventRegistrationRows>();

  for (const registration of employeeEventRegistrationRows) {
    const rows = registrationsByEvent.get(registration.eventId) ?? [];
    rows.push(registration);
    registrationsByEvent.set(registration.eventId, rows);
  }

  const employeeEventRows = employeeEvents.map((event) => {
    const status = normalizeCorporateEmployeeEventStatus(event.status);
    const eventType = normalizeCorporateEmployeeEventType(event.eventType);
    const registrations = registrationsByEvent.get(event.id) ?? [];
    const activeRegistrations = registrations.filter((registration) => ["registered", "attended"].includes(registration.status));
    const waitlistedRegistrations = registrations.filter((registration) => registration.status === "waitlisted");
    const attendedRegistrations = registrations.filter((registration) => registration.status === "attended");
    const availability = corporateEventRegistrationAvailability({
      status,
      capacity: event.capacity,
      registeredCount: activeRegistrations.length,
      waitlistEnabled: event.waitlistEnabled
    });

    return {
      ...event,
      date: event.startsAt,
      status,
      statusLabel: status.replaceAll("_", " "),
      eventType,
      eventTypeLabel: eventType.replaceAll("_", " "),
      registered: activeRegistrations.length,
      waitlisted: waitlistedRegistrations.length,
      attended: attendedRegistrations.length,
      attendanceHours: attendedRegistrations.reduce((total, registration) => total + registration.attendanceHoursValue, 0),
      registrations,
      availability,
      availableSeats: availability.availableSeats,
      canRegister: availability.canRegister,
      willWaitlist: availability.willWaitlist,
      availabilityLabel: availability.label
    };
  });

  const contributionRows = contributions.map((contribution) => ({
    ...contribution,
    amountValue: toNumber(contribution.amount),
    statusLabel: contribution.status.replace(/_/g, " "),
    publicGoalLabel: contribution.countsTowardCampaignGoal ? "Counts toward campaign goal" : "Corporate reporting only"
  }));
  const contributionsByCampaign = new Map<string, typeof contributionRows>();

  for (const contribution of contributionRows) {
    const rows = contributionsByCampaign.get(contribution.campaignId) ?? [];
    rows.push(contribution);
    contributionsByCampaign.set(contribution.campaignId, rows);
  }

  const totalAllocated = budgets.reduce((total, budget) => total + toNumber(budget.allocatedAmount), 0);
  const totalSpent = budgets.reduce((total, budget) => total + toNumber(budget.spentAmount), 0);
  const contributionTotal = contributionRows
    .filter((contribution) => contribution.status !== "cancelled")
    .reduce((total, contribution) => total + contribution.amountValue, 0);
  const contributionCommitted = contributionRows
    .filter((contribution) => ["committed", "disbursed", "verified"].includes(contribution.status))
    .reduce((total, contribution) => total + contribution.amountValue, 0);
  const contributionDisbursed = contributionRows
    .filter((contribution) => ["disbursed", "verified"].includes(contribution.status))
    .reduce((total, contribution) => total + contribution.amountValue, 0);
  const contributionVerified = contributionRows
    .filter((contribution) => contribution.status === "verified")
    .reduce((total, contribution) => total + contribution.amountValue, 0);
  const campaignGoalContribution = contributionRows
    .filter((contribution) => contribution.countsTowardCampaignGoal && ["committed", "disbursed", "verified"].includes(contribution.status))
    .reduce((total, contribution) => total + contribution.amountValue, 0);
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
  const evidenceReviewEventsById = await getEvidenceReviewEventsByEvidenceIds(evidence.map((item) => item.id));
  const corporateEvidence = evidence.map((item) => {
    const stage = evidenceStage(item.metadata, item.evidenceType);
    const survivalRate = getMetadataNumberOrString(item.metadata, "survivalRate");
    const sortedWaste = getMetadataNumberOrString(item.metadata, "sortedWasteKg");
    const seedlingsReady = getMetadataNumberOrString(item.metadata, "seedlingsReady");
    const explicitMetricValue = getMetadataNumberOrString(item.metadata, "metricValue");
    const metricLabel =
      getMetadataString(item.metadata, "metricLabel") ??
      (survivalRate ? "Survival rate" : sortedWaste ? "Waste sorted" : seedlingsReady ? "Seedlings ready" : null);
    const derivedMetricValue = survivalRate ? `${survivalRate}%` : sortedWaste ? `${sortedWaste} kg` : seedlingsReady;
    const metricValue = explicitMetricValue ?? derivedMetricValue;
    const reviewEvents = evidenceReviewEventsById.get(item.id) ?? [];

    return {
      ...item,
      stageLabel: evidenceStageLabel(stage),
      reviewStage: evidenceReviewStage(item.verificationStatus),
      statusLabel: evidenceStatusLabel(item.verificationStatus),
      latestReviewNote: latestEvidenceReviewNote(reviewEvents, item.clarificationNote ?? item.rejectionReason),
      reviewEvents,
      observation: getMetadataString(item.metadata, "observation") ?? getMetadataString(item.metadata, "summary"),
      metricLabel,
      metricValue,
      sourceHref: evidenceSourceHref(item.campaignSlug, item.evidenceCode) ?? item.fileUrl
    };
  });

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
    const projectEvidenceRows = corporateEvidence.filter((item) => item.campaignSlug === project.campaignSlug);
    const verifiedProjectEvidence = projectEvidenceRows.filter((item) => item.verificationStatus === "verified").length;
    const evidenceScore = projectEvidenceRows.length > 0 ? Math.round((verifiedProjectEvidence / projectEvidenceRows.length) * 100) : 50;
    const partnerScore = Math.min(100, Math.max(35, Math.round((utilization + impactProgress + evidenceScore) / 3)));
    const utilizationStatus = utilization >= 85 ? "Complete" : utilization >= 65 ? "In Progress" : "Needs Review";
    const evidenceStatus =
      projectEvidenceRows.length === 0
        ? "Evidence due"
        : verifiedProjectEvidence === projectEvidenceRows.length
          ? "Verified"
          : "Reviewer action";

    return {
      ...project,
      organizationVerification: verificationLabel(project.organizationVerification),
      allocationValue: toNumber(project.allocationAmount),
      contributions: contributionsByCampaign.get(project.campaignId) ?? [],
      contributionTotal: (contributionsByCampaign.get(project.campaignId) ?? []).reduce((total, contribution) => total + contribution.amountValue, 0),
      latestContributionStatus: contributionsByCampaign.get(project.campaignId)?.[0]?.status ?? "not_recorded",
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
      nextMilestoneDate,
      detailHref: `/corporate/projects?project=${project.campaignSlug}`,
      partnerScore,
      invoiceStatus: utilization >= 85 ? "Matched to evidence" : utilization >= 65 ? "Partially matched" : "Needs invoice review",
      disbursementStatus: utilization >= 90 ? "Final tranche eligible" : utilization >= 65 ? "Next tranche pending review" : "Hold pending clarification",
      evidenceSummary: {
        total: projectEvidenceRows.length,
        verified: verifiedProjectEvidence,
        pending: Math.max(0, projectEvidenceRows.length - verifiedProjectEvidence),
        latestTitle: projectEvidenceRows[0]?.title ?? "No evidence submitted",
        status: evidenceStatus
      },
      milestones: [
        {
          label: "Funding allocation",
          status: "Complete",
          dueDate: project.createdAt,
          owner: "Corporate finance"
        },
        {
          label: "Utilization review",
          status: utilizationStatus,
          dueDate: addMonths(project.createdAt, 1),
          owner: "Finance reviewer"
        },
        {
          label: "Evidence verification",
          status: evidenceStatus,
          dueDate: addMonths(project.createdAt, 2),
          owner: "Terumbu verification"
        },
        {
          label: "Monitoring report",
          status: statusLabel === "Completed" ? "Complete" : "Scheduled",
          dueDate: nextMilestoneDate,
          owner: project.organizationName
        }
      ],
      nextActions: [
        statusLabel === "Needs Attention" ? "Request partner clarification" : null,
        utilization < 75 ? "Review invoices before next disbursement" : "Confirm next tranche readiness",
        projectEvidenceRows.some((item) => item.verificationStatus !== "verified") ? "Assign evidence reviewer" : "Prepare report excerpt"
      ].filter(isDefined)
    };
  });

  const restorationUnits = portfolioRows.reduce((total, project) => total + project.impactTarget, 0);
  const coralUnits = portfolioRows
    .filter((project) => `${project.campaignCategory} ${project.impactUnit}`.toLowerCase().includes("coral"))
    .reduce((total, project) => total + project.impactTarget, 0);
  const mangroveUnits = portfolioRows
    .filter((project) => `${project.campaignCategory} ${project.impactUnit}`.toLowerCase().includes("mangrove"))
    .reduce((total, project) => total + project.impactTarget, 0);
  const employeesEngaged = employeeRows.filter((employee) => employee.status === "active").length;
  const eligibleEmployees = Math.max(employeeRows.length, employeesEngaged);
  const participationRate = eligibleEmployees > 0 ? Math.round((employeesEngaged / eligibleEmployees) * 100) : 0;
  const eventParticipantIds = new Set(
    employeeEventRegistrationRows
      .filter((registration) => ["registered", "waitlisted", "attended"].includes(registration.status))
      .map((registration) => registration.employeeId)
  );
  const challengeParticipationRate = eligibleEmployees > 0 ? Math.round((eventParticipantIds.size / eligibleEmployees) * 100) : 0;
  const activityCount = employeeEventRows.length + corporateEvidence.length + portfolioRows.length;
  const volunteerHours = Math.round(
    employeeEventRegistrationRows
      .filter((registration) => registration.status === "attended")
      .reduce((total, registration) => total + registration.attendanceHoursValue, 0) * 100
  ) / 100;
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
  const verifiedOutputs = corporateEvidence.filter((item) => item.verificationStatus === "verified").length;
  const reportExports = exports.map((item) => {
    const manifest = item.artifactManifest && typeof item.artifactManifest === "object" && !Array.isArray(item.artifactManifest) ? (item.artifactManifest as Record<string, unknown>) : {};
    const readiness = typeof manifest.readiness === "string" ? manifest.readiness : item.status === "scheduled" ? "scheduled" : item.fileUrl ? "ready" : "incomplete";
    const artifactFiles = Array.isArray(manifest.files)
      ? manifest.files
          .filter((file): file is Record<string, unknown> => Boolean(file && typeof file === "object" && !Array.isArray(file)))
          .map((file) => ({
            label: typeof file.label === "string" ? file.label : "Artifact",
            format: typeof file.format === "string" ? file.format : "file",
            url: typeof file.url === "string" ? file.url : null,
            required: file.required === true
          }))
          .filter((file) => file.url)
      : [];
    const artifactSource = {
      fileUrl: item.fileUrl,
      previewUrl: item.previewUrl,
      evidenceBundleUrl: item.evidenceBundleUrl,
      artifactManifest: item.artifactManifest,
      metadata: item.metadata,
      exportCode: item.exportCode
    };

    return {
      ...item,
      fileUrl: corporateReportArtifactSourceUrl(artifactSource, "data"),
      previewUrl: corporateReportArtifactSourceUrl(artifactSource, "preview"),
      evidenceBundleUrl: corporateReportArtifactSourceUrl(artifactSource, "evidence"),
      reportTypeLabel: corporateReportTypeLabel(item.reportType),
      exportFormatLabel: corporateReportFormatLabel(item.exportFormat),
      artifactVersionLabel: `v${item.artifactVersion}`,
      artifactReadiness: readiness,
      manifestUrl: corporateReportArtifactSourceUrl(artifactSource, "manifest"),
      artifactFiles,
      pdfUrl: corporateReportArtifactSourceUrl(artifactSource, "pdf"),
      workbookUrl: corporateReportArtifactSourceUrl(artifactSource, "workbook"),
      portfolioCsvUrl: corporateReportArtifactSourceUrl(artifactSource, "portfolio-csv"),
      evidenceCsvUrl: corporateReportArtifactSourceUrl(artifactSource, "evidence-csv"),
      isScheduledDue: item.status === "scheduled" && scheduledReportIsDue(item.scheduledFor, now),
      generatedAt: item.generatedAt ?? (item.status === "scheduled" ? null : item.createdAt),
      verifiedMetrics: Math.max(verifiedOutputs, portfolioRows.length * 3),
      pendingMetrics: Math.max(0, corporateEvidence.length - verifiedOutputs),
      publicHref: item.publicSlug ? `/corporate-impact/${item.publicSlug}` : null
    };
  });
  const latestPublishedReport = reportExports.find((item) => item.status === "published" && item.publicHref);
  const latestReport = reportExports[0] ?? {
    exportCode: "Q2-2026-ESG-DRAFT",
    status: corporateEvidence.length > 0 ? "ready_for_review" : "draft",
    fileUrl: null,
    previewUrl: null,
    evidenceBundleUrl: null,
    pdfUrl: null,
    workbookUrl: null,
    portfolioCsvUrl: null,
    evidenceCsvUrl: null,
    artifactFiles: [],
    publicSlug: null,
    publicHref: null,
    createdAt: now,
    scheduledFor: null,
    generatedAt: null,
    reportType: "Q2 2026 ESG Report",
    reportTypeLabel: "Q2 2026 ESG Report",
    exportFormat: "html_json",
    exportFormatLabel: "HTML + JSON",
    artifactVersion: 1,
    artifactVersionLabel: "v1",
    artifactReadiness: "draft",
    manifestUrl: null,
    isScheduledDue: false,
    verifiedMetrics: Math.max(verifiedOutputs, portfolioRows.length * 3),
    pendingMetrics: Math.max(0, corporateEvidence.length - verifiedOutputs)
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
      target: Math.max(corporateEvidence.length + 3, 12),
      current: verifiedOutputs,
      unit: "records",
      forecast: Math.max(verifiedOutputs, corporateEvidence.length)
    }
  ].map((goal) => ({
    ...goal,
    progress: Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100)),
    status: goal.current >= goal.target ? "Complete" : goal.current / Math.max(1, goal.target) >= 0.75 ? "On Track" : "Needs Attention"
  }));

  const departmentMap = employeeRows.reduce((departments, employee) => {
    const key = employee.department ?? "Unassigned";
    const existing = departments.get(key) ?? { department: key, employees: 0, active: 0, participants: 0, volunteerHours: 0 };
    existing.employees += 1;
    existing.active += employee.status === "active" ? 1 : 0;
    existing.participants += eventParticipantIds.has(employee.id) ? 1 : 0;
    existing.volunteerHours += employee.attendance.volunteerHours;
    departments.set(key, existing);

    return departments;
  }, new Map<string, { department: string; employees: number; active: number; participants: number; volunteerHours: number }>());
  const departmentEngagement = Array.from(departmentMap.values()).map((department) => ({
    ...department,
    participationRate: department.employees > 0 ? Math.round((department.participants / department.employees) * 100) : 0
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
  const departmentLeaders = [...departmentEngagement]
    .sort((left, right) => right.participationRate - left.participationRate || right.volunteerHours - left.volunteerHours)
    .slice(0, 5);
  const employeePrograms = {
    events: employeeEventRows,
    registrations: employeeEventRegistrationRows,
    attendanceRows: employeeEventRegistrationRows.filter((registration) => registration.status === "attended"),
    upcomingEvents: employeeEventRows
      .filter((event) => event.startsAt.getTime() >= now.getTime() && !["completed", "cancelled"].includes(event.status))
      .slice(0, 6),
    challenge: {
      title: "Blue Office Challenge",
      progress: challengeParticipationRate,
      targetDepartments: Math.max(3, departmentEngagement.length),
      activeDepartments: departmentLeaders.filter((department) => department.participants > 0).length,
      leaderboard: departmentLeaders
    },
    donationMatching: {
      policy: "1:1 employee matching",
      pool: Math.round(committedFunding * 0.03),
      matched: Math.min(Math.round(committedFunding * 0.03), employeesEngaged * 250000),
      pending: Math.max(0, Math.round(employeesEngaged * 0.18)),
      status: participationRate > 50 ? "Healthy" : "Needs promotion"
    }
  };
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
  const fundingSchedule = budgetVariance.map((budget, index) => {
    const utilization = budget.planned > 0 ? Math.round((budget.actual / budget.planned) * 100) : 0;
    const status = budget.actual <= 0 ? "Scheduled" : utilization >= 95 ? "Complete" : budget.status === "Requires explanation" ? "Needs Approval" : "In Progress";

    return {
      id: `${budget.category}-${index}`,
      milestone: `${budget.category} disbursement`,
      category: budget.category,
      dueDate: addMonths(program.startsAt, index + 1),
      amount: budget.planned,
      disbursed: budget.actual,
      utilization,
      status,
      approvalStep: status === "Needs Approval" ? "Finance reviewer explanation" : status === "Complete" ? "Closed" : "Milestone approval",
      evidenceRequired: ["field", "monitoring", "community", "restoration"].some((keyword) => budget.category.toLowerCase().includes(keyword))
    };
  });
  const fundingApprovalQueue = [
    ...budgetVariance
      .filter((item) => item.status !== "Within tolerance")
      .map((item) => ({
        title: `${item.category} variance`,
        amount: item.actual,
        status: item.status,
        owner: "Finance reviewer",
        dueDate: nextReportingDeadline,
        action: item.status === "Requires explanation" ? "Request explanation" : "Approve reforecast"
      })),
    ...portfolioRows
      .filter((project) => project.statusLabel !== "On Track")
      .map((project) => ({
        title: project.campaignTitle,
        amount: project.allocationValue,
        status: project.statusLabel,
        owner: project.organizationName,
        dueDate: project.nextMilestoneDate,
        action: project.nextActions[0] ?? "Review milestone"
      }))
  ].slice(0, 6);
  const evidenceReviewQueue = corporateEvidence.map((item) => {
    const verified = item.verificationStatus === "verified";
    const needsClarification = item.verificationStatus === "needs_clarification" || item.verificationStatus === "rejected";
    const reviewStage = item.reviewStage;
    const latestEvent = item.reviewEvents.at(-1);

    return {
      ...item,
      reviewStage,
      reviewer: latestEvent?.actor ?? (verified ? "Terumbu verifier" : needsClarification ? item.organizationName : "Corporate evidence reviewer"),
      nextAction:
        verified
          ? "Add to next report"
          : item.verificationStatus === "needs_clarification"
            ? "Await partner clarification"
            : item.verificationStatus === "rejected"
              ? "Review rejected evidence"
              : item.assignedReviewerUserId
                ? "Complete verification checklist"
                : "Assign evidence reviewer",
      internalNote:
        verified
          ? "Evidence can be used in approved corporate reporting."
          : needsClarification
            ? item.latestReviewNote ?? "Reviewer should capture the missing source detail before approval."
            : "Evidence is eligible for reviewer assignment this period.",
      auditTrail:
        item.reviewEvents.length > 0
          ? item.reviewEvents.map((event) => ({
              label: event.label,
              actor: event.actor,
              occurredAt: event.occurredAt,
              note: event.note
            }))
          : [
              { label: "Submitted by partner", actor: item.organizationName, occurredAt: item.addedAt, note: null },
              { label: "Added to corporate evidence center", actor: "Terumbu platform", occurredAt: item.addedAt, note: null },
              verified && item.verifiedAt ? { label: "Verified", actor: "Terumbu verifier", occurredAt: item.verifiedAt, note: null } : null
            ].filter(isDefined)
    };
  });
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
    corporateEvidence.some((item) => item.verificationStatus !== "verified")
      ? {
          title: "Evidence awaiting review",
          description: `${corporateEvidence.filter((item) => item.verificationStatus !== "verified").length} evidence records need reviewer attention.`,
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
    status: latestPublishedReport ? "Published" : reportExports.some((item) => item.status === "approved") ? "Ready to publish" : "Draft",
    title: `${program.accountName} Ocean Impact Page`,
    href: latestPublishedReport?.publicHref ?? null,
    metrics: [
      `${formatCurrency(committedFunding)} committed`,
      `${portfolioRows.length.toLocaleString("id-ID")} projects supported`,
      `${employeesEngaged.toLocaleString("id-ID")} employees engaged`
    ],
    publishChecklist: [
      { label: "Approved corporate report", complete: reportExports.some((item) => ["approved", "published"].includes(item.status)) },
      { label: "Verified evidence bundle", complete: verifiedOutputs > 0 && verifiedOutputs >= Math.max(1, Math.round(corporateEvidence.length * 0.6)) },
      { label: "Public metrics reviewed", complete: latestPublishedReport !== undefined },
      { label: "Download links prepared", complete: Boolean(latestPublishedReport?.fileUrl && latestPublishedReport.evidenceBundleUrl && latestPublishedReport.pdfUrl && latestPublishedReport.workbookUrl) }
    ],
    downloads: [
      latestReport.fileUrl ? { label: "Report data", href: latestReport.fileUrl } : null,
      latestReport.evidenceBundleUrl ? { label: "Evidence bundle", href: latestReport.evidenceBundleUrl } : null,
      latestReport.previewUrl ? { label: "Executive preview", href: latestReport.previewUrl } : null,
      latestReport.pdfUrl ? { label: "PDF snapshot", href: latestReport.pdfUrl } : null,
      latestReport.workbookUrl ? { label: "Excel workbook", href: latestReport.workbookUrl } : null,
      latestReport.portfolioCsvUrl ? { label: "Portfolio CSV", href: latestReport.portfolioCsvUrl } : null
    ].filter(isDefined)
  };
  const organizationPassport = {
    status: verifiedOutputs > 0 ? "Verified Organization Impact Passport" : "Draft Organization Impact Passport",
    score: Math.min(100, Math.max(25, Math.round((verifiedOutputs * 18 + portfolioRows.length * 12 + participationRate) / 2))),
    lastVerifiedAt: corporateEvidence.find((item) => item.verificationStatus === "verified")?.verifiedAt ?? latestReport.approvedAt ?? null,
    href: publicImpactPreview.href ?? "/corporate/reports",
    highlights: [
      `${portfolioRows.length.toLocaleString("id-ID")} funded projects`,
      `${verifiedOutputs.toLocaleString("id-ID")} verified evidence records`,
      `${employeesEngaged.toLocaleString("id-ID")} employees engaged`,
      `${formatCurrency(verifiedUtilization)} verified utilization`
    ],
    verificationItems: [
      { label: "Corporate account", status: "Verified" },
      { label: "Funding utilization", status: verifiedUtilizationRate >= 70 ? "Verified" : "In review" },
      { label: "Project evidence", status: verifiedOutputs > 0 ? "Verified" : "Needs evidence" },
      { label: "Public report", status: latestPublishedReport ? "Published" : "Draft" }
    ]
  };
  const benchmarks = [
    {
      label: "Budget utilization",
      current: budgetUsed,
      previous: Math.max(0, budgetUsed - 8),
      benchmark: 72,
      unit: "%",
      insight: budgetUsed >= 72 ? "Ahead of similar ESG portfolios" : "Below platform benchmark"
    },
    {
      label: "Evidence verification",
      current: corporateEvidence.length > 0 ? Math.round((verifiedOutputs / corporateEvidence.length) * 100) : 0,
      previous: Math.max(0, corporateEvidence.length > 0 ? Math.round((verifiedOutputs / corporateEvidence.length) * 100) - 12 : 0),
      benchmark: 68,
      unit: "%",
      insight: verifiedOutputs > 0 ? "Verification pipeline is active" : "Evidence review has not started"
    },
    {
      label: "Employee participation",
      current: participationRate,
      previous: Math.max(0, participationRate - 6),
      benchmark: 42,
      unit: "%",
      insight: participationRate >= 42 ? "Above employee engagement benchmark" : "Promotion campaign recommended"
    }
  ];
  const quickActions = [
    { label: "Add Project", href: "/corporate/projects" },
    { label: "Review Evidence", href: "/corporate/evidence" },
    { label: "Approve Milestone", href: "/corporate/funding" },
    { label: "Create Event", href: "/corporate/employees" },
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
  const currentPermission = program.permission ?? "esg_manager";
  const capabilities = corporateCapabilitiesForPermission(currentPermission);
  const roleCapabilities = [
    {
      role: "Executive Viewer",
      permission: "executive_viewer",
      access: "View KPIs, approved reports, portfolio progress, and major risks.",
      allowedActions: ["Download approved reports", "Review executive risks", "Open public impact page"]
    },
    {
      role: "ESG Program Manager",
      permission: "esg_manager",
      access: "Manage programs, project performance, targets, exports, reports, and publication.",
      allowedActions: ["Generate reports", "Submit reports", "Publish public page", "Coordinate partners"]
    },
    {
      role: "Finance Reviewer",
      permission: "finance_reviewer",
      access: "Review committed funds, disbursements, invoices, utilization, and financial exports.",
      allowedActions: ["Approve report", "Review variance", "Export financial data"]
    },
    {
      role: "Employee Engagement Manager",
      permission: "employee_engagement",
      access: "Create events, manage registrations, track challenges, and review participation.",
      allowedActions: ["Create event", "Invite employees", "Export attendance"]
    },
    {
      role: "Auditor or External Reviewer",
      permission: "auditor",
      access: "Read approved evidence, financial summaries, verification records, and methodology.",
      allowedActions: ["Preview reports", "Review evidence trail", "Download approved files"]
    }
  ].map((role) => ({
    ...role,
    active: currentPermission === role.permission || (currentPermission === "program.manage" && role.permission === "esg_manager")
  }));
  const securitySettings = securityRows[0] ?? {
    id: null,
    mfaRequired: false,
    exportLoggingEnabled: false,
    sessionHistoryEnabled: false,
    retentionPolicyDays: null,
    domainRestrictionEnabled: false,
    allowedEmailDomains: null,
    updatedAt: null
  };
  const allowedEmailDomains = splitAllowedEmailDomains(securitySettings.allowedEmailDomains);
  const governanceIntegrations = integrations.map((integration) => ({
    id: integration.id,
    name: integration.providerName,
    category: integration.integrationType.replaceAll("_", " "),
    status: integration.status.replaceAll("_", " "),
    rawStatus: integration.status,
    owner: integration.owner,
    nextAction: integration.nextAction,
    lastSyncAt: integration.lastSyncAt,
    updatedAt: integration.updatedAt
  }));
  const securityChecklist = buildCorporateSecurityChecklist(securitySettings);
  const governanceAuditLog = auditRows.map((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
    const statusValue =
      typeof metadata.status === "string"
        ? metadata.status
        : typeof metadata.contributionStatus === "string"
          ? metadata.contributionStatus
          : typeof metadata.verificationStatus === "string"
            ? metadata.verificationStatus
            : "recorded";
    const actorValue =
      typeof metadata.actor === "string"
        ? metadata.actor
        : typeof metadata.email === "string"
          ? metadata.email
          : governanceActor(program.permission);

    return {
      event: row.action.replace(/^corporate\./, "").replaceAll(".", " ").replaceAll("_", " "),
      actor: actorValue,
      occurredAt: row.createdAt,
      status: statusValue.replaceAll("_", " ")
    };
  });
  const governance = {
    accessSummary: {
      activeEmployees: employeesEngaged,
      invitedEmployees: employeeRows.filter((employee) => employee.status === "invited").length,
      suspendedEmployees: employeeRows.filter((employee) => employee.status === "suspended").length,
      currentPermission,
      currentRole: roleCapabilities.find((role) => role.active)?.role ?? "ESG Program Manager"
    },
    roleCapabilities,
    integrations: governanceIntegrations,
    securitySettings: {
      ...securitySettings,
      allowedEmailDomains,
      configured: Boolean(securitySettings.id)
    },
    securityChecklist,
    auditLog: governanceAuditLog
  };
  const reportCapabilities = {
    canGenerate: capabilities.canGenerateReport,
    canSubmit: capabilities.canSubmitReport,
    canApprove: capabilities.canApproveReport,
    canPublish: capabilities.canPublishReport,
    canPreview: capabilities.canPreviewReport
  };

  return {
    capabilities,
    program,
    budgets,
    employees: employeeRows,
    contributions: contributionRows,
    portfolio: portfolioRows,
    evidence: corporateEvidence,
    exports: reportExports,
    executiveMetrics,
    goalProgress,
    projectHealth,
    departmentEngagement,
    employeeTrend,
    budgetVariance,
    fundingFlow,
    fundingSchedule,
    fundingApprovalQueue,
    evidenceReviewQueue,
    employeePrograms,
    riskAlerts,
    sdgAlignment,
    latestReport,
    publicImpactPreview,
    organizationPassport,
    benchmarks,
    quickActions,
    governance,
    reportCapabilities,
    mapSummary: {
      projects: portfolioRows.length,
      provinces: provinces.size,
      partners: partners.size,
      fieldLocations: Math.max(corporateEvidence.length, portfolioRows.length)
    },
    financials: {
      committedFunding,
      fundsDisbursed,
      verifiedUtilization,
      pendingVerification,
      remainingCommitment,
      disbursementRate,
      verifiedUtilizationRate,
      budgetUsed,
      contributionTotal,
      contributionCommitted,
      contributionDisbursed,
      contributionVerified,
      campaignGoalContribution
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

export async function getCorporateProgramsForUser(userId: string) {
  const [context] = await db
    .select({
      accountId: corporateAccounts.id,
      accountName: corporateAccounts.name,
      accountSlug: corporateAccounts.slug,
      permission: corporatePermissions.permission
    })
    .from(corporatePermissions)
    .innerJoin(corporateAccounts, eq(corporatePermissions.corporateAccountId, corporateAccounts.id))
    .where(eq(corporatePermissions.userId, userId))
    .limit(1);

  if (!context) {
    return null;
  }

  const programs = await db
    .select({
      id: corporatePrograms.id,
      name: corporatePrograms.name,
      slug: corporatePrograms.slug,
      startsAt: corporatePrograms.startsAt,
      endsAt: corporatePrograms.endsAt,
      budgetAmount: corporatePrograms.budgetAmount,
      currency: corporatePrograms.currency,
      status: corporatePrograms.status,
      createdAt: corporatePrograms.createdAt
    })
    .from(corporatePrograms)
    .where(eq(corporatePrograms.corporateAccountId, context.accountId))
    .orderBy(desc(corporatePrograms.startsAt), desc(corporatePrograms.createdAt));

  return {
    account: context,
    canManagePrograms: corporateCapabilitiesForPermission(context.permission).canManagePrograms,
    programs: programs.map((program) => ({
      ...program,
      budgetAmountValue: toNumber(program.budgetAmount)
    }))
  };
}

export async function getCorporateProjectOptions(userId: string) {
  const [context] = await db
    .select({
      programId: corporatePrograms.id
    })
    .from(corporatePermissions)
    .innerJoin(corporateAccounts, eq(corporatePermissions.corporateAccountId, corporateAccounts.id))
    .innerJoin(corporatePrograms, eq(corporatePrograms.corporateAccountId, corporateAccounts.id))
    .where(eq(corporatePermissions.userId, userId))
    .limit(1);

  if (!context) {
    return [];
  }

  const [campaignRows, portfolioRows, contributionRows] = await Promise.all([
    db
      .select({
        id: campaigns.id,
        slug: campaigns.slug,
        title: campaigns.title,
        category: campaigns.category,
        region: campaigns.region,
        goalAmount: campaigns.goalAmount,
        raisedAmount: campaigns.raisedAmount,
        impactTarget: campaigns.impactTarget,
        impactUnit: campaigns.impactUnit,
        status: campaigns.status,
        organizationName: organizations.name
      })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .where(inArray(campaigns.status, ["published", "funded", "completed"]))
      .orderBy(desc(campaigns.publishedAt), asc(campaigns.title)),
    db
      .select({
        campaignId: corporateProjectPortfolio.campaignId,
        allocationAmount: corporateProjectPortfolio.allocationAmount,
        status: corporateProjectPortfolio.status
      })
      .from(corporateProjectPortfolio)
      .where(eq(corporateProjectPortfolio.programId, context.programId)),
    db
      .select({
        campaignId: corporateContributions.campaignId,
        contributionType: corporateContributions.contributionType,
        amount: corporateContributions.amount,
        status: corporateContributions.status,
        countsTowardCampaignGoal: corporateContributions.countsTowardCampaignGoal
      })
      .from(corporateContributions)
      .where(eq(corporateContributions.programId, context.programId))
  ]);

  const portfolioByCampaign = new Map(portfolioRows.map((row) => [row.campaignId, row]));
  const contributionByCampaign = new Map(contributionRows.map((row) => [row.campaignId, row]));

  return campaignRows.map((campaign) => {
    const portfolio = portfolioByCampaign.get(campaign.id);
    const contribution = contributionByCampaign.get(campaign.id);

    return {
      ...campaign,
      goalAmountValue: toNumber(campaign.goalAmount),
      raisedAmountValue: toNumber(campaign.raisedAmount),
      allocationValue: portfolio ? toNumber(portfolio.allocationAmount) : null,
      portfolioStatus: portfolio?.status ?? null,
      contributionAmountValue: contribution ? toNumber(contribution.amount) : null,
      contributionStatus: contribution?.status ?? null,
      contributionType: contribution?.contributionType ?? null,
      countsTowardCampaignGoal: contribution?.countsTowardCampaignGoal ?? false,
      alreadyFunded: Boolean(portfolio)
    };
  });
}

export async function getPublicCorporateImpactReport(publicSlug: string) {
  const [report] = await db
    .select({
      id: corporateReportExports.id,
      exportCode: corporateReportExports.exportCode,
      reportType: corporateReportExports.reportType,
      status: corporateReportExports.status,
      fileUrl: corporateReportExports.fileUrl,
      previewUrl: corporateReportExports.previewUrl,
      evidenceBundleUrl: corporateReportExports.evidenceBundleUrl,
      publicSlug: corporateReportExports.publicSlug,
      programId: corporatePrograms.id,
      approvedAt: corporateReportExports.approvedAt,
      publishedAt: corporateReportExports.publishedAt,
      createdAt: corporateReportExports.createdAt,
      metadata: corporateReportExports.metadata,
      accountName: corporateAccounts.name,
      accountSlug: corporateAccounts.slug,
      accountLogoUrl: corporateAccounts.logoUrl,
      programName: corporatePrograms.name,
      programSlug: corporatePrograms.slug,
      startsAt: corporatePrograms.startsAt,
      endsAt: corporatePrograms.endsAt,
      budgetAmount: corporatePrograms.budgetAmount,
      currency: corporatePrograms.currency
    })
    .from(corporateReportExports)
    .innerJoin(corporatePrograms, eq(corporateReportExports.programId, corporatePrograms.id))
    .innerJoin(corporateAccounts, eq(corporatePrograms.corporateAccountId, corporateAccounts.id))
    .where(and(eq(corporateReportExports.publicSlug, publicSlug), eq(corporateReportExports.status, "published")))
    .limit(1);

  if (!report) {
    return null;
  }

  const [portfolioRows, evidenceRows] = await Promise.all([
    db
      .select({
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        campaignCategory: campaigns.category,
        region: campaigns.region,
        imageUrl: campaigns.imageUrl,
        goalAmount: campaigns.goalAmount,
        raisedAmount: campaigns.raisedAmount,
        impactTarget: campaigns.impactTarget,
        impactUnit: campaigns.impactUnit,
        organizationName: organizations.name,
        organizationVerification: organizations.verification,
        allocationAmount: corporateProjectPortfolio.allocationAmount,
        status: corporateProjectPortfolio.status
      })
      .from(corporateProjectPortfolio)
      .innerJoin(corporatePrograms, eq(corporateProjectPortfolio.programId, corporatePrograms.id))
      .innerJoin(campaigns, eq(corporateProjectPortfolio.campaignId, campaigns.id))
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .where(eq(corporateProjectPortfolio.programId, report.programId)),
    db
      .select({
        evidenceCode: projectEvidence.evidenceCode,
        title: projectEvidence.title,
        evidenceType: projectEvidence.evidenceType,
        verificationStatus: projectEvidence.verificationStatus,
        fileUrl: projectEvidence.fileUrl,
        campaignId: campaigns.id,
        campaignSlug: campaigns.slug,
        campaignTitle: campaigns.title,
        organizationName: organizations.name,
        verifiedAt: projectEvidence.verifiedAt,
        addedAt: corporateEvidenceCenter.addedAt
      })
      .from(corporateEvidenceCenter)
      .innerJoin(corporatePrograms, eq(corporateEvidenceCenter.programId, corporatePrograms.id))
      .innerJoin(projectEvidence, eq(corporateEvidenceCenter.evidenceId, projectEvidence.id))
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .where(eq(corporateEvidenceCenter.programId, report.programId))
      .orderBy(desc(corporateEvidenceCenter.addedAt))
  ]);
  const portfolio = portfolioRows.map((project) => {
    const progress = Math.min(100, Math.round((toNumber(project.raisedAmount) / Math.max(1, toNumber(project.goalAmount))) * 100));

    return {
      ...project,
      allocationValue: toNumber(project.allocationAmount),
      progress,
      organizationVerification: verificationLabel(project.organizationVerification)
    };
  });
  const committedFunding = toNumber(report.budgetAmount);
  const totalAllocated = portfolio.reduce((total, project) => total + project.allocationValue, 0);
  const restorationUnits = portfolio.reduce((total, project) => total + project.impactTarget, 0);
  const verifiedEvidence = evidenceRows.filter((item) => item.verificationStatus === "verified").length;
  const evidence = evidenceRows.map((item) => ({
    ...item,
    sourceHref: evidenceSourceHref(item.campaignSlug, item.evidenceCode) ?? item.fileUrl
  }));

  return {
    report,
    portfolio,
    evidence,
    metrics: {
      committedFunding,
      totalAllocated,
      restorationUnits,
      verifiedEvidence,
      projectCount: portfolio.length,
      partnerCount: new Set(portfolio.map((project) => project.organizationName)).size
    }
  };
}

export async function getAdminCorporateData() {
  const [accountRows, programRows, permissionRows, contributionRows] = await Promise.all([
    db
      .select({
        id: corporateAccounts.id,
        name: corporateAccounts.name,
        slug: corporateAccounts.slug,
        logoUrl: corporateAccounts.logoUrl,
        createdAt: corporateAccounts.createdAt
      })
      .from(corporateAccounts)
      .orderBy(asc(corporateAccounts.name)),
    db
      .select({
        id: corporatePrograms.id,
        corporateAccountId: corporatePrograms.corporateAccountId,
        accountName: corporateAccounts.name,
        name: corporatePrograms.name,
        slug: corporatePrograms.slug,
        startsAt: corporatePrograms.startsAt,
        endsAt: corporatePrograms.endsAt,
        budgetAmount: corporatePrograms.budgetAmount,
        currency: corporatePrograms.currency,
        status: corporatePrograms.status,
        createdAt: corporatePrograms.createdAt
      })
      .from(corporatePrograms)
      .innerJoin(corporateAccounts, eq(corporatePrograms.corporateAccountId, corporateAccounts.id))
      .orderBy(desc(corporatePrograms.createdAt)),
    db
      .select({
        id: corporatePermissions.id,
        corporateAccountId: corporatePermissions.corporateAccountId,
        accountName: corporateAccounts.name,
        permission: corporatePermissions.permission,
        userId: users.id,
        email: users.email,
        name: users.name,
        displayName: profiles.displayName,
        createdAt: corporatePermissions.createdAt
      })
      .from(corporatePermissions)
      .innerJoin(corporateAccounts, eq(corporatePermissions.corporateAccountId, corporateAccounts.id))
      .innerJoin(users, eq(corporatePermissions.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(corporatePermissions.createdAt)),
    db
      .select({
        id: corporateContributions.id,
        corporateAccountId: corporateContributions.corporateAccountId,
        programId: corporateContributions.programId,
        referenceCode: corporateContributions.referenceCode,
        contributionType: corporateContributions.contributionType,
        amount: corporateContributions.amount,
        currency: corporateContributions.currency,
        status: corporateContributions.status,
        countsTowardCampaignGoal: corporateContributions.countsTowardCampaignGoal,
        contributionDate: corporateContributions.contributionDate,
        accountName: corporateAccounts.name,
        programName: corporatePrograms.name,
        campaignTitle: campaigns.title,
        campaignSlug: campaigns.slug
      })
      .from(corporateContributions)
      .innerJoin(corporateAccounts, eq(corporateContributions.corporateAccountId, corporateAccounts.id))
      .innerJoin(corporatePrograms, eq(corporateContributions.programId, corporatePrograms.id))
      .innerJoin(campaigns, eq(corporateContributions.campaignId, campaigns.id))
      .orderBy(desc(corporateContributions.contributionDate))
  ]);

  const programsByAccount = new Map<string, typeof programRows>();
  const permissionsByAccount = new Map<string, typeof permissionRows>();
  const contributionsByAccount = new Map<string, typeof contributionRows>();

  for (const program of programRows) {
    const rows = programsByAccount.get(program.corporateAccountId) ?? [];
    rows.push(program);
    programsByAccount.set(program.corporateAccountId, rows);
  }

  for (const permission of permissionRows) {
    const rows = permissionsByAccount.get(permission.corporateAccountId) ?? [];
    rows.push(permission);
    permissionsByAccount.set(permission.corporateAccountId, rows);
  }

  for (const contribution of contributionRows) {
    const rows = contributionsByAccount.get(contribution.corporateAccountId) ?? [];
    rows.push(contribution);
    contributionsByAccount.set(contribution.corporateAccountId, rows);
  }

  const contributions = contributionRows.map((contribution) => ({
    ...contribution,
    amountValue: toNumber(contribution.amount),
    publicGoalLabel: contribution.countsTowardCampaignGoal ? "Public campaign goal" : "Corporate reporting only"
  }));

  return {
    accounts: accountRows.map((account) => ({
      ...account,
      programs: programsByAccount.get(account.id) ?? [],
      permissions: permissionsByAccount.get(account.id) ?? [],
      contributions: contributionsByAccount.get(account.id) ?? [],
      contributionTotal: (contributionsByAccount.get(account.id) ?? []).reduce((total, contribution) => total + toNumber(contribution.amount), 0)
    })),
    programs: programRows.map((program) => ({
      ...program,
      budgetAmountValue: toNumber(program.budgetAmount)
    })),
    permissions: permissionRows,
    contributions,
    metrics: {
      accounts: accountRows.length,
      activePrograms: programRows.filter((program) => program.status === "active").length,
      corporateUsers: new Set(permissionRows.map((permission) => permission.userId)).size,
      contributionTotal: contributions.reduce((total, contribution) => total + contribution.amountValue, 0),
      publicGoalContribution: contributions
        .filter((contribution) => contribution.countsTowardCampaignGoal && ["committed", "disbursed", "verified"].includes(contribution.status))
        .reduce((total, contribution) => total + contribution.amountValue, 0)
    }
  };
}


export async function getAdminPortalData() {
  const now = new Date();
  const [
    campaignRows,
    organizationRows,
    campaignDonationCountRows,
    campaignSponsorshipCountRows,
    campaignPortfolioCountRows,
    campaignExpeditionCountRows,
    evidenceRows,
    donationRows,
    subscriptionDueRows,
    operationRows,
    bookingOperationRows,
    campaignMediaRows,
    campaignBudgetRows,
    campaignTimelineRows,
    organizationTeamRows
  ] = await Promise.all([
    db
      .select({
        id: campaigns.id,
        organizationId: campaigns.organizationId,
        title: campaigns.title,
        slug: campaigns.slug,
        summary: campaigns.summary,
        story: campaigns.story,
        category: campaigns.category,
        region: campaigns.region,
        imageUrl: campaigns.imageUrl,
        status: campaigns.status,
        raisedAmount: campaigns.raisedAmount,
        goalAmount: campaigns.goalAmount,
        donorCount: campaigns.donorCount,
        impactUnit: campaigns.impactUnit,
        impactTarget: campaigns.impactTarget,
        publishedAt: campaigns.publishedAt,
        endsAt: campaigns.endsAt,
        partner: organizations.name
      })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .orderBy(desc(campaigns.updatedAt)),
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
        campaignId: donations.campaignId,
        total: sql<number>`count(${donations.id})`
      })
      .from(donations)
      .groupBy(donations.campaignId),
    db
      .select({
        campaignId: sponsoredEcosystems.campaignId,
        total: sql<number>`count(${sponsoredEcosystems.id})`
      })
      .from(sponsoredEcosystems)
      .groupBy(sponsoredEcosystems.campaignId),
    db
      .select({
        campaignId: corporateProjectPortfolio.campaignId,
        total: sql<number>`count(${corporateProjectPortfolio.id})`
      })
      .from(corporateProjectPortfolio)
      .groupBy(corporateProjectPortfolio.campaignId),
    db
      .select({
        campaignId: expeditions.relatedCampaignId,
        total: sql<number>`count(${expeditions.id})`
      })
      .from(expeditions)
      .where(sql`${expeditions.relatedCampaignId} is not null`)
      .groupBy(expeditions.relatedCampaignId),
    db
      .select({
        id: projectEvidence.id,
        title: projectEvidence.title,
        evidenceCode: projectEvidence.evidenceCode,
        verificationStatus: projectEvidence.verificationStatus,
        fileUrl: projectEvidence.fileUrl,
        evidenceType: projectEvidence.evidenceType,
        rejectionReason: projectEvidence.rejectionReason,
        assignedReviewerUserId: projectEvidence.assignedReviewerUserId,
        clarificationNote: projectEvidence.clarificationNote,
        clarificationRequestedAt: projectEvidence.clarificationRequestedAt,
        clarificationResolvedAt: projectEvidence.clarificationResolvedAt,
        reviewedAt: projectEvidence.reviewedAt,
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
      .orderBy(desc(donations.createdAt)),
    db
      .select({
        id: donationSubscriptions.id,
        donorName: donationSubscriptions.donorName,
        donorEmail: donationSubscriptions.donorEmail,
        amount: donationSubscriptions.amount,
        currency: donationSubscriptions.currency,
        status: donationSubscriptions.status,
        nextBillingAt: donationSubscriptions.nextBillingAt,
        campaignTitle: campaigns.title,
        paymentMethodLabel: userPaymentMethods.label,
        paymentMethodLast4: userPaymentMethods.last4,
        paymentMethodStatus: userPaymentMethods.status
      })
      .from(donationSubscriptions)
      .innerJoin(campaigns, eq(donationSubscriptions.campaignId, campaigns.id))
      .leftJoin(userPaymentMethods, eq(donationSubscriptions.paymentMethodId, userPaymentMethods.id))
      .where(and(inArray(donationSubscriptions.status, [...activeSubscriptionStatuses]), lte(donationSubscriptions.nextBillingAt, now)))
      .orderBy(asc(donationSubscriptions.nextBillingAt))
      .limit(25),
    db
      .select({
        id: paymentOperations.id,
        operationCode: paymentOperations.operationCode,
        operationType: paymentOperations.operationType,
        entityType: paymentOperations.entityType,
        donationId: paymentOperations.donationId,
        bookingId: paymentOperations.bookingId,
        status: paymentOperations.status,
        reason: paymentOperations.reason,
        amount: paymentOperations.amount,
        currency: paymentOperations.currency,
        createdAt: paymentOperations.createdAt
      })
      .from(paymentOperations)
      .where(eq(paymentOperations.status, "pending"))
      .orderBy(desc(paymentOperations.createdAt)),
    db
      .select({
        id: paymentOperations.id,
        operationCode: paymentOperations.operationCode,
        operationType: paymentOperations.operationType,
        status: paymentOperations.status,
        reason: paymentOperations.reason,
        amount: paymentOperations.amount,
        currency: paymentOperations.currency,
        bookingId: expeditionBookings.id,
        bookingCode: expeditionBookings.bookingCode,
        paymentStatus: expeditionBookings.paymentStatus,
        contactName: expeditionBookings.contactName,
        expeditionTitle: expeditions.title,
        createdAt: paymentOperations.createdAt
      })
      .from(paymentOperations)
      .innerJoin(expeditionBookings, eq(paymentOperations.bookingId, expeditionBookings.id))
      .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
      .where(and(eq(paymentOperations.status, "pending"), eq(paymentOperations.entityType, "expedition_booking")))
      .orderBy(desc(paymentOperations.createdAt)),
    db
      .select({
        id: campaignMediaItems.id,
        campaignId: campaignMediaItems.campaignId,
        title: campaignMediaItems.title,
        mediaType: campaignMediaItems.mediaType,
        fileUrl: campaignMediaItems.fileUrl,
        thumbnailUrl: campaignMediaItems.thumbnailUrl,
        altText: campaignMediaItems.altText,
        caption: campaignMediaItems.caption,
        provenance: campaignMediaItems.provenance,
        sortOrder: campaignMediaItems.sortOrder,
        isFeatured: campaignMediaItems.isFeatured
      })
      .from(campaignMediaItems)
      .orderBy(asc(campaignMediaItems.sortOrder), asc(campaignMediaItems.title)),
    db
      .select({
        id: campaignBudgetLineItems.id,
        campaignId: campaignBudgetLineItems.campaignId,
        category: campaignBudgetLineItems.category,
        description: campaignBudgetLineItems.description,
        amount: campaignBudgetLineItems.amount,
        spentAmount: campaignBudgetLineItems.spentAmount,
        sortOrder: campaignBudgetLineItems.sortOrder
      })
      .from(campaignBudgetLineItems)
      .orderBy(asc(campaignBudgetLineItems.sortOrder), asc(campaignBudgetLineItems.category)),
    db
      .select({
        id: campaignTimelinePhases.id,
        campaignId: campaignTimelinePhases.campaignId,
        title: campaignTimelinePhases.title,
        description: campaignTimelinePhases.description,
        status: campaignTimelinePhases.status,
        startsAt: campaignTimelinePhases.startsAt,
        endsAt: campaignTimelinePhases.endsAt,
        deliverable: campaignTimelinePhases.deliverable,
        evidenceNote: campaignTimelinePhases.evidenceNote,
        sortOrder: campaignTimelinePhases.sortOrder
      })
      .from(campaignTimelinePhases)
      .orderBy(asc(campaignTimelinePhases.sortOrder), asc(campaignTimelinePhases.startsAt)),
    db
      .select({
        id: organizationTeamMembers.id,
        organizationId: organizationTeamMembers.organizationId,
        name: organizationTeamMembers.name,
        role: organizationTeamMembers.role,
        bio: organizationTeamMembers.bio,
        imageUrl: organizationTeamMembers.imageUrl,
        profileUrl: organizationTeamMembers.profileUrl,
        sortOrder: organizationTeamMembers.sortOrder,
        isPublic: organizationTeamMembers.isPublic
      })
      .from(organizationTeamMembers)
      .orderBy(asc(organizationTeamMembers.sortOrder), asc(organizationTeamMembers.name))
  ]);
  const evidenceReviewEventsById = await getEvidenceReviewEventsByEvidenceIds(evidenceRows.map((item) => item.id));
  const pendingOperationsByDonationId = new Map(
    operationRows
      .filter((operation) => operation.donationId)
      .map((operation) => [operation.donationId as string, operation])
  );
  const donationCounts = new Map(campaignDonationCountRows.map((row) => [row.campaignId, Number(row.total)]));
  const sponsorshipCounts = new Map(campaignSponsorshipCountRows.map((row) => [row.campaignId, Number(row.total)]));
  const portfolioCounts = new Map(campaignPortfolioCountRows.map((row) => [row.campaignId, Number(row.total)]));
  const mediaCounts = new Map<string, number>();
  const budgetCounts = new Map<string, number>();
  const timelineCounts = new Map<string, number>();
  const teamCounts = new Map<string, number>();
  const expeditionCounts = new Map<string, number>();

  for (const row of campaignExpeditionCountRows) {
    if (row.campaignId) {
      expeditionCounts.set(row.campaignId, Number(row.total));
    }
  }

  for (const row of campaignMediaRows) {
    mediaCounts.set(row.campaignId, (mediaCounts.get(row.campaignId) ?? 0) + 1);
  }

  for (const row of campaignBudgetRows) {
    budgetCounts.set(row.campaignId, (budgetCounts.get(row.campaignId) ?? 0) + 1);
  }

  for (const row of campaignTimelineRows) {
    timelineCounts.set(row.campaignId, (timelineCounts.get(row.campaignId) ?? 0) + 1);
  }

  for (const row of organizationTeamRows) {
    if (row.isPublic) {
      teamCounts.set(row.organizationId, (teamCounts.get(row.organizationId) ?? 0) + 1);
    }
  }

  return {
    organizations: organizationRows,
    campaigns: campaignRows.map((campaign) => ({
      ...campaign,
      donationRecordCount: donationCounts.get(campaign.id) ?? 0,
      sponsorshipRecordCount: sponsorshipCounts.get(campaign.id) ?? 0,
      corporatePortfolioCount: portfolioCounts.get(campaign.id) ?? 0,
      relatedExpeditionCount: expeditionCounts.get(campaign.id) ?? 0,
      contentCompleteness: campaignContentCompleteness({
        media: mediaCounts.get(campaign.id) ?? 0,
        budget: budgetCounts.get(campaign.id) ?? 0,
        timeline: timelineCounts.get(campaign.id) ?? 0,
        team: teamCounts.get(campaign.organizationId) ?? 0
      })
    })),
    campaignMediaItems: campaignMediaRows,
    campaignBudgetLineItems: campaignBudgetRows.map((item) => ({
      ...item,
      amount: toNumber(item.amount),
      spentAmount: toNumber(item.spentAmount)
    })),
    campaignTimelinePhases: campaignTimelineRows,
    organizationTeamMembers: organizationTeamRows,
    evidence: evidenceRows.map((item) => {
      const reviewEvents = evidenceReviewEventsById.get(item.id) ?? [];

      return {
        ...item,
        reviewStage: evidenceReviewStage(item.verificationStatus),
        statusLabel: evidenceStatusLabel(item.verificationStatus),
        latestReviewNote: latestEvidenceReviewNote(reviewEvents, item.clarificationNote ?? item.rejectionReason),
        reviewEvents
      };
    }),
    donations: donationRows.map((donation) => ({
      ...donation,
      pendingOperation: pendingOperationsByDonationId.get(donation.id) ?? null
    })),
    dueSubscriptions: subscriptionDueRows,
    bookingPaymentOperations: bookingOperationRows,
    paymentOperations: operationRows
  };
}

export async function getAdminOperationsData() {
  const [
    partners,
    partnerMemberRows,
    partnerCampaignCountRows,
    campaignOptionRows,
    expeditionRows,
    expeditionBookingCountRows,
    expeditionBookingRows,
    expeditionInterestRequestRows,
    expeditionReviewRows,
    impactSiteRows,
    reportRows,
    monthlyImpactReportRows,
    monthlyReportEligibleRows,
    userRows,
    auditRows
  ] = await Promise.all([
    db
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
      .orderBy(asc(organizations.name)),
    db
      .select({
        id: organizationUsers.id,
        organizationId: organizationUsers.organizationId,
        userId: organizationUsers.userId,
        role: organizationUsers.role,
        status: organizationUsers.status,
        createdAt: organizationUsers.createdAt,
        updatedAt: organizationUsers.updatedAt,
        email: users.email,
        name: users.name,
        displayName: profiles.displayName
      })
      .from(organizationUsers)
      .innerJoin(users, eq(organizationUsers.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(asc(users.email)),
    db
      .select({
        organizationId: campaigns.organizationId,
        total: sql<number>`count(${campaigns.id})`
      })
      .from(campaigns)
      .groupBy(campaigns.organizationId),
    db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        status: campaigns.status,
        organizationName: organizations.name
      })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .orderBy(asc(campaigns.title)),
    db
      .select({
        id: expeditions.id,
        title: expeditions.title,
        slug: expeditions.slug,
        region: expeditions.region,
        durationDays: expeditions.durationDays,
        basePrice: expeditions.basePrice,
        summary: expeditions.summary,
        imageUrl: expeditions.imageUrl,
        metadata: expeditions.metadata,
        relatedCampaignId: expeditions.relatedCampaignId,
        relatedCampaignTitle: campaigns.title,
        departureId: expeditionDepartures.id,
        startsAt: expeditionDepartures.startsAt,
        endsAt: expeditionDepartures.endsAt,
        capacity: expeditionDepartures.capacity,
        seatsBooked: expeditionDepartures.seatsBooked,
        status: expeditionDepartures.status,
        departureMetadata: expeditionDepartures.metadata
      })
      .from(expeditions)
      .leftJoin(expeditionDepartures, eq(expeditionDepartures.expeditionId, expeditions.id))
      .leftJoin(campaigns, eq(expeditions.relatedCampaignId, campaigns.id))
      .orderBy(asc(expeditions.title)),
    db
      .select({
        expeditionId: expeditionBookings.expeditionId,
        departureId: expeditionBookings.departureId,
        total: sql<number>`count(${expeditionBookings.id})`
      })
      .from(expeditionBookings)
      .groupBy(expeditionBookings.expeditionId, expeditionBookings.departureId),
    db
      .select({
        id: expeditionBookings.id,
        expeditionId: expeditionBookings.expeditionId,
        departureId: expeditionBookings.departureId,
        bookingCode: expeditionBookings.bookingCode,
        contactName: expeditionBookings.contactName,
        contactEmail: expeditionBookings.contactEmail,
        participantsCount: expeditionBookings.participantsCount,
        status: expeditionBookings.status,
        paymentStatus: expeditionBookings.paymentStatus,
        totalAmount: expeditionBookings.totalAmount,
        currency: expeditionBookings.currency,
        bookedAt: expeditionBookings.bookedAt,
        startsAt: expeditionDepartures.startsAt
      })
      .from(expeditionBookings)
      .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
      .orderBy(desc(expeditionBookings.bookedAt))
      .limit(500),
    db
      .select({
        id: expeditionInterestRequests.id,
        expeditionId: expeditionInterestRequests.expeditionId,
        departureId: expeditionInterestRequests.departureId,
        requestCode: expeditionInterestRequests.requestCode,
        requestType: expeditionInterestRequests.requestType,
        status: expeditionInterestRequests.status,
        contactName: expeditionInterestRequests.contactName,
        contactEmail: expeditionInterestRequests.contactEmail,
        participantsCount: expeditionInterestRequests.participantsCount,
        preferredStartAt: expeditionInterestRequests.preferredStartAt,
        message: expeditionInterestRequests.message,
        createdAt: expeditionInterestRequests.createdAt,
        processedAt: expeditionInterestRequests.processedAt,
        processedByEmail: users.email
      })
      .from(expeditionInterestRequests)
      .leftJoin(users, eq(expeditionInterestRequests.processedByUserId, users.id))
      .orderBy(desc(expeditionInterestRequests.createdAt))
      .limit(500),
    db
      .select({
        id: expeditionReviews.id,
        expeditionId: expeditionReviews.expeditionId,
        bookingId: expeditionReviews.bookingId,
        rating: expeditionReviews.rating,
        title: expeditionReviews.title,
        body: expeditionReviews.body,
        status: expeditionReviews.status,
        createdAt: expeditionReviews.createdAt,
        updatedAt: expeditionReviews.updatedAt,
        bookingCode: expeditionBookings.bookingCode,
        bookingStatus: expeditionBookings.status,
        contactName: expeditionBookings.contactName,
        contactEmail: expeditionBookings.contactEmail,
        userEmail: users.email,
        userName: users.name,
        reviewerDisplayName: profiles.displayName
      })
      .from(expeditionReviews)
      .innerJoin(expeditionBookings, eq(expeditionReviews.bookingId, expeditionBookings.id))
      .leftJoin(users, eq(expeditionReviews.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(expeditionReviews.updatedAt))
      .limit(250),
    db
      .select({
        id: impactSites.id,
        campaignId: impactSites.campaignId,
        name: impactSites.name,
        ecosystemType: impactSites.ecosystemType,
        region: impactSites.region,
        latitude: impactSites.latitude,
        longitude: impactSites.longitude,
        campaignTitle: campaigns.title,
        campaignSlug: campaigns.slug,
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
        id: monthlyImpactReports.id,
        userId: monthlyImpactReports.userId,
        reportMonth: monthlyImpactReports.reportMonth,
        status: monthlyImpactReports.status,
        label: monthlyImpactReports.label,
        contributions: monthlyImpactReports.contributions,
        campaignUpdates: monthlyImpactReports.campaignUpdates,
        newEvidence: monthlyImpactReports.newEvidence,
        coralsMonitored: monthlyImpactReports.coralsMonitored,
        academyProgress: monthlyImpactReports.academyProgress,
        emailedAt: monthlyImpactReports.emailedAt,
        generatedAt: monthlyImpactReports.generatedAt,
        metadata: monthlyImpactReports.metadata,
        userEmail: users.email,
        userName: users.name,
        displayName: profiles.displayName
      })
      .from(monthlyImpactReports)
      .innerJoin(users, eq(monthlyImpactReports.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(monthlyImpactReports.generatedAt))
      .limit(100),
    db
      .select({
        total: sql<number>`count(${notificationPreferences.userId})`,
        emailEnabled: sql<number>`sum(case when ${notificationPreferences.monthlyImpactEmail} then 1 else 0 end)`
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.monthlyImpactReport, true)),
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

  const campaignCounts = new Map(partnerCampaignCountRows.map((row) => [row.organizationId, Number(row.total)]));
  const expeditionBookingCounts = new Map<string, number>();
  const departureBookingCounts = new Map<string, number>();
  const latestMonthlyImpactReport = monthlyImpactReportRows[0] ?? null;

  for (const row of expeditionBookingCountRows) {
    const total = Number(row.total);

    expeditionBookingCounts.set(row.expeditionId, (expeditionBookingCounts.get(row.expeditionId) ?? 0) + total);
    departureBookingCounts.set(row.departureId, total);
  }

  const expeditionCatalogById = new Map<
    string,
    {
      id: string;
      title: string;
      slug: string;
      region: string;
      durationDays: number;
      basePrice: number;
      summary: string;
      imageUrl: string | null;
      metadata: unknown;
      metadataJson: string;
      detailMetadata: ReturnType<typeof normalizeExpeditionDetailMetadata> | null;
      relatedCampaignId: string | null;
      relatedCampaignTitle: string | null;
      bookingCount: number;
      departures: {
        id: string;
        startsAt: Date;
        endsAt: Date;
        capacity: number;
        seatsBooked: number;
        availableSeats: number;
        status: string;
        bookingCount: number;
        meetingPoint: string | null;
        guide: string | null;
        minParticipants: number;
        availabilityCode: ReturnType<typeof expeditionDepartureAvailability>["code"];
        availabilityLabel: string;
        availabilityMessage: string;
        weatherAdvisory: string | null;
      }[];
      bookings: {
        id: string;
        departureId: string;
        bookingCode: string;
        contactName: string;
        contactEmail: string;
        participantsCount: number;
        status: string;
        paymentStatus: string;
        totalAmount: number;
        currency: string;
        bookedAt: Date;
        startsAt: Date;
        canCancel: boolean;
      }[];
      interestRequests: {
        id: string;
        departureId: string | null;
        requestCode: string;
        requestType: ReturnType<typeof normalizeExpeditionInterestRequestType>;
        status: ReturnType<typeof normalizeExpeditionInterestRequestStatus>;
        contactName: string;
        contactEmail: string;
        participantsCount: number;
        preferredStartAt: Date | null;
        message: string | null;
        createdAt: Date;
        processedAt: Date | null;
        processedByEmail: string | null;
      }[];
      reviews: {
        id: string;
        bookingId: string;
        bookingCode: string;
        bookingStatus: string;
        reviewerName: string;
        reviewerEmail: string;
        rating: number;
        title: string | null;
        body: string;
        status: ReturnType<typeof normalizeExpeditionReviewStatus>;
        createdAt: Date;
        updatedAt: Date;
      }[];
    }
  >();

  for (const row of expeditionRows) {
    let expedition = expeditionCatalogById.get(row.id);

    if (!expedition) {
      expedition = {
        id: row.id,
        title: row.title,
        slug: row.slug,
        region: row.region,
        durationDays: row.durationDays,
        basePrice: toNumber(row.basePrice),
        summary: row.summary,
        imageUrl: row.imageUrl,
        metadata: row.metadata,
        metadataJson: "",
        detailMetadata: null,
        relatedCampaignId: row.relatedCampaignId,
        relatedCampaignTitle: row.relatedCampaignTitle,
        bookingCount: expeditionBookingCounts.get(row.id) ?? 0,
        departures: [],
        bookings: [],
        interestRequests: [],
        reviews: []
      };
      expeditionCatalogById.set(row.id, expedition);
    }

    if (row.departureId && row.startsAt && row.endsAt && row.capacity !== null && row.seatsBooked !== null && row.status) {
      const minParticipants = getMetadataNumber(row.departureMetadata, "minParticipants", 6);
      const availability = expeditionDepartureAvailability({
        status: row.status,
        capacity: row.capacity,
        seatsBooked: row.seatsBooked,
        minParticipants
      });

      expedition.departures.push({
        id: row.departureId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        capacity: row.capacity,
        seatsBooked: row.seatsBooked,
        availableSeats: availability.availableSeats,
        status: row.status,
        bookingCount: departureBookingCounts.get(row.departureId) ?? 0,
        meetingPoint: getMetadataString(row.departureMetadata, "meetingPoint"),
        guide: getMetadataString(row.departureMetadata, "guide"),
        minParticipants,
        availabilityCode: availability.code,
        availabilityLabel: availability.label,
        availabilityMessage: availability.message,
        weatherAdvisory: getMetadataString(row.departureMetadata, "weatherAdvisory")
      });
    }
  }

  const now = new Date();

  for (const row of expeditionBookingRows) {
    const expedition = expeditionCatalogById.get(row.expeditionId);

    if (!expedition) {
      continue;
    }

    expedition.bookings.push({
      id: row.id,
      departureId: row.departureId,
      bookingCode: row.bookingCode,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      participantsCount: row.participantsCount,
      status: row.status,
      paymentStatus: row.paymentStatus,
      totalAmount: toNumber(row.totalAmount),
      currency: row.currency,
      bookedAt: row.bookedAt,
      startsAt: row.startsAt,
      canCancel: canCancelExpeditionBooking({ bookingStatus: row.status, paymentStatus: row.paymentStatus, startsAt: row.startsAt }, now)
    });
  }

  for (const row of expeditionInterestRequestRows) {
    const expedition = expeditionCatalogById.get(row.expeditionId);

    if (!expedition) {
      continue;
    }

    expedition.interestRequests.push({
      id: row.id,
      departureId: row.departureId,
      requestCode: row.requestCode,
      requestType: normalizeExpeditionInterestRequestType(row.requestType),
      status: normalizeExpeditionInterestRequestStatus(row.status),
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      participantsCount: row.participantsCount,
      preferredStartAt: row.preferredStartAt,
      message: row.message,
      createdAt: row.createdAt,
      processedAt: row.processedAt,
      processedByEmail: row.processedByEmail
    });
  }

  for (const row of expeditionReviewRows) {
    const expedition = expeditionCatalogById.get(row.expeditionId);

    if (!expedition) {
      continue;
    }

    expedition.reviews.push({
      id: row.id,
      bookingId: row.bookingId,
      bookingCode: row.bookingCode,
      bookingStatus: row.bookingStatus,
      reviewerName: row.reviewerDisplayName ?? row.userName ?? row.contactName,
      reviewerEmail: row.userEmail ?? row.contactEmail,
      rating: row.rating,
      title: row.title,
      body: row.body,
      status: normalizeExpeditionReviewStatus(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }

  for (const expedition of expeditionCatalogById.values()) {
    const maxCapacity = expedition.departures.reduce((capacity, departure) => Math.max(capacity, departure.capacity), 0);
    const metadata = normalizeExpeditionDetailMetadata(
      expedition.metadata,
      buildDefaultExpeditionDetailMetadata({
        title: expedition.title,
        region: expedition.region,
        durationLabel: toExpeditionCard(expedition).duration,
        price: expedition.basePrice,
        maxCapacity,
        galleryImages: [
          {
            src: expedition.imageUrl ?? "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1400&q=80",
            label: "Destination",
            caption: `${expedition.region} expedition landscape`,
            provenance: "Partner-managed public detail image"
          }
        ],
        tripUpdates: [
          {
            title: "Seasonal weather advisory",
            date: "2026-06-01T00:00:00.000Z",
            body: "Boat schedules may shift when sea conditions require safer departure windows."
          }
        ]
      })
    );

    expedition.metadataJson = expeditionMetadataEditorJson(metadata);
    expedition.detailMetadata = metadata;
  }

  return {
    campaignOptions: campaignOptionRows,
    partners: partners.map((partner) => ({
      ...partner,
      campaignCount: campaignCounts.get(partner.id) ?? 0,
      members: partnerMemberRows.filter((member) => member.organizationId === partner.id),
      verificationLabel: verificationLabel(partner.verification)
    })),
    expeditionCatalog: Array.from(expeditionCatalogById.values()),
    expeditions: expeditionRows.map((row) => ({
      ...row,
      basePrice: toNumber(row.basePrice),
      availableSeats: row.capacity === null || row.seatsBooked === null ? null : Math.max(0, row.capacity - row.seatsBooked)
    })),
    impactSites: impactSiteRows.map((site) => ({
      ...site,
      latitude: toNumber(site.latitude),
      longitude: toNumber(site.longitude),
      progress: getMetadataNumber(site.metadata, "progress"),
      evidenceCount: getMetadataNumber(site.metadata, "evidenceCount"),
      latestSurvey: getMetadataString(site.metadata, "latestSurvey"),
      verification: getMetadataString(site.metadata, "verification") ?? "basic"
    })),
    reports: reportRows,
    monthlyImpactReports: monthlyImpactReportRows.map((report) => ({
      ...report,
      contributions: toNumber(report.contributions)
    })),
    monthlyImpactSummary: {
      eligibleUsers: Number(monthlyReportEligibleRows[0]?.total ?? 0),
      emailEnabledUsers: Number(monthlyReportEligibleRows[0]?.emailEnabled ?? 0),
      readyReports: monthlyImpactReportRows.filter((report) => report.status === "ready").length,
      emailedReports: monthlyImpactReportRows.filter((report) => report.emailedAt).length,
      latestGeneratedAt: latestMonthlyImpactReport?.generatedAt ?? null
    },
    users: userRows,
    auditLogs: auditRows
  };
}

export type AdminAuditFilters = {
  action?: string;
  actor?: string;
  entityType?: string;
  q?: string;
};

function cleanAuditFilter(value: string | null | undefined, maxLength = 160) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

export async function getAdminAuditData(filters: AdminAuditFilters = {}) {
  const q = cleanAuditFilter(filters.q, 240).toLowerCase();
  const action = cleanAuditFilter(filters.action);
  const actor = cleanAuditFilter(filters.actor, 255).toLowerCase();
  const entityType = cleanAuditFilter(filters.entityType, 120);
  const conditions = [];

  if (q) {
    const pattern = `%${q}%`;

    conditions.push(or(
      sql`lower(${adminAuditLogs.action}) like ${pattern}`,
      sql`lower(${adminAuditLogs.entityType}) like ${pattern}`,
      sql`cast(${adminAuditLogs.entityId} as text) like ${pattern}`,
      sql`lower(coalesce(${users.email}, 'system')) like ${pattern}`,
      sql`lower(cast(${adminAuditLogs.metadata} as text)) like ${pattern}`
    ));
  }

  if (action && action !== "all") {
    conditions.push(eq(adminAuditLogs.action, action));
  }

  if (entityType && entityType !== "all") {
    conditions.push(eq(adminAuditLogs.entityType, entityType));
  }

  if (actor && actor !== "all") {
    conditions.push(actor === "system" ? sql`${adminAuditLogs.actorUserId} is null` : eq(users.email, actor));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : sql`true`;

  const [eventRows, actionRows, entityRows, actorRows] = await Promise.all([
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
      .where(whereClause)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(200),
    db
      .select({ action: adminAuditLogs.action })
      .from(adminAuditLogs)
      .groupBy(adminAuditLogs.action)
      .orderBy(asc(adminAuditLogs.action)),
    db
      .select({ entityType: adminAuditLogs.entityType })
      .from(adminAuditLogs)
      .groupBy(adminAuditLogs.entityType)
      .orderBy(asc(adminAuditLogs.entityType)),
    db
      .select({ email: users.email })
      .from(adminAuditLogs)
      .leftJoin(users, eq(adminAuditLogs.actorUserId, users.id))
      .groupBy(users.email)
      .orderBy(asc(users.email))
  ]);

  const systemActions = eventRows.filter((item) => !item.actorEmail).length;

  return {
    auditLogs: eventRows,
    filters: {
      action,
      actor,
      entityType,
      q
    },
    options: {
      actions: actionRows.map((row) => row.action),
      actors: [
        ...actorRows
          .map((row) => row.email)
          .filter((email): email is string => Boolean(email)),
        "system"
      ],
      entityTypes: entityRows.map((row) => row.entityType)
    },
    metrics: {
      visibleActions: eventRows.length,
      humanActions: eventRows.length - systemActions,
      systemActions
    }
  };
}

export async function getAdminUserManagementData(searchTerm?: string) {
  const [
    userRows,
    roleRows,
    userRoleRows,
    organizationRows,
    partnerMembershipRows,
    corporateAccountRows,
    corporatePermissionRows,
    sessionRows
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        imageUrl: users.imageUrl,
        hasPassword: sql<boolean>`${users.passwordHash} is not null`,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        displayName: profiles.displayName,
        location: profiles.location,
        bio: profiles.bio,
        isPublic: profiles.isPublic
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(users.createdAt)),
    db
      .select({
        id: roles.id,
        key: roles.key,
        name: roles.name
      })
      .from(roles)
      .orderBy(asc(roles.key)),
    db
      .select({
        id: userRoles.id,
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        key: roles.key,
        name: roles.name,
        createdAt: userRoles.createdAt
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .orderBy(asc(roles.key)),
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
        id: organizationUsers.id,
        organizationId: organizationUsers.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        userId: organizationUsers.userId,
        role: organizationUsers.role,
        status: organizationUsers.status,
        createdAt: organizationUsers.createdAt,
        updatedAt: organizationUsers.updatedAt
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .orderBy(asc(organizations.name)),
    db
      .select({
        id: corporateAccounts.id,
        name: corporateAccounts.name,
        slug: corporateAccounts.slug
      })
      .from(corporateAccounts)
      .orderBy(asc(corporateAccounts.name)),
    db
      .select({
        id: corporatePermissions.id,
        corporateAccountId: corporatePermissions.corporateAccountId,
        accountName: corporateAccounts.name,
        accountSlug: corporateAccounts.slug,
        userId: corporatePermissions.userId,
        permission: corporatePermissions.permission,
        createdAt: corporatePermissions.createdAt
      })
      .from(corporatePermissions)
      .innerJoin(corporateAccounts, eq(corporatePermissions.corporateAccountId, corporateAccounts.id))
      .orderBy(asc(corporateAccounts.name)),
    db
      .select({
        userId: sessions.userId,
        total: sql<number>`count(${sessions.id})`
      })
      .from(sessions)
      .groupBy(sessions.userId)
  ]);

  const rolesByUser = new Map<string, typeof userRoleRows>();
  const partnerMembershipsByUser = new Map<string, typeof partnerMembershipRows>();
  const corporatePermissionsByUser = new Map<string, typeof corporatePermissionRows>();
  const activeSessionsByUser = new Map(sessionRows.map((row) => [row.userId, Number(row.total)]));
  const roleAssignmentCounts = new Map<string, number>();

  for (const role of userRoleRows) {
    rolesByUser.set(role.userId, [...(rolesByUser.get(role.userId) ?? []), role]);
    roleAssignmentCounts.set(role.roleId, (roleAssignmentCounts.get(role.roleId) ?? 0) + 1);
  }

  for (const membership of partnerMembershipRows) {
    partnerMembershipsByUser.set(membership.userId, [...(partnerMembershipsByUser.get(membership.userId) ?? []), membership]);
  }

  for (const permission of corporatePermissionRows) {
    corporatePermissionsByUser.set(permission.userId, [...(corporatePermissionsByUser.get(permission.userId) ?? []), permission]);
  }

  const query = String(searchTerm ?? "").trim().toLowerCase();
  const systemRoleKeys = new Set<string>(systemGlobalRoleOptions.map((role) => role.key));
  const roleOptionMap = new Map<string, { key: string; name: string }>();

  for (const option of systemGlobalRoleOptions) {
    roleOptionMap.set(option.key, option);
  }

  for (const role of roleRows) {
    roleOptionMap.set(role.key, { key: role.key, name: role.name });
  }

  const usersWithAccess = userRows
    .map((user) => {
      const globalRoles = rolesByUser.get(user.id) ?? [];
      const partnerMemberships = partnerMembershipsByUser.get(user.id) ?? [];
      const corporatePermissions = corporatePermissionsByUser.get(user.id) ?? [];
      const searchable = [
        user.email,
        user.name,
        user.displayName,
        user.location,
        ...globalRoles.map((role) => `${role.key} ${role.name}`),
        ...partnerMemberships.map((membership) => `${membership.organizationName} ${membership.role} ${membership.status}`),
        ...corporatePermissions.map((permission) => `${permission.accountName} ${permission.permission}`)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        ...user,
        roles: globalRoles,
        partnerMemberships,
        corporatePermissions,
        activeSessions: activeSessionsByUser.get(user.id) ?? 0,
        matchesSearch: !query || searchable.includes(query)
      };
    })
    .flatMap((user) => {
      if (!user.matchesSearch) {
        return [];
      }

      return [{
        activeSessions: user.activeSessions,
        bio: user.bio,
        corporatePermissions: user.corporatePermissions,
        createdAt: user.createdAt,
        displayName: user.displayName,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        hasPassword: user.hasPassword,
        id: user.id,
        imageUrl: user.imageUrl,
        isPublic: user.isPublic,
        location: user.location,
        name: user.name,
        partnerMemberships: user.partnerMemberships,
        roles: user.roles,
        updatedAt: user.updatedAt
      }];
    });

  const globalAdminUserIds = new Set(userRoleRows.filter((role) => role.key === "admin").map((role) => role.userId));
  const globalPartnerUserIds = new Set(userRoleRows.filter((role) => role.key === "partner").map((role) => role.userId));
  const activePartnerUserIds = new Set(partnerMembershipRows.filter((membership) => membership.status === "active").map((membership) => membership.userId));
  const globalCorporateUserIds = new Set(userRoleRows.filter((role) => role.key === "corporate_admin").map((role) => role.userId));
  const scopedCorporateUserIds = new Set(corporatePermissionRows.map((permission) => permission.userId));
  const roleUserIds = new Set(userRoleRows.map((role) => role.userId));

  return {
    metrics: {
      users: userRows.length,
      visibleUsers: usersWithAccess.length,
      verifiedUsers: userRows.filter((user) => user.emailVerifiedAt).length,
      admins: globalAdminUserIds.size,
      partnerUsers: new Set([...globalPartnerUserIds, ...activePartnerUserIds]).size,
      corporateUsers: new Set([...globalCorporateUserIds, ...scopedCorporateUserIds]).size,
      noRoleUsers: userRows.filter((user) => !roleUserIds.has(user.id)).length
    },
    users: usersWithAccess,
    roles: roleRows.map((role) => ({
      ...role,
      assignmentCount: roleAssignmentCounts.get(role.id) ?? 0,
      isSystem: systemRoleKeys.has(role.key)
    })),
    roleOptions: Array.from(roleOptionMap.values()).sort((a, b) => a.key.localeCompare(b.key)),
    organizations: organizationRows.map((organization) => ({
      ...organization,
      verificationLabel: verificationLabel(organization.verification)
    })),
    corporateAccounts: corporateAccountRows,
    partnerMemberships: partnerMembershipRows,
    corporatePermissions: corporatePermissionRows
  };
}

async function getPartnerPortalOrganizationIds(userId?: string) {
  if (!userId) {
    return null;
  }

  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  if (roleRows.some((role) => role.key === "admin")) {
    return null;
  }

  const membershipRows = await db
    .select({ organizationId: organizationUsers.organizationId })
    .from(organizationUsers)
    .where(and(eq(organizationUsers.userId, userId), eq(organizationUsers.status, "active")));

  return membershipRows.map((membership) => membership.organizationId);
}

export async function getPartnerPortalData(userId?: string) {
  const organizationIds = await getPartnerPortalOrganizationIds(userId);
  const [roleRows, activeMembershipRows] = userId
    ? await Promise.all([
        db
          .select({ key: roles.key })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, userId)),
        db
          .select({ role: organizationUsers.role })
          .from(organizationUsers)
          .where(and(eq(organizationUsers.userId, userId), eq(organizationUsers.status, "active")))
      ])
    : [[], []];
  const isAdmin = roleRows.some((role) => role.key === "admin");
  const capabilities = partnerCapabilitiesForRoles(activeMembershipRows.map((membership) => membership.role), isAdmin);
  const organizationScope = organizationIds === null ? sql`true` : organizationIds.length > 0 ? inArray(organizations.id, organizationIds) : sql`false`;
  const campaignScope = organizationIds === null ? sql`true` : organizationIds.length > 0 ? inArray(campaigns.organizationId, organizationIds) : sql`false`;
  const expeditionScope = organizationIds === null ? sql`true` : organizationIds.length > 0 ? inArray(campaigns.organizationId, organizationIds) : sql`false`;
  const teamOrganizationScope = organizationIds === null ? sql`true` : organizationIds.length > 0 ? inArray(organizationTeamMembers.organizationId, organizationIds) : sql`false`;

  const [
    organizationRows,
    campaignRows,
    evidenceRows,
    updateRows,
    activityRows,
    siteRows,
    sponsoredRows,
    expeditionRows,
    expeditionBookingCountRows,
    donorRows,
    campaignMediaRows,
    campaignBudgetRows,
    campaignTimelineRows,
    organizationTeamRows
  ] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        type: organizations.type,
        verification: organizations.verification
      })
      .from(organizations)
      .where(organizationScope)
      .orderBy(asc(organizations.name)),
    db
      .select({
        id: campaigns.id,
        organizationId: campaigns.organizationId,
        title: campaigns.title,
        slug: campaigns.slug,
        summary: campaigns.summary,
        story: campaigns.story,
        category: campaigns.category,
        region: campaigns.region,
        imageUrl: campaigns.imageUrl,
        status: campaigns.status,
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
      .where(campaignScope)
      .orderBy(desc(campaigns.updatedAt)),
    db
      .select({
        id: projectEvidence.id,
        campaignId: projectEvidence.campaignId,
        title: projectEvidence.title,
        evidenceCode: projectEvidence.evidenceCode,
        evidenceType: projectEvidence.evidenceType,
        verificationStatus: projectEvidence.verificationStatus,
        campaignTitle: campaigns.title,
        fileUrl: projectEvidence.fileUrl,
        rejectionReason: projectEvidence.rejectionReason,
        assignedReviewerUserId: projectEvidence.assignedReviewerUserId,
        clarificationNote: projectEvidence.clarificationNote,
        clarificationRequestedAt: projectEvidence.clarificationRequestedAt,
        clarificationResolvedAt: projectEvidence.clarificationResolvedAt,
        reviewedAt: projectEvidence.reviewedAt,
        createdAt: projectEvidence.createdAt
      })
      .from(projectEvidence)
      .innerJoin(campaigns, eq(projectEvidence.campaignId, campaigns.id))
      .where(campaignScope)
      .orderBy(desc(projectEvidence.createdAt)),
    db
      .select({
        id: campaignUpdates.id,
        campaignId: campaignUpdates.campaignId,
        title: campaignUpdates.title,
        body: campaignUpdates.body,
        imageUrl: campaignUpdates.imageUrl,
        status: campaignUpdates.status,
        rejectionReason: campaignUpdates.rejectionReason,
        campaignTitle: campaigns.title,
        publishedAt: campaignUpdates.publishedAt,
        createdAt: campaignUpdates.createdAt
      })
      .from(campaignUpdates)
      .innerJoin(campaigns, eq(campaignUpdates.campaignId, campaigns.id))
      .where(campaignScope)
      .orderBy(desc(campaignUpdates.publishedAt)),
    db
      .select({
        id: campaignActivities.id,
        campaignId: campaignActivities.campaignId,
        sourceUpdateId: campaignActivities.sourceUpdateId,
        sourceEvidenceId: campaignActivities.sourceEvidenceId,
        activityCode: campaignActivities.activityCode,
        title: campaignActivities.title,
        body: campaignActivities.body,
        activityType: campaignActivities.activityType,
        mediaUrl: campaignActivities.mediaUrl,
        evidenceType: campaignActivities.evidenceType,
        visibilityStatus: campaignActivities.visibilityStatus,
        verificationStatus: campaignActivities.verificationStatus,
        publishedAt: campaignActivities.publishedAt,
        verifiedAt: campaignActivities.verifiedAt,
        createdAt: campaignActivities.createdAt,
        campaignTitle: campaigns.title,
        campaignSlug: campaigns.slug,
        evidenceCode: projectEvidence.evidenceCode,
        evidenceFileUrl: projectEvidence.fileUrl
      })
      .from(campaignActivities)
      .innerJoin(campaigns, eq(campaignActivities.campaignId, campaigns.id))
      .leftJoin(projectEvidence, eq(campaignActivities.sourceEvidenceId, projectEvidence.id))
      .where(campaignScope)
      .orderBy(desc(campaignActivities.createdAt)),
    db
      .select({
        id: impactSites.id,
        campaignId: impactSites.campaignId,
        name: impactSites.name,
        type: impactSites.ecosystemType,
        region: impactSites.region,
        latitude: impactSites.latitude,
        longitude: impactSites.longitude,
        metadata: impactSites.metadata,
        campaignTitle: campaigns.title,
        campaignSlug: campaigns.slug
      })
      .from(impactSites)
      .innerJoin(campaigns, eq(impactSites.campaignId, campaigns.id))
      .where(campaignScope)
      .orderBy(asc(impactSites.name)),
    db
      .select({
        campaignId: sponsoredEcosystems.campaignId,
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
      .innerJoin(campaigns, eq(sponsoredEcosystems.campaignId, campaigns.id))
      .leftJoin(impactSites, eq(sponsoredEcosystems.impactSiteId, impactSites.id))
      .where(campaignScope)
      .orderBy(desc(sponsoredEcosystems.lastUpdatedAt)),
    db
      .select({
        id: expeditions.id,
        title: expeditions.title,
        slug: expeditions.slug,
        region: expeditions.region,
        durationDays: expeditions.durationDays,
        basePrice: expeditions.basePrice,
        summary: expeditions.summary,
        imageUrl: expeditions.imageUrl,
        metadata: expeditions.metadata,
        relatedCampaignId: expeditions.relatedCampaignId,
        relatedCampaignTitle: campaigns.title,
        organizationId: campaigns.organizationId,
        partner: organizations.name,
        departureId: expeditionDepartures.id,
        startsAt: expeditionDepartures.startsAt,
        endsAt: expeditionDepartures.endsAt,
        capacity: expeditionDepartures.capacity,
        seatsBooked: expeditionDepartures.seatsBooked,
        status: expeditionDepartures.status,
        departureMetadata: expeditionDepartures.metadata
      })
      .from(expeditions)
      .leftJoin(campaigns, eq(expeditions.relatedCampaignId, campaigns.id))
      .leftJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .leftJoin(expeditionDepartures, eq(expeditionDepartures.expeditionId, expeditions.id))
      .where(expeditionScope)
      .orderBy(asc(expeditions.title)),
    db
      .select({
        expeditionId: expeditionBookings.expeditionId,
        departureId: expeditionBookings.departureId,
        total: sql<number>`count(${expeditionBookings.id})`
      })
      .from(expeditionBookings)
      .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
      .leftJoin(campaigns, eq(expeditions.relatedCampaignId, campaigns.id))
      .where(expeditionScope)
      .groupBy(expeditionBookings.expeditionId, expeditionBookings.departureId),
    db
      .select({
        campaignId: donations.campaignId,
        donorName: donations.donorName,
        amount: donations.amount,
        message: donations.message,
        createdAt: donations.createdAt
      })
      .from(donations)
      .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .where(and(eq(donations.status, "paid"), campaignScope))
      .orderBy(desc(donations.createdAt)),
    db
      .select({
        id: campaignMediaItems.id,
        campaignId: campaignMediaItems.campaignId,
        title: campaignMediaItems.title,
        mediaType: campaignMediaItems.mediaType,
        fileUrl: campaignMediaItems.fileUrl,
        thumbnailUrl: campaignMediaItems.thumbnailUrl,
        altText: campaignMediaItems.altText,
        caption: campaignMediaItems.caption,
        provenance: campaignMediaItems.provenance,
        sortOrder: campaignMediaItems.sortOrder,
        isFeatured: campaignMediaItems.isFeatured
      })
      .from(campaignMediaItems)
      .innerJoin(campaigns, eq(campaignMediaItems.campaignId, campaigns.id))
      .where(campaignScope)
      .orderBy(asc(campaignMediaItems.sortOrder), asc(campaignMediaItems.title)),
    db
      .select({
        id: campaignBudgetLineItems.id,
        campaignId: campaignBudgetLineItems.campaignId,
        category: campaignBudgetLineItems.category,
        description: campaignBudgetLineItems.description,
        amount: campaignBudgetLineItems.amount,
        spentAmount: campaignBudgetLineItems.spentAmount,
        sortOrder: campaignBudgetLineItems.sortOrder
      })
      .from(campaignBudgetLineItems)
      .innerJoin(campaigns, eq(campaignBudgetLineItems.campaignId, campaigns.id))
      .where(campaignScope)
      .orderBy(asc(campaignBudgetLineItems.sortOrder), asc(campaignBudgetLineItems.category)),
    db
      .select({
        id: campaignTimelinePhases.id,
        campaignId: campaignTimelinePhases.campaignId,
        title: campaignTimelinePhases.title,
        description: campaignTimelinePhases.description,
        status: campaignTimelinePhases.status,
        startsAt: campaignTimelinePhases.startsAt,
        endsAt: campaignTimelinePhases.endsAt,
        deliverable: campaignTimelinePhases.deliverable,
        evidenceNote: campaignTimelinePhases.evidenceNote,
        sortOrder: campaignTimelinePhases.sortOrder
      })
      .from(campaignTimelinePhases)
      .innerJoin(campaigns, eq(campaignTimelinePhases.campaignId, campaigns.id))
      .where(campaignScope)
      .orderBy(asc(campaignTimelinePhases.sortOrder), asc(campaignTimelinePhases.startsAt)),
    db
      .select({
        id: organizationTeamMembers.id,
        organizationId: organizationTeamMembers.organizationId,
        name: organizationTeamMembers.name,
        role: organizationTeamMembers.role,
        bio: organizationTeamMembers.bio,
        imageUrl: organizationTeamMembers.imageUrl,
        profileUrl: organizationTeamMembers.profileUrl,
        sortOrder: organizationTeamMembers.sortOrder,
        isPublic: organizationTeamMembers.isPublic
      })
      .from(organizationTeamMembers)
      .where(teamOrganizationScope)
      .orderBy(asc(organizationTeamMembers.sortOrder), asc(organizationTeamMembers.name))
  ]);

  const expeditionBookingCounts = new Map<string, number>();
  const departureBookingCounts = new Map<string, number>();

  for (const row of expeditionBookingCountRows) {
    const total = Number(row.total);

    expeditionBookingCounts.set(row.expeditionId, (expeditionBookingCounts.get(row.expeditionId) ?? 0) + total);
    departureBookingCounts.set(row.departureId, total);
  }

  const expeditionsById = new Map<
    string,
    {
      id: string;
      title: string;
      slug: string;
      region: string;
      durationDays: number;
      basePrice: number;
      summary: string;
      imageUrl: string | null;
      metadata: unknown;
      metadataJson: string;
      detailMetadata: ReturnType<typeof normalizeExpeditionDetailMetadata> | null;
      relatedCampaignId: string | null;
      relatedCampaignTitle: string | null;
      organizationId: string | null;
      partner: string | null;
      bookingCount: number;
      departures: {
        id: string;
        startsAt: Date;
        endsAt: Date;
        capacity: number;
        seatsBooked: number;
        availableSeats: number;
        status: string;
        bookingCount: number;
        meetingPoint: string | null;
        guide: string | null;
        minParticipants: number;
        weatherAdvisory: string | null;
      }[];
    }
  >();

  for (const row of expeditionRows) {
    let expedition = expeditionsById.get(row.id);

    if (!expedition) {
      expedition = {
        id: row.id,
        title: row.title,
        slug: row.slug,
        region: row.region,
        durationDays: row.durationDays,
        basePrice: toNumber(row.basePrice),
        summary: row.summary,
        imageUrl: row.imageUrl,
        metadata: row.metadata,
        metadataJson: "",
        detailMetadata: null,
        relatedCampaignId: row.relatedCampaignId,
        relatedCampaignTitle: row.relatedCampaignTitle,
        organizationId: row.organizationId,
        partner: row.partner,
        bookingCount: expeditionBookingCounts.get(row.id) ?? 0,
        departures: []
      };
      expeditionsById.set(row.id, expedition);
    }

    if (row.departureId && row.startsAt && row.endsAt && row.capacity !== null && row.seatsBooked !== null && row.status) {
      expedition.departures.push({
        id: row.departureId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        capacity: row.capacity,
        seatsBooked: row.seatsBooked,
        availableSeats: Math.max(0, row.capacity - row.seatsBooked),
        status: row.status,
        bookingCount: departureBookingCounts.get(row.departureId) ?? 0,
        meetingPoint: getMetadataString(row.departureMetadata, "meetingPoint"),
        guide: getMetadataString(row.departureMetadata, "guide"),
        minParticipants: getMetadataNumber(row.departureMetadata, "minParticipants", 6),
        weatherAdvisory: getMetadataString(row.departureMetadata, "weatherAdvisory")
      });
    }
  }

  for (const expedition of expeditionsById.values()) {
    const maxCapacity = expedition.departures.reduce((capacity, departure) => Math.max(capacity, departure.capacity), 0);
    const metadata = normalizeExpeditionDetailMetadata(
      expedition.metadata,
      buildDefaultExpeditionDetailMetadata({
        title: expedition.title,
        region: expedition.region,
        durationLabel: toExpeditionCard(expedition).duration,
        price: expedition.basePrice,
        maxCapacity,
        galleryImages: [
          {
            src: expedition.imageUrl ?? "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1400&q=80",
            label: "Destination",
            caption: `${expedition.region} expedition landscape`,
            provenance: "Partner-managed public detail image"
          }
        ],
        tripUpdates: [
          {
            title: "Seasonal weather advisory",
            date: "2026-06-01T00:00:00.000Z",
            body: "Boat schedules may shift when sea conditions require safer departure windows."
          }
        ]
      })
    );

    expedition.metadataJson = expeditionMetadataEditorJson(metadata);
    expedition.detailMetadata = metadata;
  }

  const evidenceReviewEventsById = await getEvidenceReviewEventsByEvidenceIds(evidenceRows.map((item) => item.id));
  const mediaCounts = new Map<string, number>();
  const budgetCounts = new Map<string, number>();
  const timelineCounts = new Map<string, number>();
  const teamCounts = new Map<string, number>();

  for (const row of campaignMediaRows) {
    mediaCounts.set(row.campaignId, (mediaCounts.get(row.campaignId) ?? 0) + 1);
  }

  for (const row of campaignBudgetRows) {
    budgetCounts.set(row.campaignId, (budgetCounts.get(row.campaignId) ?? 0) + 1);
  }

  for (const row of campaignTimelineRows) {
    timelineCounts.set(row.campaignId, (timelineCounts.get(row.campaignId) ?? 0) + 1);
  }

  for (const row of organizationTeamRows) {
    if (row.isPublic) {
      teamCounts.set(row.organizationId, (teamCounts.get(row.organizationId) ?? 0) + 1);
    }
  }

  return {
    capabilities,
    organizations: organizationRows.map((organization) => ({
      ...organization,
        verificationLabel: verificationLabel(organization.verification)
    })),
    campaigns: campaignRows.map((campaign) => ({
      ...campaign,
      verificationLabel: verificationLabel(campaign.verification),
      contentCompleteness: campaignContentCompleteness({
        media: mediaCounts.get(campaign.id) ?? 0,
        budget: budgetCounts.get(campaign.id) ?? 0,
        timeline: timelineCounts.get(campaign.id) ?? 0,
        team: teamCounts.get(campaign.organizationId) ?? 0
      })
    })),
    campaignMediaItems: campaignMediaRows,
    campaignBudgetLineItems: campaignBudgetRows.map((item) => ({
      ...item,
      amount: toNumber(item.amount),
      spentAmount: toNumber(item.spentAmount)
    })),
    campaignTimelinePhases: campaignTimelineRows,
    organizationTeamMembers: organizationTeamRows,
    expeditions: Array.from(expeditionsById.values()),
    evidence: evidenceRows.map((item) => {
      const reviewEvents = (evidenceReviewEventsById.get(item.id) ?? []).filter((event) => event.visibility !== "internal");

      return {
        ...item,
        reviewStage: evidenceReviewStage(item.verificationStatus),
        statusLabel: evidenceStatusLabel(item.verificationStatus),
        latestReviewNote: latestEvidenceReviewNote(reviewEvents, item.clarificationNote ?? item.rejectionReason),
        reviewEvents
      };
    }),
    updates: updateRows,
    activities: activityRows,
    impactSites: siteRows.map((site) => ({
      ...site,
      latitude: toNumber(site.latitude),
      longitude: toNumber(site.longitude),
      progress: getMetadataNumber(site.metadata, "progress"),
      evidenceCount: getMetadataNumber(site.metadata, "evidenceCount"),
      latestSurvey: getMetadataString(site.metadata, "latestSurvey"),
      verification: getMetadataString(site.metadata, "verification") ?? "basic"
    })),
    sponsoredEcosystems: sponsoredRows.map((ecosystem) => ({
      ...ecosystem,
      fragments: getMetadataNumber(ecosystem.metadata, "fragments"),
      survivalRate: getMetadataNumber(ecosystem.metadata, "survivalRate")
    })),
    donorActivity: donorRows.map((donation) => ({
      ...donation,
      amount: toNumber(donation.amount)
    }))
  };
}

export async function getAdminAcademyData() {
  const [courseRows, lessonRows, assessmentRows, questionRows, choiceRows, enrollmentRows, certificateRows, attemptRows] = await Promise.all([
    db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        level: courses.level,
        durationMinutes: courses.durationMinutes,
        summary: courses.summary,
        description: courses.description,
        status: courses.status,
        imageUrl: courses.imageUrl,
        publishedAt: courses.publishedAt,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt
      })
      .from(courses)
      .orderBy(desc(courses.updatedAt)),
    db
      .select({
        id: courseLessons.id,
        courseId: courseLessons.courseId,
        title: courseLessons.title,
        slug: courseLessons.slug,
        position: courseLessons.position,
        durationMinutes: courseLessons.durationMinutes,
        body: courseLessons.body,
        isPreview: courseLessons.isPreview
      })
      .from(courseLessons)
      .orderBy(asc(courseLessons.position)),
    db
      .select({
        id: courseAssessments.id,
        courseId: courseAssessments.courseId,
        title: courseAssessments.title,
        slug: courseAssessments.slug,
        passingScore: courseAssessments.passingScore
      })
      .from(courseAssessments),
    db
      .select({
        id: assessmentQuestions.id,
        assessmentId: assessmentQuestions.assessmentId,
        questionText: assessmentQuestions.questionText,
        position: assessmentQuestions.position,
        points: assessmentQuestions.points,
        status: assessmentQuestions.status
      })
      .from(assessmentQuestions)
      .orderBy(asc(assessmentQuestions.position)),
    db
      .select({
        id: assessmentChoices.id,
        questionId: assessmentChoices.questionId,
        choiceText: assessmentChoices.choiceText,
        isCorrect: assessmentChoices.isCorrect,
        position: assessmentChoices.position
      })
      .from(assessmentChoices)
      .orderBy(asc(assessmentChoices.position)),
    db
      .select({
        courseId: courseEnrollments.courseId,
        total: sql<string>`count(${courseEnrollments.id})`,
        completed: sql<string>`sum(case when ${courseEnrollments.status} = 'completed' then 1 else 0 end)`
      })
      .from(courseEnrollments)
      .groupBy(courseEnrollments.courseId),
    db
      .select({
        courseId: courseCertificates.courseId,
        total: sql<string>`count(${courseCertificates.id})`
      })
      .from(courseCertificates)
      .groupBy(courseCertificates.courseId),
    db
      .select({
        assessmentId: assessmentAttempts.assessmentId,
        courseId: courseAssessments.courseId,
        userId: assessmentAttempts.userId,
        learnerName: users.name,
        learnerEmail: users.email,
        score: assessmentAttempts.score,
        status: assessmentAttempts.status,
        submittedAt: assessmentAttempts.submittedAt,
        metadata: assessmentAttempts.metadata
      })
      .from(assessmentAttempts)
      .innerJoin(courseAssessments, eq(assessmentAttempts.assessmentId, courseAssessments.id))
      .innerJoin(users, eq(assessmentAttempts.userId, users.id))
      .orderBy(desc(assessmentAttempts.submittedAt))
  ]);

  const lessonsByCourse = lessonRows.reduce((groups, lesson) => {
    const items = groups.get(lesson.courseId) ?? [];
    items.push(lesson);
    groups.set(lesson.courseId, items);
    return groups;
  }, new Map<string, typeof lessonRows>());
  const assessmentsByCourse = assessmentRows.reduce((groups, assessment) => {
    const items = groups.get(assessment.courseId) ?? [];
    items.push(assessment);
    groups.set(assessment.courseId, items);
    return groups;
  }, new Map<string, typeof assessmentRows>());
  const questionsByAssessment = questionRows.reduce((groups, question) => {
    const items = groups.get(question.assessmentId) ?? [];
    items.push({
      ...question,
      choices: choiceRows.filter((choice) => choice.questionId === question.id)
    });
    groups.set(question.assessmentId, items);
    return groups;
  }, new Map<string, Array<(typeof questionRows)[number] & { choices: typeof choiceRows }>>());
  const enrollmentByCourse = new Map(enrollmentRows.map((row) => [row.courseId, row]));
  const certificateByCourse = new Map(certificateRows.map((row) => [row.courseId, row]));
  const attemptsByAssessment = attemptRows.reduce((groups, attempt) => {
    const items = groups.get(attempt.assessmentId) ?? [];
    items.push(attempt);
    groups.set(attempt.assessmentId, items);
    return groups;
  }, new Map<string, typeof attemptRows>());
  const attemptsByCourse = attemptRows.reduce((groups, attempt) => {
    const items = groups.get(attempt.courseId) ?? [];
    items.push(attempt);
    groups.set(attempt.courseId, items);
    return groups;
  }, new Map<string, typeof attemptRows>());
  const questionsByCourse = questionRows.reduce((groups, question) => {
    const assessment = assessmentRows.find((item) => item.id === question.assessmentId);

    if (!assessment) {
      return groups;
    }

    const items = groups.get(assessment.courseId) ?? [];
    items.push(question);
    groups.set(assessment.courseId, items);
    return groups;
  }, new Map<string, typeof questionRows>());

  return {
    courses: courseRows.map((course) => ({
      ...course,
      duration: academyDuration(course.durationMinutes),
      lessons: lessonsByCourse.get(course.id) ?? [],
      assessments: (assessmentsByCourse.get(course.id) ?? []).map((assessment) => ({
        ...assessment,
        questions: questionsByAssessment.get(assessment.id) ?? [],
        analytics: buildAssessmentAnalytics(
          attemptsByAssessment.get(assessment.id) ?? [],
          (questionsByAssessment.get(assessment.id) ?? []).map((question) => ({
            id: question.id,
            text: question.questionText,
            position: question.position
          }))
        )
      })),
      analytics: buildAssessmentAnalytics(
        attemptsByCourse.get(course.id) ?? [],
        (questionsByCourse.get(course.id) ?? []).map((question) => ({
          id: question.id,
          text: question.questionText,
          position: question.position
        }))
      ),
      enrollmentCount: toNumber(enrollmentByCourse.get(course.id)?.total),
      completedCount: toNumber(enrollmentByCourse.get(course.id)?.completed),
      certificateCount: toNumber(certificateByCourse.get(course.id)?.total)
    }))
  };
}

export async function getAdminAcademyCourse(courseId: string) {
  const data = await getAdminAcademyData();
  return data.courses.find((course) => course.id === courseId) ?? null;
}

export async function getCertificateVerification(publicSlug: string) {
  const [certificate] = await db
    .select({
      certificateNumber: courseCertificates.certificateNumber,
      publicSlug: courseCertificates.publicSlug,
      issuedAt: courseCertificates.issuedAt,
      metadata: courseCertificates.metadata,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      userName: users.name,
      displayName: profiles.displayName
    })
    .from(courseCertificates)
    .innerJoin(courses, eq(courseCertificates.courseId, courses.id))
    .innerJoin(users, eq(courseCertificates.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(courseCertificates.publicSlug, publicSlug))
    .limit(1);

  return certificate ?? null;
}

export async function getMonthlyImpactReportDownload(reportId: string, userId: string) {
  const [report] = await db
    .select({
      id: monthlyImpactReports.id,
      reportMonth: monthlyImpactReports.reportMonth,
      status: monthlyImpactReports.status,
      label: monthlyImpactReports.label,
      contributions: monthlyImpactReports.contributions,
      campaignUpdates: monthlyImpactReports.campaignUpdates,
      newEvidence: monthlyImpactReports.newEvidence,
      coralsMonitored: monthlyImpactReports.coralsMonitored,
      academyProgress: monthlyImpactReports.academyProgress,
      emailedAt: monthlyImpactReports.emailedAt,
      generatedAt: monthlyImpactReports.generatedAt,
      metadata: monthlyImpactReports.metadata,
      userName: users.name,
      userEmail: users.email,
      displayName: profiles.displayName
    })
    .from(monthlyImpactReports)
    .innerJoin(users, eq(monthlyImpactReports.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(monthlyImpactReports.id, reportId), eq(monthlyImpactReports.userId, userId)))
    .limit(1);

  return report
    ? {
        ...report,
        contributions: toNumber(report.contributions)
      }
    : null;
}
