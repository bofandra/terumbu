"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  accounts,
  adminAuditLogs,
  campaignActivities,
  campaignUpdates,
  campaigns,
  corporateProjectPortfolio,
  donations,
  expeditionBookings,
  expeditionDepartures,
  expeditions,
  impactPassports,
  impactSites,
  organizationUsers,
  organizations,
  paymentOperations,
  profiles,
  projectEvidence,
  roles,
  sponsoredEcosystems,
  userRoles,
  users
} from "@/db/schema";
import { createPasswordHash, requireRole } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { parseExpeditionMetadataJson, type ExpeditionDetailMetadata } from "@/lib/expedition-metadata";
import { transitionDonationPayment, transitionExpeditionBookingPayment } from "@/lib/payment-workflows";
import { getEvidenceStorageProvider, normalizeEvidenceUrl, readUploadedImageAsDataUrl } from "@/lib/storage";

function evidenceCode() {
  return `EVD-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function activityCode() {
  return `ACT-${randomBytes(5).toString("hex").toUpperCase()}`;
}

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"] as const;
const partnerCampaignStatuses = ["draft", "review"] as const;
const verificationStatuses = ["basic", "document", "field"] as const;
const organizationUserRoles = ["owner", "manager", "contributor", "viewer"] as const;
const organizationUserStatuses = ["active", "inactive"] as const;
const expeditionDepartureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"] as const;
const activityUses = ["public_update", "evidence", "update_and_evidence"] as const;
const evidenceTypes = ["field_photo", "document", "field_report"] as const;

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formEmail(formData: FormData, key: string) {
  return formText(formData, key).toLowerCase();
}

function nullableText(formData: FormData, key: string) {
  const value = formText(formData, key);

  return value || null;
}

function verificationFromForm(value: FormDataEntryValue | null) {
  const verification = String(value ?? "basic");

  return verificationStatuses.includes(verification as (typeof verificationStatuses)[number]) ? (verification as (typeof verificationStatuses)[number]) : "basic";
}

function organizationUserRoleFromForm(value: FormDataEntryValue | null) {
  const role = String(value ?? "manager");

  return organizationUserRoles.includes(role as (typeof organizationUserRoles)[number]) ? (role as (typeof organizationUserRoles)[number]) : "manager";
}

function organizationUserStatusFromForm(value: FormDataEntryValue | null) {
  const status = String(value ?? "active");

  return organizationUserStatuses.includes(status as (typeof organizationUserStatuses)[number]) ? (status as (typeof organizationUserStatuses)[number]) : "active";
}

const partnerRedirectPaths = new Set([
  "/partner",
  "/partner/activity",
  "/partner/campaigns",
  "/partner/campaigns/new",
  "/partner/expeditions",
  "/partner/updates",
  "/partner/updates/recent",
  "/partner/evidence",
  "/partner/evidence/submit"
]);

function partnerRedirectPath(formData: FormData, fallbackPath: string) {
  const requestedPath = formText(formData, "redirectTo");

  return partnerRedirectPaths.has(requestedPath) ? requestedPath : fallbackPath;
}

function redirectPartnerError(formData: FormData, fallbackPath: string, code: string): never {
  redirect(`${partnerRedirectPath(formData, fallbackPath)}?error=${encodeURIComponent(code)}`);
}

function redirectPartnerSaved(formData: FormData, fallbackPath: string, code: string): never {
  redirect(`${partnerRedirectPath(formData, fallbackPath)}?saved=${encodeURIComponent(code)}`);
}

function parseIdrAmount(value: FormDataEntryValue | null) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  const amount = Number(digits);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount.toFixed(2);
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  const amount = Number(digits);

  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function parseNonNegativeInteger(value: FormDataEntryValue | null) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  const amount = Number(digits);

  if (!Number.isInteger(amount) || amount < 0) {
    return null;
  }

  return amount;
}

function parsePositiveDecimal(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, "");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount.toFixed(2);
}

function campaignStatusFromForm(value: FormDataEntryValue | null) {
  const status = String(value ?? "draft");

  return campaignStatuses.includes(status as (typeof campaignStatuses)[number]) ? (status as (typeof campaignStatuses)[number]) : "draft";
}

function partnerCampaignStatusFromForm(value: FormDataEntryValue | null) {
  const status = String(value ?? "draft");

  return partnerCampaignStatuses.includes(status as (typeof partnerCampaignStatuses)[number]) ? (status as (typeof partnerCampaignStatuses)[number]) : "review";
}

function expeditionDepartureStatusFromForm(value: FormDataEntryValue | null) {
  const status = String(value ?? "open");

  return expeditionDepartureStatuses.includes(status as (typeof expeditionDepartureStatuses)[number])
    ? (status as (typeof expeditionDepartureStatuses)[number])
    : "open";
}

function activityUseFromForm(value: FormDataEntryValue | null) {
  const activityUse = String(value ?? "public_update");

  return activityUses.includes(activityUse as (typeof activityUses)[number]) ? (activityUse as (typeof activityUses)[number]) : "public_update";
}

function evidenceTypeFromForm(value: FormDataEntryValue | null) {
  const evidenceType = String(value ?? "field_photo");

  return evidenceTypes.includes(evidenceType as (typeof evidenceTypes)[number]) ? (evidenceType as (typeof evidenceTypes)[number]) : "field_photo";
}

function slugifyTitle(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || `campaign-${randomBytes(2).toString("hex")}`;
}

function slugifyPartner(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return slug || `partner-${randomBytes(2).toString("hex")}`;
}

function slugifyExpedition(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);

  return slug || `expedition-${randomBytes(2).toString("hex")}`;
}

function parseDateTime(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const normalized = raw.includes("T") ? `${raw}:00.000Z` : `${raw}T00:00:00.000Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const date = new Date(`${raw}T16:59:59.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

async function imageFromForm(formData: FormData, uploadKey: string, urlKey: string, redirectPath: string) {
  const upload = await readUploadedImageAsDataUrl(formData.get(uploadKey));

  if (upload.error) {
    redirectPartnerError(formData, redirectPath, `image-${upload.error}`);
  }

  return upload.dataUrl ?? normalizeEvidenceUrl(formData.get(urlKey));
}

function adminReturnPath(formData: FormData | undefined, fallbackPath: string, outcome: "error" | "saved") {
  const outcomeReturnTo = formData ? formText(formData, `${outcome}ReturnTo`) : "";
  const returnTo = outcomeReturnTo || (formData ? formText(formData, "returnTo") : "");

  if (returnTo.startsWith("/admin/") && !returnTo.startsWith("//")) {
    return returnTo;
  }

  return fallbackPath;
}

function redirectAdminForm(path: string, key: "error" | "saved", code: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(code)}`);
}

function redirectAdminPartnerError(code: string, formData?: FormData): never {
  redirectAdminForm(adminReturnPath(formData, "/admin/partners", "error"), "error", code);
}

function redirectAdminPartnerSaved(code: string, formData?: FormData): never {
  redirectAdminForm(adminReturnPath(formData, "/admin/partners", "saved"), "saved", code);
}

function redirectAdminCampaignError(code: string, formData?: FormData): never {
  redirectAdminForm(adminReturnPath(formData, "/admin/campaigns", "error"), "error", code);
}

function redirectAdminCampaignSaved(code: string, formData?: FormData): never {
  redirectAdminForm(adminReturnPath(formData, "/admin/campaigns", "saved"), "saved", code);
}

function redirectAdminExpeditionError(code: string, formData?: FormData): never {
  redirectAdminForm(adminReturnPath(formData, "/admin/expeditions", "error"), "error", code);
}

function redirectAdminExpeditionSaved(code: string, formData?: FormData): never {
  redirectAdminForm(adminReturnPath(formData, "/admin/expeditions", "saved"), "saved", code);
}

function departureMetadata(formData: FormData) {
  const metadata: Record<string, string | number> = {};
  const meetingPoint = nullableText(formData, "meetingPoint");
  const guide = nullableText(formData, "guide");
  const weatherAdvisory = nullableText(formData, "weatherAdvisory");
  const minParticipants = parsePositiveInteger(formData.get("minParticipants"));

  if (meetingPoint) {
    metadata.meetingPoint = meetingPoint;
  }

  if (guide) {
    metadata.guide = guide;
  }

  if (weatherAdvisory) {
    metadata.weatherAdvisory = weatherAdvisory;
  }

  if (minParticipants) {
    metadata.minParticipants = minParticipants;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function expeditionMetadataFromForm(formData: FormData, onError: (code: string, formData?: FormData) => never) {
  const result = parseExpeditionMetadataJson(formText(formData, "metadataJson"));

  if (result.error) {
    onError(result.error, formData);
  }

  return result.metadata;
}

function formNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(formText(formData, key));

  return Number.isFinite(value) ? value : fallback;
}

function formOptionalNumber(formData: FormData, key: string) {
  const raw = formText(formData, key);
  const value = Number(raw);

  return raw && Number.isFinite(value) ? value : undefined;
}

function formLines(formData: FormData, key: string) {
  return formText(formData, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formParagraphs(formData: FormData, key: string) {
  return formText(formData, key)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value ?? "").trim());
}

function maxLength(...items: string[][]) {
  return Math.max(0, ...items.map((item) => item.length));
}

function formPairs(formData: FormData, labelKey: string, valueKey: string) {
  const labels = formArray(formData, labelKey);
  const values = formArray(formData, valueKey);

  return Array.from({ length: maxLength(labels, values) }, (_, index) => ({
    label: labels[index] ?? "",
    value: values[index] ?? ""
  })).filter((item) => item.label || item.value);
}

function formPercentPairs(formData: FormData, labelKey: string, percentKey: string) {
  const labels = formArray(formData, labelKey);
  const percentages = formArray(formData, percentKey);

  return Array.from({ length: maxLength(labels, percentages) }, (_, index) => ({
    label: labels[index] ?? "",
    percent: Math.max(0, Math.min(100, Number(percentages[index] ?? 0)))
  })).filter((item) => item.label || item.percent > 0);
}

function partnerExpeditionMetadataFromForm(formData: FormData): ExpeditionDetailMetadata {
  const gallerySrc = formArray(formData, "gallerySrc");
  const galleryLabel = formArray(formData, "galleryLabel");
  const galleryCaption = formArray(formData, "galleryCaption");
  const galleryProvenance = formArray(formData, "galleryProvenance");
  const pillarTitles = formArray(formData, "pillarTitle");
  const pillarBodies = formArray(formData, "pillarBody");
  const highlightTitles = formArray(formData, "highlightTitle");
  const highlightStatuses = formArray(formData, "highlightStatus");
  const impactTargetValues = formArray(formData, "impactTargetValue");
  const impactTargetLabels = formArray(formData, "impactTargetLabel");
  const dayLabels = formArray(formData, "itineraryDay");
  const dayTitles = formArray(formData, "itineraryDayTitle");
  const dayMeals = formArray(formData, "itineraryMeals");
  const dayLevels = formArray(formData, "itineraryPhysicalLevel");
  const dayActivities = formArray(formData, "itineraryActivities");
  const teamNames = formArray(formData, "teamName");
  const teamRoles = formArray(formData, "teamRole");
  const teamDetails = formArray(formData, "teamDetail");
  const reviewNames = formArray(formData, "reviewName");
  const reviewJoinedAs = formArray(formData, "reviewJoinedAs");
  const reviewRatings = formArray(formData, "reviewRating");
  const reviewDates = formArray(formData, "reviewDate");
  const reviewBodies = formArray(formData, "reviewBody");
  const tripUpdateTitles = formArray(formData, "tripUpdateTitle");
  const tripUpdateDates = formArray(formData, "tripUpdateDate");
  const tripUpdateBodies = formArray(formData, "tripUpdateBody");
  const cancellationLabels = formArray(formData, "cancellationLabel");
  const cancellationRefunds = formArray(formData, "cancellationRefund");
  const faqQuestions = formArray(formData, "faqQuestion");
  const faqAnswers = formArray(formData, "faqAnswer");
  const contribution = formOptionalNumber(formData, "conservationContribution");
  const platformFee = formOptionalNumber(formData, "platformFee");

  return {
    categoryLabel: formText(formData, "categoryLabel"),
    activitySummary: formText(formData, "activitySummary"),
    rating: formNumber(formData, "rating", 0),
    reviewCount: formNumber(formData, "reviewCount", 0),
    participantCount: formNumber(formData, "participantCount", 0),
    difficulty: formText(formData, "difficulty"),
    minimumAge: formNumber(formData, "minimumAge", 0),
    languages: formLines(formData, "languages"),
    skillRequirements: formLines(formData, "skillRequirements"),
    tags: formLines(formData, "tags"),
    quickFacts: formPairs(formData, "quickFactLabel", "quickFactValue"),
    galleryImages: Array.from({ length: maxLength(gallerySrc, galleryLabel, galleryCaption, galleryProvenance) }, (_, index) => ({
      src: gallerySrc[index] ?? "",
      label: galleryLabel[index] ?? "",
      caption: galleryCaption[index] ?? "",
      provenance: galleryProvenance[index] ?? ""
    })).filter((item) => item.src || item.label || item.caption || item.provenance),
    hostedBy: {
      title: formText(formData, "hostedByTitle"),
      verificationLabel: formText(formData, "hostedByVerificationLabel"),
      profileHref: formText(formData, "hostedByProfileHref"),
      profileLabel: formText(formData, "hostedByProfileLabel")
    },
    overview: {
      title: formText(formData, "overviewTitle"),
      paragraphs: formParagraphs(formData, "overviewParagraphs"),
      pillars: Array.from({ length: maxLength(pillarTitles, pillarBodies) }, (_, index) => ({
        title: pillarTitles[index] ?? "",
        body: pillarBodies[index] ?? ""
      })).filter((item) => item.title || item.body),
      passportNote: formText(formData, "passportNote")
    },
    highlights: Array.from({ length: maxLength(highlightTitles, highlightStatuses) }, (_, index) => ({
      title: highlightTitles[index] ?? "",
      status: highlightStatuses[index] ?? ""
    })).filter((item) => item.title || item.status),
    impact: {
      title: formText(formData, "impactTitle"),
      summary: formText(formData, "impactSummary"),
      contributionPercent: formNumber(formData, "contributionPercent", 0),
      ...(contribution === undefined ? {} : { conservationContribution: contribution }),
      methodologyUpdatedAt: formText(formData, "methodologyUpdatedAt"),
      methodologyNote: formText(formData, "methodologyNote"),
      targets: Array.from({ length: maxLength(impactTargetValues, impactTargetLabels) }, (_, index) => ({
        value: impactTargetValues[index] ?? "",
        label: impactTargetLabels[index] ?? ""
      })).filter((item) => item.value || item.label),
      allocation: formPercentPairs(formData, "allocationLabel", "allocationPercent")
    },
    priceBreakdown: {
      equipmentRental: formNumber(formData, "equipmentRental", 0),
      platformFeePercent: formNumber(formData, "platformFeePercent", 0),
      ...(platformFee === undefined ? {} : { platformFee })
    },
    itineraryTitle: formText(formData, "itineraryTitle"),
    itineraryDisclaimer: formText(formData, "itineraryDisclaimer"),
    itinerary: Array.from({ length: maxLength(dayLabels, dayTitles, dayMeals, dayLevels, dayActivities) }, (_, index) => ({
      day: dayLabels[index] ?? "",
      title: dayTitles[index] ?? "",
      meals: dayMeals[index] ?? "",
      physicalLevel: dayLevels[index] ?? "",
      activities: (dayActivities[index] ?? "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    })).filter((item) => item.day || item.title || item.meals || item.physicalLevel || item.activities.length > 0),
    included: formLines(formData, "included"),
    notIncluded: formLines(formData, "notIncluded"),
    requirements: formLines(formData, "requirements"),
    safety: formLines(formData, "safety"),
    emergencyPlanSummary: formText(formData, "emergencyPlanSummary"),
    sustainability: formLines(formData, "sustainability"),
    route: {
      title: formText(formData, "routeTitle"),
      mapTitle: formText(formData, "mapTitle"),
      mapEmbedUrl: formText(formData, "mapEmbedUrl"),
      privacyNote: formText(formData, "routePrivacyNote"),
      sidebarTitle: formText(formData, "routeSidebarTitle"),
      sidebarNote: formText(formData, "routeSidebarNote"),
      steps: formLines(formData, "routeSteps"),
      travelTimes: formLines(formData, "routeTravelTimes")
    },
    accommodation: {
      name: formText(formData, "accommodationName"),
      type: formText(formData, "accommodationType"),
      details: formLines(formData, "accommodationDetails"),
      mealNote: formText(formData, "mealNote")
    },
    team: Array.from({ length: maxLength(teamNames, teamRoles, teamDetails) }, (_, index) => ({
      name: teamNames[index] ?? "",
      role: teamRoles[index] ?? "",
      detail: teamDetails[index] ?? ""
    })).filter((item) => item.name || item.role || item.detail),
    preparationCourse: {
      title: formText(formData, "preparationCourseTitle"),
      summary: formText(formData, "preparationCourseSummary"),
      imageUrl: nullableText(formData, "preparationCourseImageUrl"),
      href: formText(formData, "preparationCourseHref"),
      ctaLabel: formText(formData, "preparationCourseCtaLabel")
    },
    reviewCategories: formPairs(formData, "reviewCategoryLabel", "reviewCategoryValue"),
    reviews: Array.from({ length: maxLength(reviewNames, reviewJoinedAs, reviewRatings, reviewDates, reviewBodies) }, (_, index) => ({
      name: reviewNames[index] ?? "",
      joinedAs: reviewJoinedAs[index] ?? "",
      rating: Number(reviewRatings[index] ?? 0),
      date: reviewDates[index] ?? "",
      body: reviewBodies[index] ?? ""
    })).filter((item) => item.name || item.joinedAs || item.rating > 0 || item.date || item.body),
    tripUpdates: Array.from({ length: maxLength(tripUpdateTitles, tripUpdateDates, tripUpdateBodies) }, (_, index) => ({
      title: tripUpdateTitles[index] ?? "",
      date: tripUpdateDates[index] ?? "",
      body: tripUpdateBodies[index] ?? ""
    })).filter((item) => item.title || item.date || item.body),
    cancellationPolicy: Array.from({ length: maxLength(cancellationLabels, cancellationRefunds) }, (_, index) => ({
      label: cancellationLabels[index] ?? "",
      refund: cancellationRefunds[index] ?? ""
    })).filter((item) => item.label || item.refund),
    faqs: Array.from({ length: maxLength(faqQuestions, faqAnswers) }, (_, index) => ({
      question: faqQuestions[index] ?? "",
      answer: faqAnswers[index] ?? ""
    })).filter((item) => item.question || item.answer),
    finalCta: {
      eyebrow: formText(formData, "finalCtaEyebrow"),
      title: formText(formData, "finalCtaTitle"),
      body: formText(formData, "finalCtaBody"),
      primaryLabel: formText(formData, "finalCtaPrimaryLabel"),
      secondaryLabel: formText(formData, "finalCtaSecondaryLabel")
    },
    weatherAdvisory: {
      title: formText(formData, "weatherAdvisoryTitle"),
      body: formText(formData, "weatherAdvisoryBody")
    },
    bookingTrustIndicators: formLines(formData, "bookingTrustIndicators")
  };
}

async function getRoleId(key: string, name: string) {
  const [role] = await db
    .insert(roles)
    .values({ key, name })
    .onConflictDoUpdate({
      target: roles.key,
      set: { name }
    })
    .returning({ id: roles.id });

  return role.id;
}

async function ensurePartnerRoleForUser(userId: string) {
  const roleId = await getRoleId("partner", "Partner");

  await db
    .insert(userRoles)
    .values({ userId, roleId })
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId]
    });
}

async function syncPartnerRoleForUser(userId: string) {
  const [activeMembership] = await db
    .select({ id: organizationUsers.id })
    .from(organizationUsers)
    .where(and(eq(organizationUsers.userId, userId), eq(organizationUsers.status, "active")))
    .limit(1);

  if (activeMembership) {
    await ensurePartnerRoleForUser(userId);
    return;
  }

  const [partnerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, "partner")).limit(1);

  if (partnerRole) {
    await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, partnerRole.id)));
  }
}

async function imageFromAdminCampaignForm(formData: FormData) {
  const upload = await readUploadedImageAsDataUrl(formData.get("imageFile"));

  if (upload.error) {
    redirectAdminCampaignError(`image-${upload.error}`, formData);
  }

  return upload.dataUrl ?? normalizeEvidenceUrl(formData.get("imageUrl"));
}

async function getCampaignDeleteBlockers(campaignId: string) {
  const [donation, sponsorship, portfolioProject, relatedExpedition] = await Promise.all([
    db.select({ id: donations.id }).from(donations).where(eq(donations.campaignId, campaignId)).limit(1),
    db.select({ id: sponsoredEcosystems.id }).from(sponsoredEcosystems).where(eq(sponsoredEcosystems.campaignId, campaignId)).limit(1),
    db.select({ id: corporateProjectPortfolio.id }).from(corporateProjectPortfolio).where(eq(corporateProjectPortfolio.campaignId, campaignId)).limit(1),
    db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.relatedCampaignId, campaignId)).limit(1)
  ]);

  return {
    hasDonations: donation.length > 0,
    hasSponsorships: sponsorship.length > 0,
    hasCorporatePortfolio: portfolioProject.length > 0,
    hasRelatedExpeditions: relatedExpedition.length > 0,
    blocked: donation.length > 0 || sponsorship.length > 0 || portfolioProject.length > 0 || relatedExpedition.length > 0
  };
}

async function getPortalUserRoles(userId: string) {
  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return roleRows.map((role) => role.key);
}

async function userCanAccessOrganization(userId: string, organizationId: string) {
  const roleKeys = await getPortalUserRoles(userId);

  if (roleKeys.includes("admin")) {
    return true;
  }

  const [membership] = await db
    .select({ id: organizationUsers.id })
    .from(organizationUsers)
    .where(and(eq(organizationUsers.userId, userId), eq(organizationUsers.organizationId, organizationId), eq(organizationUsers.status, "active")))
    .limit(1);

  return Boolean(membership);
}

async function requireOrganizationAccess(userId: string, organizationId: string, formData: FormData, fallbackPath: string) {
  if (!(await userCanAccessOrganization(userId, organizationId))) {
    redirectPartnerError(formData, fallbackPath, "organization-access");
  }
}

async function requireCampaignAccess(userId: string, campaignId: string, formData: FormData, fallbackPath: string) {
  const [campaign] = await db
    .select({
      id: campaigns.id,
      organizationId: campaigns.organizationId,
      title: campaigns.title,
      imageUrl: campaigns.imageUrl,
      publishedAt: campaigns.publishedAt
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    redirectPartnerError(formData, fallbackPath, "campaign-missing");
  }

  await requireOrganizationAccess(userId, campaign.organizationId, formData, fallbackPath);

  return campaign;
}

async function requireExpeditionAccess(userId: string, expeditionId: string, formData: FormData, fallbackPath: string) {
  const [expedition] = await db
    .select({
      id: expeditions.id,
      title: expeditions.title,
      relatedCampaignId: expeditions.relatedCampaignId,
      organizationId: campaigns.organizationId
    })
    .from(expeditions)
    .leftJoin(campaigns, eq(expeditions.relatedCampaignId, campaigns.id))
    .where(eq(expeditions.id, expeditionId))
    .limit(1);

  if (!expedition) {
    redirectPartnerError(formData, fallbackPath, "expedition-missing");
  }

  const roleKeys = await getPortalUserRoles(userId);

  if (roleKeys.includes("admin")) {
    return expedition;
  }

  if (!expedition.organizationId) {
    redirectPartnerError(formData, fallbackPath, "expedition-campaign-required");
  }

  await requireOrganizationAccess(userId, expedition.organizationId, formData, fallbackPath);

  return expedition;
}

export async function createOrganizationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const name = formText(formData, "name");
  const slug = slugifyPartner(formText(formData, "slug") || name);
  const type = formText(formData, "type");
  const verification = verificationFromForm(formData.get("verification"));

  if (!name || !slug || !type) {
    redirectAdminPartnerError("partner-invalid", formData);
  }

  const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);

  if (existing) {
    redirectAdminPartnerError("partner-slug", formData);
  }

  const [organization] = await db
    .insert(organizations)
    .values({
      name,
      slug,
      type,
      logoUrl: nullableText(formData, "logoUrl"),
      websiteUrl: nullableText(formData, "websiteUrl"),
      description: nullableText(formData, "description"),
      verification,
      updatedAt: new Date()
    })
    .returning({ id: organizations.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "organization.created",
    entityType: "organization",
    entityId: organization.id,
    metadata: { slug, verification }
  });

  redirectAdminPartnerSaved("partner-created", formData);
}

export async function updateOrganizationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const organizationId = formText(formData, "organizationId");
  const name = formText(formData, "name");
  const slug = slugifyPartner(formText(formData, "slug") || name);
  const type = formText(formData, "type");
  const verification = verificationFromForm(formData.get("verification"));

  if (!organizationId || !name || !slug || !type) {
    redirectAdminPartnerError("partner-invalid", formData);
  }

  const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);

  if (existing && existing.id !== organizationId) {
    redirectAdminPartnerError("partner-slug", formData);
  }

  await db
    .update(organizations)
    .set({
      name,
      slug,
      type,
      logoUrl: nullableText(formData, "logoUrl"),
      websiteUrl: nullableText(formData, "websiteUrl"),
      description: nullableText(formData, "description"),
      verification,
      updatedAt: new Date()
    })
    .where(eq(organizations.id, organizationId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "organization.updated",
    entityType: "organization",
    entityId: organizationId,
    metadata: { slug, verification }
  });

  redirectAdminPartnerSaved("partner-updated", formData);
}

export async function deleteOrganizationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const organizationId = formText(formData, "organizationId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!organizationId || !confirmed) {
    redirectAdminPartnerError("partner-delete", formData);
  }

  const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.organizationId, organizationId)).limit(1);

  if (campaign) {
    redirectAdminPartnerError("partner-has-campaigns", formData);
  }

  const memberRows = await db.select({ userId: organizationUsers.userId }).from(organizationUsers).where(eq(organizationUsers.organizationId, organizationId));

  await db.transaction(async (tx) => {
    await tx.delete(organizationUsers).where(eq(organizationUsers.organizationId, organizationId));
    await tx.delete(organizations).where(eq(organizations.id, organizationId));
  });

  for (const member of memberRows) {
    await syncPartnerRoleForUser(member.userId);
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "organization.deleted",
    entityType: "organization",
    entityId: organizationId,
    metadata: { membersDetached: memberRows.length }
  });

  redirectAdminPartnerSaved("partner-deleted", formData);
}

export async function addOrganizationUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/partners");
  const organizationId = formText(formData, "organizationId");
  const email = formEmail(formData, "email");
  const role = organizationUserRoleFromForm(formData.get("role"));
  const status = organizationUserStatusFromForm(formData.get("status"));

  if (!organizationId || !email) {
    redirectAdminPartnerError("partner-user-invalid", formData);
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    redirectAdminPartnerError("partner-user-missing", formData);
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminPartnerError("partner-missing", formData);
  }

  await db
    .insert(organizationUsers)
    .values({
      organizationId,
      userId: user.id,
      role,
      status,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [organizationUsers.organizationId, organizationUsers.userId],
      set: {
        role,
        status,
        updatedAt: new Date()
      }
    });

  await syncPartnerRoleForUser(user.id);

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "organization_user.assigned",
    entityType: "organization",
    entityId: organizationId,
    metadata: { userId: user.id, email, role, status }
  });

  redirectAdminPartnerSaved("partner-user-assigned", formData);
}

export async function createOrganizationUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/partners");
  const organizationId = formText(formData, "organizationId");
  const name = formText(formData, "name");
  const email = formEmail(formData, "email");
  const password = String(formData.get("password") ?? "");
  const role = organizationUserRoleFromForm(formData.get("role"));
  const status = organizationUserStatusFromForm(formData.get("status"));

  if (!organizationId || !name || !email || password.length < 8) {
    redirectAdminPartnerError("partner-user-invalid", formData);
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminPartnerError("partner-missing", formData);
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existingUser) {
    redirectAdminPartnerError("partner-user-exists", formData);
  }

  const now = new Date();
  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash: createPasswordHash(password),
      emailVerifiedAt: now,
      updatedAt: now
    })
    .returning({ id: users.id });

  await db.insert(accounts).values({
    userId: createdUser.id,
    provider: "credentials",
    providerAccountId: email
  });

  await db.insert(profiles).values({
    userId: createdUser.id,
    displayName: name,
    location: "Indonesia",
    bio: "Partner team member.",
    heroLevel: 1,
    xp: 0,
    isPublic: false,
    updatedAt: now
  });

  await db.insert(impactPassports).values({
    userId: createdUser.id,
    publicSlug: `${slugifyPartner(name)}-${randomBytes(3).toString("hex")}`,
    visibility: "private",
    story: "A partner team account for managing campaign updates and evidence.",
    updatedAt: now
  });

  await db.insert(organizationUsers).values({
    organizationId,
    userId: createdUser.id,
    role,
    status,
    updatedAt: now
  });

  await syncPartnerRoleForUser(createdUser.id);

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "organization_user.created",
    entityType: "organization",
    entityId: organizationId,
    metadata: { userId: createdUser.id, email, role, status }
  });

  redirectAdminPartnerSaved("partner-user-created", formData);
}

export async function updateOrganizationUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/partners");
  const organizationUserId = formText(formData, "organizationUserId");
  const role = organizationUserRoleFromForm(formData.get("role"));
  const status = organizationUserStatusFromForm(formData.get("status"));

  if (!organizationUserId) {
    redirectAdminPartnerError("partner-user-invalid", formData);
  }

  const [membership] = await db
    .update(organizationUsers)
    .set({ role, status, updatedAt: new Date() })
    .where(eq(organizationUsers.id, organizationUserId))
    .returning({
      organizationId: organizationUsers.organizationId,
      userId: organizationUsers.userId
    });

  if (!membership) {
    redirectAdminPartnerError("partner-user-missing", formData);
  }

  await syncPartnerRoleForUser(membership.userId);

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "organization_user.updated",
    entityType: "organization",
    entityId: membership.organizationId,
    metadata: { userId: membership.userId, role, status }
  });

  redirectAdminPartnerSaved("partner-user-updated", formData);
}

export async function removeOrganizationUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/partners");
  const organizationUserId = formText(formData, "organizationUserId");

  if (!organizationUserId) {
    redirectAdminPartnerError("partner-user-invalid", formData);
  }

  const [membership] = await db
    .delete(organizationUsers)
    .where(eq(organizationUsers.id, organizationUserId))
    .returning({
      organizationId: organizationUsers.organizationId,
      userId: organizationUsers.userId
    });

  if (!membership) {
    redirectAdminPartnerError("partner-user-missing", formData);
  }

  await syncPartnerRoleForUser(membership.userId);

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "organization_user.removed",
    entityType: "organization",
    entityId: membership.organizationId,
    metadata: { userId: membership.userId }
  });

  redirectAdminPartnerSaved("partner-user-removed", formData);
}

export async function createPartnerCampaignAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const roleKeys = await getPortalUserRoles(user.id);
  const isAdmin = roleKeys.includes("admin");
  const organizationId = formText(formData, "organizationId");
  const title = formText(formData, "title");
  const summary = formText(formData, "summary");
  const story = formText(formData, "story");
  const category = formText(formData, "category");
  const region = formText(formData, "region");
  const goalAmount = parseIdrAmount(formData.get("goalAmount"));
  const impactUnit = formText(formData, "impactUnit");
  const impactTarget = parsePositiveInteger(formData.get("impactTarget"));
  const status = isAdmin ? campaignStatusFromForm(formData.get("status")) : partnerCampaignStatusFromForm(formData.get("status"));
  const imageUrl = await imageFromForm(formData, "imageFile", "imageUrl", "/partner/campaigns/new");
  const endsAt = parseOptionalDate(formData.get("endsAt"));

  if (!organizationId || !title || !summary || !category || !region || !goalAmount || !impactUnit || !impactTarget) {
    redirectPartnerError(formData, "/partner/campaigns/new", "campaign");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectPartnerError(formData, "/partner/campaigns/new", "organization");
  }

  await requireOrganizationAccess(user.id, organizationId, formData, "/partner/campaigns/new");

  const now = new Date();
  const slug = `${slugifyTitle(title)}-${randomBytes(3).toString("hex")}`;
  const [campaign] = await db
    .insert(campaigns)
    .values({
      organizationId,
      title,
      slug,
      summary,
      story: story || null,
      category,
      region,
      imageUrl,
      goalAmount,
      impactUnit,
      impactTarget,
      status,
      publishedAt: status === "published" ? now : null,
      endsAt,
      updatedAt: now
    })
    .returning({ id: campaigns.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.created",
    entityType: "campaign",
    entityId: campaign.id,
    metadata: { source: "partner_portal", status }
  });

  redirectPartnerSaved(formData, "/partner/campaigns/new", "campaign-created");
}

export async function updatePartnerCampaignAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const roleKeys = await getPortalUserRoles(user.id);
  const isAdmin = roleKeys.includes("admin");
  const campaignId = formText(formData, "campaignId");
  const organizationId = formText(formData, "organizationId");
  const title = formText(formData, "title");
  const summary = formText(formData, "summary");
  const story = formText(formData, "story");
  const category = formText(formData, "category");
  const region = formText(formData, "region");
  const goalAmount = parseIdrAmount(formData.get("goalAmount"));
  const impactUnit = formText(formData, "impactUnit");
  const impactTarget = parsePositiveInteger(formData.get("impactTarget"));
  const requestedStatus = campaignStatusFromForm(formData.get("status"));
  const uploadedImageUrl = await imageFromForm(formData, "imageFile", "imageUrl", "/partner/campaigns");
  const endsAt = parseOptionalDate(formData.get("endsAt"));
  const removeImage = formData.get("removeImage") === "on";

  if (!campaignId || !organizationId || !title || !summary || !category || !region || !goalAmount || !impactUnit || !impactTarget) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-update");
  }

  const [campaign] = await db
    .select({
      id: campaigns.id,
      organizationId: campaigns.organizationId,
      imageUrl: campaigns.imageUrl,
      status: campaigns.status,
      publishedAt: campaigns.publishedAt
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-missing");
  }

  await requireOrganizationAccess(user.id, campaign.organizationId, formData, "/partner/campaigns");

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectPartnerError(formData, "/partner/campaigns", "organization");
  }

  await requireOrganizationAccess(user.id, organizationId, formData, "/partner/campaigns");

  const now = new Date();
  const status = isAdmin
    ? requestedStatus
    : partnerCampaignStatuses.includes(requestedStatus as (typeof partnerCampaignStatuses)[number])
      ? (requestedStatus as (typeof partnerCampaignStatuses)[number])
      : campaign.status;

  await db
    .update(campaigns)
    .set({
      organizationId,
      title,
      summary,
      story: story || null,
      category,
      region,
      imageUrl: removeImage ? null : uploadedImageUrl ?? campaign.imageUrl,
      goalAmount,
      impactUnit,
      impactTarget,
      status,
      publishedAt: status === "published" ? campaign.publishedAt ?? now : status === campaign.status ? campaign.publishedAt : null,
      endsAt,
      updatedAt: now
    })
    .where(eq(campaigns.id, campaignId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.updated",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { source: "partner_portal", status }
  });

  redirectPartnerSaved(formData, "/partner/campaigns", "campaign-updated");
}

export async function deletePartnerCampaignAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const campaignId = formText(formData, "campaignId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!campaignId || !confirmed) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-delete");
  }

  const [campaign] = await db.select({ id: campaigns.id, organizationId: campaigns.organizationId, title: campaigns.title }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);

  if (!campaign) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-missing");
  }

  await requireOrganizationAccess(user.id, campaign.organizationId, formData, "/partner/campaigns");

  const blockers = await getCampaignDeleteBlockers(campaignId);

  if (blockers.blocked) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-has-history");
  }

  await db.delete(campaigns).where(eq(campaigns.id, campaignId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.deleted",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { source: "partner_portal", title: campaign.title }
  });

  redirectPartnerSaved(formData, "/partner/campaigns", "campaign-deleted");
}

export async function createExpeditionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const title = formText(formData, "title");
  const slug = slugifyExpedition(formText(formData, "slug") || title);
  const region = formText(formData, "region");
  const durationDays = parsePositiveInteger(formData.get("durationDays"));
  const basePrice = parsePositiveDecimal(formData.get("basePrice"));
  const summary = formText(formData, "summary");
  const relatedCampaignId = nullableText(formData, "relatedCampaignId");
  const metadata = expeditionMetadataFromForm(formData, redirectAdminExpeditionError);

  if (!title || !slug || !region || !durationDays || !basePrice || !summary) {
    redirectAdminExpeditionError("expedition-invalid", formData);
  }

  const [existing] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existing) {
    redirectAdminExpeditionError("expedition-slug", formData);
  }

  if (relatedCampaignId) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, relatedCampaignId)).limit(1);

    if (!campaign) {
      redirectAdminExpeditionError("campaign-missing", formData);
    }
  }

  const [expedition] = await db
    .insert(expeditions)
    .values({
      title,
      slug,
      region,
      durationDays,
      basePrice,
      summary,
      imageUrl: nullableText(formData, "imageUrl"),
      relatedCampaignId,
      metadata
    })
    .returning({ id: expeditions.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition.created",
    entityType: "expedition",
    entityId: expedition.id,
    metadata: { slug, relatedCampaignId }
  });

  redirectAdminExpeditionSaved("expedition-created", formData);
}

export async function updateExpeditionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const expeditionId = formText(formData, "expeditionId");
  const title = formText(formData, "title");
  const slug = slugifyExpedition(formText(formData, "slug") || title);
  const region = formText(formData, "region");
  const durationDays = parsePositiveInteger(formData.get("durationDays"));
  const basePrice = parsePositiveDecimal(formData.get("basePrice"));
  const summary = formText(formData, "summary");
  const relatedCampaignId = nullableText(formData, "relatedCampaignId");
  const metadata = expeditionMetadataFromForm(formData, redirectAdminExpeditionError);

  if (!expeditionId || !title || !slug || !region || !durationDays || !basePrice || !summary) {
    redirectAdminExpeditionError("expedition-invalid", formData);
  }

  const [existingSlug] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existingSlug && existingSlug.id !== expeditionId) {
    redirectAdminExpeditionError("expedition-slug", formData);
  }

  if (relatedCampaignId) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, relatedCampaignId)).limit(1);

    if (!campaign) {
      redirectAdminExpeditionError("campaign-missing", formData);
    }
  }

  const [expedition] = await db
    .update(expeditions)
    .set({
      title,
      slug,
      region,
      durationDays,
      basePrice,
      summary,
      imageUrl: nullableText(formData, "imageUrl"),
      relatedCampaignId,
      metadata
    })
    .where(eq(expeditions.id, expeditionId))
    .returning({ id: expeditions.id });

  if (!expedition) {
    redirectAdminExpeditionError("expedition-missing", formData);
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition.updated",
    entityType: "expedition",
    entityId: expeditionId,
    metadata: { slug, relatedCampaignId }
  });

  redirectAdminExpeditionSaved("expedition-updated", formData);
}

export async function deleteExpeditionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const expeditionId = formText(formData, "expeditionId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!expeditionId || !confirmed) {
    redirectAdminExpeditionError("expedition-delete", formData);
  }

  const [booking] = await db.select({ id: expeditionBookings.id }).from(expeditionBookings).where(eq(expeditionBookings.expeditionId, expeditionId)).limit(1);

  if (booking) {
    redirectAdminExpeditionError("expedition-has-bookings", formData);
  }

  const [expedition] = await db.delete(expeditions).where(eq(expeditions.id, expeditionId)).returning({ id: expeditions.id, slug: expeditions.slug });

  if (!expedition) {
    redirectAdminExpeditionError("expedition-missing", formData);
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition.deleted",
    entityType: "expedition",
    entityId: expedition.id,
    metadata: { slug: expedition.slug }
  });

  redirectAdminExpeditionSaved("expedition-deleted", formData);
}

export async function createExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const expeditionId = formText(formData, "expeditionId");
  const startsAt = parseDateTime(formData.get("startsAt"));
  const endsAt = parseDateTime(formData.get("endsAt"));
  const capacity = parsePositiveInteger(formData.get("capacity"));
  const seatsBooked = parseNonNegativeInteger(formData.get("seatsBooked")) ?? 0;
  const status = expeditionDepartureStatusFromForm(formData.get("status"));

  if (!expeditionId || !startsAt || !endsAt || !capacity || endsAt <= startsAt || seatsBooked > capacity) {
    redirectAdminExpeditionError("departure-invalid", formData);
  }

  const [expedition] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.id, expeditionId)).limit(1);

  if (!expedition) {
    redirectAdminExpeditionError("expedition-missing", formData);
  }

  const [existing] = await db
    .select({ id: expeditionDepartures.id })
    .from(expeditionDepartures)
    .where(and(eq(expeditionDepartures.expeditionId, expeditionId), eq(expeditionDepartures.startsAt, startsAt)))
    .limit(1);

  if (existing) {
    redirectAdminExpeditionError("departure-duplicate", formData);
  }

  const [departure] = await db
    .insert(expeditionDepartures)
    .values({
      expeditionId,
      startsAt,
      endsAt,
      capacity,
      seatsBooked,
      status,
      metadata: departureMetadata(formData)
    })
    .returning({ id: expeditionDepartures.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition_departure.created",
    entityType: "expedition_departure",
    entityId: departure.id,
    metadata: { expeditionId, status, capacity }
  });

  redirectAdminExpeditionSaved("departure-created", formData);
}

export async function updateExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const departureId = formText(formData, "departureId");
  const startsAt = parseDateTime(formData.get("startsAt"));
  const endsAt = parseDateTime(formData.get("endsAt"));
  const capacity = parsePositiveInteger(formData.get("capacity"));
  const status = expeditionDepartureStatusFromForm(formData.get("status"));

  if (!departureId || !startsAt || !endsAt || !capacity || endsAt <= startsAt) {
    redirectAdminExpeditionError("departure-invalid", formData);
  }

  const [existingDeparture] = await db
    .select({
      id: expeditionDepartures.id,
      expeditionId: expeditionDepartures.expeditionId,
      seatsBooked: expeditionDepartures.seatsBooked
    })
    .from(expeditionDepartures)
    .where(eq(expeditionDepartures.id, departureId))
    .limit(1);

  if (!existingDeparture) {
    redirectAdminExpeditionError("departure-missing", formData);
  }

  if (capacity < existingDeparture.seatsBooked) {
    redirectAdminExpeditionError("departure-capacity", formData);
  }

  const [duplicate] = await db
    .select({ id: expeditionDepartures.id })
    .from(expeditionDepartures)
    .where(and(eq(expeditionDepartures.expeditionId, existingDeparture.expeditionId), eq(expeditionDepartures.startsAt, startsAt)))
    .limit(1);

  if (duplicate && duplicate.id !== departureId) {
    redirectAdminExpeditionError("departure-duplicate", formData);
  }

  await db
    .update(expeditionDepartures)
    .set({
      startsAt,
      endsAt,
      capacity,
      status,
      metadata: departureMetadata(formData)
    })
    .where(eq(expeditionDepartures.id, departureId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition_departure.updated",
    entityType: "expedition_departure",
    entityId: departureId,
    metadata: { expeditionId: existingDeparture.expeditionId, status, capacity }
  });

  redirectAdminExpeditionSaved("departure-updated", formData);
}

export async function deleteExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const departureId = formText(formData, "departureId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!departureId || !confirmed) {
    redirectAdminExpeditionError("departure-delete", formData);
  }

  const [booking] = await db.select({ id: expeditionBookings.id }).from(expeditionBookings).where(eq(expeditionBookings.departureId, departureId)).limit(1);

  if (booking) {
    redirectAdminExpeditionError("departure-has-bookings", formData);
  }

  const [departure] = await db
    .delete(expeditionDepartures)
    .where(eq(expeditionDepartures.id, departureId))
    .returning({
      id: expeditionDepartures.id,
      expeditionId: expeditionDepartures.expeditionId
    });

  if (!departure) {
    redirectAdminExpeditionError("departure-missing", formData);
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition_departure.deleted",
    entityType: "expedition_departure",
    entityId: departure.id,
    metadata: { expeditionId: departure.expeditionId }
  });

  redirectAdminExpeditionSaved("departure-deleted", formData);
}

export async function updatePartnerExpeditionAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner/expeditions");
  const expeditionId = formText(formData, "expeditionId");
  const title = formText(formData, "title");
  const slug = slugifyExpedition(formText(formData, "slug") || title);
  const region = formText(formData, "region");
  const durationDays = parsePositiveInteger(formData.get("durationDays"));
  const basePrice = parsePositiveDecimal(formData.get("basePrice"));
  const summary = formText(formData, "summary");
  const relatedCampaignId = nullableText(formData, "relatedCampaignId");
  const metadata = partnerExpeditionMetadataFromForm(formData);

  if (!expeditionId || !title || !slug || !region || !durationDays || !basePrice || !summary || !relatedCampaignId) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-invalid");
  }

  await requireExpeditionAccess(user.id, expeditionId, formData, "/partner/expeditions");
  await requireCampaignAccess(user.id, relatedCampaignId, formData, "/partner/expeditions");

  const [existingSlug] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existingSlug && existingSlug.id !== expeditionId) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-slug");
  }

  const [expedition] = await db
    .update(expeditions)
    .set({
      title,
      slug,
      region,
      durationDays,
      basePrice,
      summary,
      imageUrl: nullableText(formData, "imageUrl"),
      relatedCampaignId,
      metadata
    })
    .where(eq(expeditions.id, expeditionId))
    .returning({ id: expeditions.id });

  if (!expedition) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-missing");
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "partner_expedition.updated",
    entityType: "expedition",
    entityId: expeditionId,
    metadata: { source: "partner_portal", slug, relatedCampaignId }
  });

  redirectPartnerSaved(formData, "/partner/expeditions", "expedition-updated");
}

export async function createPartnerExpeditionAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner/expeditions");
  const title = formText(formData, "title");
  const slug = slugifyExpedition(formText(formData, "slug") || title);
  const region = formText(formData, "region");
  const durationDays = parsePositiveInteger(formData.get("durationDays"));
  const basePrice = parsePositiveDecimal(formData.get("basePrice"));
  const summary = formText(formData, "summary");
  const relatedCampaignId = nullableText(formData, "relatedCampaignId");

  if (!title || !slug || !region || !durationDays || !basePrice || !summary || !relatedCampaignId) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-invalid");
  }

  await requireCampaignAccess(user.id, relatedCampaignId, formData, "/partner/expeditions");

  const [existing] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existing) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-slug");
  }

  const [expedition] = await db
    .insert(expeditions)
    .values({
      title,
      slug,
      region,
      durationDays,
      basePrice,
      summary,
      imageUrl: nullableText(formData, "imageUrl"),
      relatedCampaignId,
      metadata: null
    })
    .returning({ id: expeditions.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "partner_expedition.created",
    entityType: "expedition",
    entityId: expedition.id,
    metadata: { source: "partner_portal", slug, relatedCampaignId }
  });

  redirectPartnerSaved(formData, "/partner/expeditions", "expedition-created");
}

export async function createPartnerExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner/expeditions");
  const expeditionId = formText(formData, "expeditionId");
  const startsAt = parseDateTime(formData.get("startsAt"));
  const endsAt = parseDateTime(formData.get("endsAt"));
  const capacity = parsePositiveInteger(formData.get("capacity"));
  const seatsBooked = parseNonNegativeInteger(formData.get("seatsBooked")) ?? 0;
  const status = expeditionDepartureStatusFromForm(formData.get("status"));

  if (!expeditionId || !startsAt || !endsAt || !capacity || endsAt <= startsAt || seatsBooked > capacity) {
    redirectPartnerError(formData, "/partner/expeditions", "departure-invalid");
  }

  await requireExpeditionAccess(user.id, expeditionId, formData, "/partner/expeditions");

  const [existing] = await db
    .select({ id: expeditionDepartures.id })
    .from(expeditionDepartures)
    .where(and(eq(expeditionDepartures.expeditionId, expeditionId), eq(expeditionDepartures.startsAt, startsAt)))
    .limit(1);

  if (existing) {
    redirectPartnerError(formData, "/partner/expeditions", "departure-duplicate");
  }

  const [departure] = await db
    .insert(expeditionDepartures)
    .values({
      expeditionId,
      startsAt,
      endsAt,
      capacity,
      seatsBooked,
      status,
      metadata: departureMetadata(formData)
    })
    .returning({ id: expeditionDepartures.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "partner_expedition_departure.created",
    entityType: "expedition_departure",
    entityId: departure.id,
    metadata: { source: "partner_portal", expeditionId, status, capacity }
  });

  redirectPartnerSaved(formData, "/partner/expeditions", "departure-created");
}

export async function updatePartnerExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner/expeditions");
  const departureId = formText(formData, "departureId");
  const startsAt = parseDateTime(formData.get("startsAt"));
  const endsAt = parseDateTime(formData.get("endsAt"));
  const capacity = parsePositiveInteger(formData.get("capacity"));
  const status = expeditionDepartureStatusFromForm(formData.get("status"));

  if (!departureId || !startsAt || !endsAt || !capacity || endsAt <= startsAt) {
    redirectPartnerError(formData, "/partner/expeditions", "departure-invalid");
  }

  const [existingDeparture] = await db
    .select({
      id: expeditionDepartures.id,
      expeditionId: expeditionDepartures.expeditionId,
      seatsBooked: expeditionDepartures.seatsBooked
    })
    .from(expeditionDepartures)
    .where(eq(expeditionDepartures.id, departureId))
    .limit(1);

  if (!existingDeparture) {
    redirectPartnerError(formData, "/partner/expeditions", "departure-missing");
  }

  await requireExpeditionAccess(user.id, existingDeparture.expeditionId, formData, "/partner/expeditions");

  if (capacity < existingDeparture.seatsBooked) {
    redirectPartnerError(formData, "/partner/expeditions", "departure-capacity");
  }

  const [duplicate] = await db
    .select({ id: expeditionDepartures.id })
    .from(expeditionDepartures)
    .where(and(eq(expeditionDepartures.expeditionId, existingDeparture.expeditionId), eq(expeditionDepartures.startsAt, startsAt)))
    .limit(1);

  if (duplicate && duplicate.id !== departureId) {
    redirectPartnerError(formData, "/partner/expeditions", "departure-duplicate");
  }

  await db
    .update(expeditionDepartures)
    .set({
      startsAt,
      endsAt,
      capacity,
      status,
      metadata: departureMetadata(formData)
    })
    .where(eq(expeditionDepartures.id, departureId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "partner_expedition_departure.updated",
    entityType: "expedition_departure",
    entityId: departureId,
    metadata: { source: "partner_portal", expeditionId: existingDeparture.expeditionId, status, capacity }
  });

  redirectPartnerSaved(formData, "/partner/expeditions", "departure-updated");
}

export async function createAdminCampaignAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns");
  const organizationId = formText(formData, "organizationId");
  const title = formText(formData, "title");
  const slug = slugifyTitle(formText(formData, "slug") || title);
  const summary = formText(formData, "summary");
  const story = formText(formData, "story");
  const category = formText(formData, "category");
  const region = formText(formData, "region");
  const goalAmount = parseIdrAmount(formData.get("goalAmount"));
  const impactUnit = formText(formData, "impactUnit");
  const impactTarget = parsePositiveInteger(formData.get("impactTarget"));
  const status = campaignStatusFromForm(formData.get("status"));
  const imageUrl = await imageFromAdminCampaignForm(formData);
  const endsAt = parseOptionalDate(formData.get("endsAt"));

  if (!organizationId || !title || !slug || !summary || !category || !region || !goalAmount || !impactUnit || !impactTarget) {
    redirectAdminCampaignError("campaign-invalid", formData);
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminCampaignError("organization-missing", formData);
  }

  const [existingSlug] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, slug)).limit(1);

  if (existingSlug) {
    redirectAdminCampaignError("campaign-slug", formData);
  }

  const now = new Date();
  const [campaign] = await db
    .insert(campaigns)
    .values({
      organizationId,
      title,
      slug,
      summary,
      story: story || null,
      category,
      region,
      imageUrl,
      goalAmount,
      impactUnit,
      impactTarget,
      status,
      publishedAt: status === "published" ? now : null,
      endsAt,
      updatedAt: now
    })
    .returning({ id: campaigns.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.created",
    entityType: "campaign",
    entityId: campaign.id,
    metadata: { source: "admin", slug, status }
  });

  redirectAdminCampaignSaved("campaign-created", formData);
}

export async function updateAdminCampaignAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns");
  const campaignId = formText(formData, "campaignId");
  const organizationId = formText(formData, "organizationId");
  const title = formText(formData, "title");
  const slug = slugifyTitle(formText(formData, "slug") || title);
  const summary = formText(formData, "summary");
  const story = formText(formData, "story");
  const category = formText(formData, "category");
  const region = formText(formData, "region");
  const goalAmount = parseIdrAmount(formData.get("goalAmount"));
  const impactUnit = formText(formData, "impactUnit");
  const impactTarget = parsePositiveInteger(formData.get("impactTarget"));
  const status = campaignStatusFromForm(formData.get("status"));
  const uploadedImageUrl = await imageFromAdminCampaignForm(formData);
  const endsAt = parseOptionalDate(formData.get("endsAt"));
  const removeImage = formData.get("removeImage") === "on";

  if (!campaignId || !organizationId || !title || !slug || !summary || !category || !region || !goalAmount || !impactUnit || !impactTarget) {
    redirectAdminCampaignError("campaign-invalid", formData);
  }

  const [campaign] = await db
    .select({
      id: campaigns.id,
      slug: campaigns.slug,
      imageUrl: campaigns.imageUrl,
      publishedAt: campaigns.publishedAt
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    redirectAdminCampaignError("campaign-missing", formData);
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminCampaignError("organization-missing", formData);
  }

  const [existingSlug] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, slug)).limit(1);

  if (existingSlug && existingSlug.id !== campaignId) {
    redirectAdminCampaignError("campaign-slug", formData);
  }

  const now = new Date();

  await db
    .update(campaigns)
    .set({
      organizationId,
      title,
      slug,
      summary,
      story: story || null,
      category,
      region,
      imageUrl: removeImage ? null : uploadedImageUrl ?? campaign.imageUrl,
      goalAmount,
      impactUnit,
      impactTarget,
      status,
      publishedAt: status === "published" ? campaign.publishedAt ?? now : null,
      endsAt,
      updatedAt: now
    })
    .where(eq(campaigns.id, campaignId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.updated",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { source: "admin", previousSlug: campaign.slug, slug, status }
  });

  redirectAdminCampaignSaved("campaign-updated", formData);
}

export async function deleteAdminCampaignAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns");
  const campaignId = formText(formData, "campaignId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!campaignId || !confirmed) {
    redirectAdminCampaignError("campaign-delete", formData);
  }

  const [campaign] = await db.select({ id: campaigns.id, title: campaigns.title }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);

  if (!campaign) {
    redirectAdminCampaignError("campaign-missing", formData);
  }

  const blockers = await getCampaignDeleteBlockers(campaignId);

  if (blockers.blocked) {
    redirectAdminCampaignError("campaign-has-history", formData);
  }

  await db.delete(campaigns).where(eq(campaigns.id, campaignId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.deleted",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { source: "admin", title: campaign.title }
  });

  redirectAdminCampaignSaved("campaign-deleted", formData);
}

export async function updateCampaignStatusAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns");
  const campaignId = String(formData.get("campaignId") ?? "");
  const status = String(formData.get("status") ?? "");
  const now = new Date();

  if (!campaignId || !campaignStatuses.includes(status as (typeof campaignStatuses)[number])) {
    redirectAdminCampaignError("campaign", formData);
  }

  const [campaign] = await db
    .select({
      id: campaigns.id,
      publishedAt: campaigns.publishedAt
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    redirectAdminCampaignError("campaign", formData);
  }

  await db
    .update(campaigns)
    .set({
      status: status as (typeof campaignStatuses)[number],
      publishedAt: status === "published" ? campaign.publishedAt ?? now : null,
      updatedAt: now
    })
    .where(eq(campaigns.id, campaignId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.status.updated",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { status }
  });

  redirectAdminCampaignSaved("status", formData);
}

export async function updateOrganizationVerificationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const organizationId = String(formData.get("organizationId") ?? "");
  const verification = String(formData.get("verification") ?? "");

  if (!organizationId || !verificationStatuses.includes(verification as (typeof verificationStatuses)[number])) {
    redirect("/admin/partners?error=partner");
  }

  await db
    .update(organizations)
    .set({
      verification: verification as (typeof verificationStatuses)[number],
      updatedAt: new Date()
    })
    .where(eq(organizations.id, organizationId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "organization.verification.updated",
    entityType: "organization",
    entityId: organizationId,
    metadata: { verification }
  });

  redirect("/admin/partners?saved=verification");
}

export async function createCampaignActivityAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const campaignId = formText(formData, "campaignId");
  const impactSiteId = nullableText(formData, "impactSiteId");
  const title = formText(formData, "title");
  const body = formText(formData, "body");
  const activityUse = activityUseFromForm(formData.get("activityUse"));
  const evidenceType = evidenceTypeFromForm(formData.get("evidenceType"));
  const attachmentUrl = await imageFromForm(formData, "imageFile", "attachmentUrl", "/partner/activity");
  const shouldPublish = activityUse === "public_update" || activityUse === "update_and_evidence";
  const shouldSubmitEvidence = activityUse === "evidence" || activityUse === "update_and_evidence";

  if (!campaignId || !title || !body || (shouldSubmitEvidence && !attachmentUrl)) {
    redirectPartnerError(formData, "/partner/activity", "activity");
  }

  await requireCampaignAccess(user.id, campaignId, formData, "/partner/activity");

  if (impactSiteId) {
    const [site] = await db.select({ campaignId: impactSites.campaignId }).from(impactSites).where(eq(impactSites.id, impactSiteId)).limit(1);

    if (!site || site.campaignId !== campaignId) {
      redirectPartnerError(formData, "/partner/activity", "impact-site");
    }
  }

  const now = new Date();
  const storageProvider = attachmentUrl?.startsWith("data:image/") ? "database_inline" : attachmentUrl ? getEvidenceStorageProvider() : null;
  const generatedActivityCode = activityCode();

  await db.transaction(async (tx) => {
    let sourceUpdateId: string | null = null;
    let sourceEvidenceId: string | null = null;
    let generatedEvidenceCode: string | null = null;

    if (shouldPublish) {
      const [update] = await tx
        .insert(campaignUpdates)
        .values({
          campaignId,
          title,
          body,
          imageUrl: attachmentUrl,
          publishedAt: now
        })
        .returning({ id: campaignUpdates.id });

      sourceUpdateId = update.id;
    }

    if (shouldSubmitEvidence && attachmentUrl) {
      generatedEvidenceCode = evidenceCode();

      const [evidence] = await tx
        .insert(projectEvidence)
        .values({
          campaignId,
          impactSiteId,
          uploadedByUserId: user.id,
          evidenceCode: generatedEvidenceCode,
          title,
          evidenceType,
          fileUrl: attachmentUrl,
          storageProvider: storageProvider ?? getEvidenceStorageProvider(),
          verificationStatus: "submitted",
          metadata: {
            activityCode: generatedActivityCode,
            observation: body || null,
            submittedFrom: "partner_activity"
          }
        })
        .returning({ id: projectEvidence.id });

      sourceEvidenceId = evidence.id;
    }

    await tx.insert(campaignActivities).values({
      campaignId,
      sourceUpdateId,
      sourceEvidenceId,
      impactSiteId,
      createdByUserId: user.id,
      activityCode: generatedActivityCode,
      title,
      body: body || null,
      activityType: shouldPublish && shouldSubmitEvidence ? "field_report" : shouldSubmitEvidence ? evidenceType : "field_note",
      mediaUrl: attachmentUrl,
      evidenceType: shouldSubmitEvidence ? evidenceType : null,
      visibilityStatus: shouldPublish ? "published" : "evidence_only",
      verificationStatus: shouldSubmitEvidence ? "submitted" : null,
      storageProvider,
      publishedAt: shouldPublish ? now : null,
      metadata: {
        activityUse,
        evidenceCode: generatedEvidenceCode,
        submittedFrom: "partner_portal"
      }
    });
  });

  redirectPartnerSaved(formData, "/partner/activity", "activity");
}

export async function createCampaignUpdateAction(formData: FormData) {
  formData.set("activityUse", "public_update");
  formData.set("redirectTo", "/partner/activity");

  if (!formText(formData, "attachmentUrl")) {
    const imageUrl = formText(formData, "imageUrl");

    if (imageUrl) {
      formData.set("attachmentUrl", imageUrl);
    }
  }

  return createCampaignActivityAction(formData);
}

export async function submitEvidenceAction(formData: FormData) {
  formData.set("activityUse", "evidence");
  formData.set("redirectTo", "/partner/activity");

  if (!formText(formData, "attachmentUrl")) {
    const fileUrl = formText(formData, "fileUrl");

    if (fileUrl) {
      formData.set("attachmentUrl", fileUrl);
    }
  }

  if (!formText(formData, "body")) {
    formData.set("body", formText(formData, "title"));
  }

  return createCampaignActivityAction(formData);
}

export async function verifyEvidenceAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin");
  const evidenceId = String(formData.get("evidenceId") ?? "");
  const status = formData.get("status") === "rejected" ? "rejected" : "verified";

  if (!evidenceId) {
    redirect("/admin?error=evidence");
  }

  await db
    .update(projectEvidence)
    .set({
      verificationStatus: status,
      verifiedAt: status === "verified" ? new Date() : null
    })
    .where(eq(projectEvidence.id, evidenceId));

  await db
    .update(campaignActivities)
    .set({
      verificationStatus: status,
      verifiedAt: status === "verified" ? new Date() : null
    })
    .where(eq(campaignActivities.sourceEvidenceId, evidenceId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "evidence.verification.updated",
    entityType: "project_evidence",
    entityId: evidenceId,
    metadata: { status }
  });

  redirect("/admin?saved=evidence");
}

export async function reconcileDonationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin");
  const donationId = String(formData.get("donationId") ?? "");
  const requestedStatus = String(formData.get("status") ?? "paid");
  const status = requestedStatus === "failed" || requestedStatus === "refunded" ? requestedStatus : "paid";
  const operationId = String(formData.get("operationId") ?? "");
  const now = new Date();
  let receiptEmailNumber: string | null = null;

  const [donation] = await db
    .select({
      id: donations.id,
      campaignId: donations.campaignId,
      donorEmail: donations.donorEmail,
      amount: donations.amount,
      currency: donations.currency,
      status: donations.status,
      campaignTitle: campaigns.title
    })
    .from(donations)
    .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
    .where(eq(donations.id, donationId))
    .limit(1);

  if (!donation) {
    redirect("/admin?error=donation");
  }

  const result = await db.transaction(async (tx) => {
    const transition = await transitionDonationPayment(tx as unknown as typeof db, {
      donationId: donation.id,
      nextStatus: status,
      processedByUserId: user.id,
      operationType: "reconcile",
      now
    });

    if (operationId) {
      await tx
        .update(paymentOperations)
        .set({
          processedByUserId: user.id,
          status: "completed",
          processedAt: now,
          updatedAt: now,
          metadata: {
            reconciledStatus: status
          }
        })
        .where(eq(paymentOperations.id, operationId));
    }

    return transition;
  });

  if (!result) {
    redirect("/admin?error=donation");
  }

  if (result.receiptCreated) {
    receiptEmailNumber = result.receiptNumber;
  }

  if (receiptEmailNumber && donation.donorEmail) {
    await sendTransactionalEmail({
      recipientEmail: donation.donorEmail,
      subject: "Your Terumbu donation receipt",
      template: "donation_receipt",
      payload: {
        receiptNumber: receiptEmailNumber,
        donationId: donation.id,
        campaign: donation.campaignTitle,
        amount: Number(donation.amount),
        currency: donation.currency
      }
    });
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "donation.reconciled",
    entityType: "donation",
    entityId: donation.id,
    metadata: {
      previousStatus: donation.status,
      status,
      operationId: operationId || null
    }
  });

  redirect("/admin?saved=donation");
}

export async function reconcileExpeditionBookingAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin");
  const bookingId = String(formData.get("bookingId") ?? "");
  const requestedStatus = String(formData.get("status") ?? "paid");
  const status = requestedStatus === "failed" || requestedStatus === "refunded" ? requestedStatus : "paid";
  const operationId = String(formData.get("operationId") ?? "");
  const now = new Date();

  const [booking] = await db
    .select({
      id: expeditionBookings.id,
      paymentStatus: expeditionBookings.paymentStatus
    })
    .from(expeditionBookings)
    .where(eq(expeditionBookings.id, bookingId))
    .limit(1);

  if (!booking) {
    redirect("/admin?error=booking");
  }

  const result = await db.transaction(async (tx) => {
    const transition = await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
      bookingId: booking.id,
      nextStatus: status,
      processedByUserId: user.id,
      operationType: "reconcile",
      now
    });

    if (operationId) {
      await tx
        .update(paymentOperations)
        .set({
          processedByUserId: user.id,
          status: "completed",
          processedAt: now,
          updatedAt: now,
          metadata: {
            reconciledStatus: status
          }
        })
        .where(eq(paymentOperations.id, operationId));
    }

    return transition;
  });

  if (!result) {
    redirect("/admin?error=booking");
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition_booking.reconciled",
    entityType: "expedition_booking",
    entityId: booking.id,
    metadata: {
      previousStatus: booking.paymentStatus,
      status,
      operationId: operationId || null
    }
  });

  redirect("/admin?saved=booking");
}
