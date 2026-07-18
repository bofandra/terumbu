"use server";

import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  accounts,
  adminAuditLogs,
  campaignActivities,
  campaignBudgetLineItems,
  campaignMediaItems,
  campaignTimelinePhases,
  campaignUpdates,
  campaigns,
  corporateEvidenceCenter,
  corporateProjectPortfolio,
  donations,
  evidenceReviewEvents,
  expeditionBookings,
  expeditionDepartures,
  expeditions,
  impactPassports,
  impactSites,
  organizationTeamMembers,
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
import { normalizeCampaignMediaType, normalizeCampaignTimelinePhaseStatus } from "@/lib/campaign-content";
import { createPasswordHash, requireRole, safeRedirectPath } from "@/lib/auth";
import { corporateEvidenceVisibilityForStatus, shouldLinkEvidenceToCorporateProgram } from "@/lib/corporate-lifecycle";
import { sendTransactionalEmail } from "@/lib/email";
import {
  evidenceCanBeRevisedByPartner,
  evidenceReviewActionForTransition,
  evidenceReviewNoteRequired,
  normalizeEvidenceVerificationStatus
} from "@/lib/evidence-review-workflow";
import {
  buildDefaultExpeditionDetailMetadata,
  normalizeExpeditionDetailMetadata,
  parseExpeditionMetadataJson,
  type ExpeditionDetailMetadata
} from "@/lib/expedition-metadata";
import { canCancelExpeditionBooking } from "@/lib/expedition-booking-lifecycle";
import {
  normalizePartnerOrganizationRole,
  partnerRoleAllows,
  type PartnerOrganizationPermission
} from "@/lib/partner-permissions";
import { transitionDonationPayment, transitionExpeditionBookingPayment } from "@/lib/payment-workflows";
import { demoGatewaySettleRefund } from "@/lib/payment-provider";
import { processDueDonationSubscriptions } from "@/lib/subscription-billing";
import { getEvidenceStorageProvider, readUploadedImageAsDataUrl } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";

function evidenceCode() {
  return `EVD-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function activityCode() {
  return `ACT-${randomBytes(5).toString("hex").toUpperCase()}`;
}

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"] as const;
const partnerCampaignStatuses = ["draft", "review"] as const;
const adminCampaignImpactLinkModes = ["new", "existing", "none"] as const;
const verificationStatuses = ["basic", "document", "field"] as const;
const organizationUserStatuses = ["active", "inactive"] as const;
const expeditionDepartureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"] as const;
const activityUses = ["public_update", "evidence", "update_and_evidence"] as const;
const evidenceTypes = ["field_photo", "document", "field_report"] as const;
const partnerExpeditionCategoryLabels = ["Coral Restoration Expedition", "Reef Monitoring Expedition", "Marine Conservation Expedition", "Community Conservation Expedition"] as const;
const partnerExpeditionDifficulties = ["Light", "Moderate", "Challenging", "Advanced"] as const;
const partnerExpeditionSwimmingAbilities = ["No swimming required", "Basic swimming required", "Comfortable swimming required", "Snorkeling required", "Diving certification required"] as const;
const partnerExpeditionPhysicalLevels = ["Light", "Moderate", "Active", "Challenging"] as const;
const partnerExpeditionHighlightStatuses = ["Included", "Guaranteed", "Weather-dependent", "Optional", "Add-on", "Not included"] as const;
const partnerExpeditionAccommodationTypes = ["Shared twin room included", "Private room upgrade", "Homestay", "Eco-lodge", "Liveaboard", "Hotel partner stay"] as const;

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
  return normalizePartnerOrganizationRole(String(value ?? "manager"), "manager");
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
  "/partner/impact-sites",
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

function parseNonNegativeDecimal(value: FormDataEntryValue | null, fallback = "0.00") {
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, "");

  if (!normalized) {
    return fallback;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return amount.toFixed(2);
}

function parseCoordinate(value: FormDataEntryValue | null, min: number, max: number) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, ".");
  const coordinate = Number(normalized);

  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return null;
  }

  return coordinate.toFixed(6);
}

function parsePercent(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  const percent = raw ? parseNonNegativeInteger(value) : 0;

  if (percent === null || percent > 100) {
    return null;
  }

  return percent;
}

function parseOptionalCount(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  return raw ? parseNonNegativeInteger(value) : 0;
}

function impactSiteMetadataFromForm(formData: FormData) {
  const progress = parsePercent(formData.get("progress"));
  const evidenceCount = parseOptionalCount(formData.get("evidenceCount"));
  const latestSurvey = nullableText(formData, "latestSurvey");
  const verification = verificationFromForm(formData.get("verification"));

  if (progress === null || evidenceCount === null) {
    return null;
  }

  return {
    progress,
    evidenceCount,
    latestSurvey,
    verification
  };
}

function impactSiteFormValues(formData: FormData, campaignRequired: boolean, onError: (code: string) => never) {
  const campaignId = campaignRequired ? formText(formData, "campaignId") : nullableText(formData, "campaignId");
  const name = formText(formData, "name");
  const ecosystemType = formText(formData, "ecosystemType");
  const region = formText(formData, "region");
  const latitude = parseCoordinate(formData.get("latitude"), -90, 90);
  const longitude = parseCoordinate(formData.get("longitude"), -180, 180);
  const metadata = impactSiteMetadataFromForm(formData);

  if ((campaignRequired && !campaignId) || !name || !ecosystemType || !region || !latitude || !longitude || !metadata) {
    onError("impact-site-invalid");
  }

  return {
    campaignId,
    name,
    ecosystemType,
    region,
    latitude,
    longitude,
    metadata
  };
}

function adminCampaignImpactLinkModeFromForm(value: FormDataEntryValue | null) {
  const mode = String(value ?? "new");

  return adminCampaignImpactLinkModes.includes(mode as (typeof adminCampaignImpactLinkModes)[number])
    ? (mode as (typeof adminCampaignImpactLinkModes)[number])
    : "new";
}

function initialAdminCampaignImpactLinkFromForm(formData: FormData):
  | {
      mode: "new";
      values: {
        name: string;
        ecosystemType: string;
        region: string;
        latitude: string;
        longitude: string;
        metadata: {
          progress: number;
          evidenceCount: number;
          latestSurvey: string | null;
          verification: (typeof verificationStatuses)[number];
        };
      };
    }
  | {
      mode: "existing";
      impactSiteId: string;
    }
  | {
      mode: "none";
    } {
  const mode = adminCampaignImpactLinkModeFromForm(formData.get("impactLinkMode"));

  if (mode === "none") {
    return { mode };
  }

  if (mode === "existing") {
    const impactSiteId = formText(formData, "existingImpactSiteId");

    if (!impactSiteId) {
      redirectAdminCampaignError("impact-site-missing", formData);
    }

    return {
      mode,
      impactSiteId
    };
  }

  const name = formText(formData, "impactSiteName");
  const ecosystemType = formText(formData, "impactSiteEcosystemType");
  const region = formText(formData, "impactSiteRegion");
  const latitude = parseCoordinate(formData.get("impactSiteLatitude"), -90, 90);
  const longitude = parseCoordinate(formData.get("impactSiteLongitude"), -180, 180);
  const progress = parsePercent(formData.get("impactSiteProgress"));
  const evidenceCount = parseOptionalCount(formData.get("impactSiteEvidenceCount"));
  const latestSurvey = nullableText(formData, "impactSiteLatestSurvey");
  const verification = verificationFromForm(formData.get("impactSiteVerification"));

  if (!name || !ecosystemType || !region || !latitude || !longitude || progress === null || evidenceCount === null) {
    redirectAdminCampaignError("impact-site-invalid", formData);
  }

  return {
    mode,
    values: {
      name,
      ecosystemType,
      region,
      latitude,
      longitude,
      metadata: {
        progress,
        evidenceCount,
        latestSurvey,
        verification
      }
    }
  };
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

function optionFromForm<T extends readonly string[]>(formData: FormData, key: string, options: T, fallback: string) {
  const value = formText(formData, key);

  return options.includes(value as T[number]) || value === fallback ? value : fallback;
}

function optionValue<T extends readonly string[]>(value: string | undefined, options: T, fallback: string) {
  const normalized = String(value ?? "").trim();

  return options.includes(normalized as T[number]) || normalized === fallback ? normalized : fallback;
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

async function imageFromForm(formData: FormData, uploadKey: string, redirectPath: string) {
  const upload = await readUploadedImageAsDataUrl(formData.get(uploadKey));

  if (upload.error) {
    redirectPartnerError(formData, redirectPath, `image-${upload.error}`);
  }

  return upload.dataUrl;
}

async function uploadedPartnerImage(formData: FormData, key: string, redirectPath = "/partner/expeditions") {
  const upload = await readUploadedImageAsDataUrl(formData.get(key));

  if (upload.error) {
    redirectPartnerError(formData, redirectPath, `image-${upload.error}`);
  }

  return upload.dataUrl;
}

async function uploadedPartnerImages(formData: FormData, key: string, redirectPath = "/partner/expeditions") {
  const uploads: Array<string | null> = [];

  for (const value of formData.getAll(key)) {
    const upload = await readUploadedImageAsDataUrl(value);

    if (upload.error) {
      redirectPartnerError(formData, redirectPath, `image-${upload.error}`);
    }

    uploads.push(upload.dataUrl);
  }

  return uploads;
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

function campaignContentReturnPath(formData: FormData, fallbackPath: string) {
  const path = safeRedirectPath(formData.get("returnTo"), fallbackPath);

  if (path === "/partner/campaigns" || path.startsWith("/partner/campaigns/") || path.startsWith("/admin/campaigns")) {
    return path;
  }

  return fallbackPath;
}

function redirectCampaignContentError(formData: FormData, fallbackPath: string, code: string): never {
  redirect(`${campaignContentReturnPath(formData, fallbackPath)}?error=${encodeURIComponent(code)}`);
}

function redirectCampaignContentSaved(formData: FormData, fallbackPath: string, code: string): never {
  redirect(`${campaignContentReturnPath(formData, fallbackPath)}?saved=${encodeURIComponent(code)}`);
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

function objectMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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

function formTextOrFallback(formData: FormData, key: string, fallback: string) {
  return formData.has(key) ? formText(formData, key) : fallback;
}

function formLinesOrFallback(formData: FormData, key: string, fallback: string[]) {
  return formData.has(key) ? formLines(formData, key) : fallback;
}

function formParagraphsOrFallback(formData: FormData, key: string, fallback: string[]) {
  return formData.has(key) ? formParagraphs(formData, key) : fallback;
}

function formArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value ?? "").trim());
}

function maxLength(...items: unknown[][]) {
  return Math.max(0, ...items.map((item) => item.length));
}

function formPercentPairs(formData: FormData, labelKey: string, percentKey: string) {
  const labels = formArray(formData, labelKey);
  const percentages = formArray(formData, percentKey);

  return Array.from({ length: maxLength(labels, percentages) }, (_, index) => ({
    label: labels[index] ?? "",
    percent: Math.max(0, Math.min(100, Number(percentages[index] ?? 0)))
  })).filter((item) => item.label || item.percent > 0);
}

function expeditionDurationLabel(durationDays: number) {
  return `${durationDays} days / ${Math.max(0, durationDays - 1)} nights`;
}

function expeditionCapacityLabel(maxCapacity: number) {
  return maxCapacity > 0 ? `Max ${maxCapacity} people` : "Capacity pending";
}

function partnerExpeditionQuickFacts({
  durationDays,
  maxCapacity,
  basePrice,
  difficulty,
  minimumAge,
  swimmingAbility
}: {
  durationDays: number;
  maxCapacity: number;
  basePrice: number;
  difficulty: string;
  minimumAge: number;
  swimmingAbility: string;
}) {
  return [
    { label: "Duration", value: expeditionDurationLabel(durationDays) },
    { label: "Small group", value: expeditionCapacityLabel(maxCapacity) },
    { label: "Difficulty", value: difficulty },
    { label: "Min. age", value: minimumAge > 0 ? `${minimumAge}+ years old` : "All ages" },
    { label: "Swimming ability", value: swimmingAbility },
    { label: "Per person", value: formatCurrency(basePrice) }
  ];
}

function trustedExistingImage(value: string, allowedImages: Set<string>) {
  return value && allowedImages.has(value) ? value : "";
}

type PartnerExpeditionMetadataContext = {
  currentMetadata: ExpeditionDetailMetadata;
  durationDays: number;
  basePrice: number;
  maxCapacity: number;
};

async function partnerExpeditionMetadataFromForm(formData: FormData, context: PartnerExpeditionMetadataContext): Promise<ExpeditionDetailMetadata> {
  const galleryUploads = await uploadedPartnerImages(formData, "galleryImageFile");
  const galleryExistingSrc = formArray(formData, "galleryExistingSrc");
  const existingGalleryImages = new Set(context.currentMetadata.galleryImages.map((image) => image.src).filter(Boolean));
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
  const tripUpdateTitles = formArray(formData, "tripUpdateTitle");
  const tripUpdateDates = formArray(formData, "tripUpdateDate");
  const tripUpdateBodies = formArray(formData, "tripUpdateBody");
  const cancellationLabels = formArray(formData, "cancellationLabel");
  const cancellationRefunds = formArray(formData, "cancellationRefund");
  const faqQuestions = formArray(formData, "faqQuestion");
  const faqAnswers = formArray(formData, "faqAnswer");
  const contribution = formData.has("conservationContribution") ? formOptionalNumber(formData, "conservationContribution") : context.currentMetadata.impact.conservationContribution;
  const platformFee = formData.has("platformFee") ? formOptionalNumber(formData, "platformFee") : context.currentMetadata.priceBreakdown.platformFee;
  const preparationCourseImageUpload = await uploadedPartnerImage(formData, "preparationCourseImageFile");
  const existingPreparationImage = trustedExistingImage(
    formText(formData, "preparationCourseExistingImageUrl"),
    new Set([context.currentMetadata.preparationCourse.imageUrl ?? ""].filter(Boolean))
  );
  const currentDifficulty = optionValue(context.currentMetadata.difficulty, partnerExpeditionDifficulties, "Moderate");
  const currentSwimmingAbility = context.currentMetadata.quickFacts.find((fact) => fact.label === "Swimming ability")?.value ?? "Snorkeling required";
  const difficulty = optionFromForm(formData, "difficulty", partnerExpeditionDifficulties, currentDifficulty);
  const minimumAge = formNumber(formData, "minimumAge", context.currentMetadata.minimumAge);
  const swimmingAbility = optionFromForm(formData, "swimmingAbility", partnerExpeditionSwimmingAbilities, currentSwimmingAbility);
  const hasGalleryFields = formData.has("galleryLabel") || formData.has("galleryImageFile") || formData.has("galleryExistingSrc") || formData.has("galleryCaption") || formData.has("galleryProvenance");
  const hasPillarFields = formData.has("pillarTitle") || formData.has("pillarBody");
  const hasHighlightFields = formData.has("highlightTitle") || formData.has("highlightStatus");
  const hasImpactTargetFields = formData.has("impactTargetValue") || formData.has("impactTargetLabel");
  const hasItineraryFields = formData.has("itineraryDay") || formData.has("itineraryDayTitle") || formData.has("itineraryMeals") || formData.has("itineraryPhysicalLevel") || formData.has("itineraryActivities");
  const hasTeamFields = formData.has("teamName") || formData.has("teamRole") || formData.has("teamDetail");
  const hasTripUpdateFields = formData.has("tripUpdateTitle") || formData.has("tripUpdateDate") || formData.has("tripUpdateBody");
  const hasCancellationFields = formData.has("cancellationLabel") || formData.has("cancellationRefund");
  const hasFaqFields = formData.has("faqQuestion") || formData.has("faqAnswer");
  const hasHostedByFields = formData.has("hostedByTitle") || formData.has("hostedByVerificationLabel") || formData.has("hostedByProfileHref") || formData.has("hostedByProfileLabel");
  const hasPreparationFields =
    formData.has("preparationCourseTitle") ||
    formData.has("preparationCourseSummary") ||
    formData.has("preparationCourseHref") ||
    formData.has("preparationCourseCtaLabel") ||
    formData.has("preparationCourseExistingImageUrl") ||
    formData.has("preparationCourseImageFile");
  const hasFinalCtaFields = formData.has("finalCtaEyebrow") || formData.has("finalCtaTitle") || formData.has("finalCtaBody") || formData.has("finalCtaPrimaryLabel") || formData.has("finalCtaSecondaryLabel");

  return {
    categoryLabel: optionFromForm(formData, "categoryLabel", partnerExpeditionCategoryLabels, context.currentMetadata.categoryLabel || "Coral Restoration Expedition"),
    activitySummary: formTextOrFallback(formData, "activitySummary", context.currentMetadata.activitySummary),
    rating: context.currentMetadata.rating,
    reviewCount: context.currentMetadata.reviewCount,
    participantCount: context.currentMetadata.participantCount,
    difficulty,
    minimumAge,
    languages: formLinesOrFallback(formData, "languages", context.currentMetadata.languages),
    skillRequirements: formLinesOrFallback(formData, "skillRequirements", context.currentMetadata.skillRequirements),
    tags: formLinesOrFallback(formData, "tags", context.currentMetadata.tags),
    quickFacts: partnerExpeditionQuickFacts({
      durationDays: context.durationDays,
      maxCapacity: context.maxCapacity,
      basePrice: context.basePrice,
      difficulty,
      minimumAge,
      swimmingAbility
    }),
    galleryImages: hasGalleryFields
      ? Array.from({ length: maxLength(galleryUploads, galleryExistingSrc, galleryLabel, galleryCaption, galleryProvenance) }, (_, index) => ({
          src: galleryUploads[index] ?? trustedExistingImage(galleryExistingSrc[index] ?? "", existingGalleryImages),
          label: galleryLabel[index] ?? "",
          caption: galleryCaption[index] ?? "",
          provenance: galleryProvenance[index] ?? ""
        })).filter((item) => item.src)
      : context.currentMetadata.galleryImages,
    hostedBy: hasHostedByFields
      ? {
          title: formText(formData, "hostedByTitle"),
          verificationLabel: formText(formData, "hostedByVerificationLabel"),
          profileHref: formText(formData, "hostedByProfileHref"),
          profileLabel: formText(formData, "hostedByProfileLabel")
        }
      : context.currentMetadata.hostedBy,
    overview: {
      title: formTextOrFallback(formData, "overviewTitle", context.currentMetadata.overview.title),
      paragraphs: formParagraphsOrFallback(formData, "overviewParagraphs", context.currentMetadata.overview.paragraphs),
      pillars: hasPillarFields
        ? Array.from({ length: maxLength(pillarTitles, pillarBodies) }, (_, index) => ({
            title: pillarTitles[index] ?? "",
            body: pillarBodies[index] ?? ""
          })).filter((item) => item.title || item.body)
        : context.currentMetadata.overview.pillars,
      passportNote: formTextOrFallback(formData, "passportNote", context.currentMetadata.overview.passportNote)
    },
    highlights: hasHighlightFields
      ? Array.from({ length: maxLength(highlightTitles, highlightStatuses) }, (_, index) => ({
          title: highlightTitles[index] ?? "",
          status: optionValue(highlightStatuses[index], partnerExpeditionHighlightStatuses, context.currentMetadata.highlights[index]?.status ?? "Included")
        })).filter((item) => item.title || item.status)
      : context.currentMetadata.highlights,
    impact: {
      title: formTextOrFallback(formData, "impactTitle", context.currentMetadata.impact.title),
      summary: formTextOrFallback(formData, "impactSummary", context.currentMetadata.impact.summary),
      contributionPercent: formData.has("contributionPercent") ? formNumber(formData, "contributionPercent", context.currentMetadata.impact.contributionPercent) : context.currentMetadata.impact.contributionPercent,
      ...(contribution === undefined ? {} : { conservationContribution: contribution }),
      methodologyUpdatedAt: formTextOrFallback(formData, "methodologyUpdatedAt", context.currentMetadata.impact.methodologyUpdatedAt),
      methodologyNote: formTextOrFallback(formData, "methodologyNote", context.currentMetadata.impact.methodologyNote),
      targets: hasImpactTargetFields
        ? Array.from({ length: maxLength(impactTargetValues, impactTargetLabels) }, (_, index) => ({
            value: impactTargetValues[index] ?? "",
            label: impactTargetLabels[index] ?? ""
          })).filter((item) => item.value || item.label)
        : context.currentMetadata.impact.targets,
      allocation: formData.has("allocationLabel") || formData.has("allocationPercent") ? formPercentPairs(formData, "allocationLabel", "allocationPercent") : context.currentMetadata.impact.allocation
    },
    priceBreakdown: {
      equipmentRental: formData.has("equipmentRental") ? formNumber(formData, "equipmentRental", context.currentMetadata.priceBreakdown.equipmentRental) : context.currentMetadata.priceBreakdown.equipmentRental,
      platformFeePercent: formData.has("platformFeePercent")
        ? formNumber(formData, "platformFeePercent", context.currentMetadata.priceBreakdown.platformFeePercent)
        : context.currentMetadata.priceBreakdown.platformFeePercent,
      ...(platformFee === undefined ? {} : { platformFee })
    },
    itineraryTitle: formTextOrFallback(formData, "itineraryTitle", context.currentMetadata.itineraryTitle),
    itineraryDisclaimer: formTextOrFallback(formData, "itineraryDisclaimer", context.currentMetadata.itineraryDisclaimer),
    itinerary: hasItineraryFields
      ? Array.from({ length: maxLength(dayLabels, dayTitles, dayMeals, dayLevels, dayActivities) }, (_, index) => ({
          day: dayLabels[index] ?? "",
          title: dayTitles[index] ?? "",
          meals: dayMeals[index] ?? "",
          physicalLevel: optionValue(dayLevels[index], partnerExpeditionPhysicalLevels, context.currentMetadata.itinerary[index]?.physicalLevel ?? "Light"),
          activities: (dayActivities[index] ?? "")
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean)
        })).filter((item) => item.day || item.title || item.meals || item.physicalLevel || item.activities.length > 0)
      : context.currentMetadata.itinerary,
    included: formLinesOrFallback(formData, "included", context.currentMetadata.included),
    notIncluded: formLinesOrFallback(formData, "notIncluded", context.currentMetadata.notIncluded),
    requirements: formLinesOrFallback(formData, "requirements", context.currentMetadata.requirements),
    safety: formLinesOrFallback(formData, "safety", context.currentMetadata.safety),
    emergencyPlanSummary: formTextOrFallback(formData, "emergencyPlanSummary", context.currentMetadata.emergencyPlanSummary),
    sustainability: formLinesOrFallback(formData, "sustainability", context.currentMetadata.sustainability),
    route: {
      title: formTextOrFallback(formData, "routeTitle", context.currentMetadata.route.title),
      mapTitle: formTextOrFallback(formData, "mapTitle", context.currentMetadata.route.mapTitle),
      mapEmbedUrl: formTextOrFallback(formData, "mapEmbedUrl", context.currentMetadata.route.mapEmbedUrl),
      privacyNote: formTextOrFallback(formData, "routePrivacyNote", context.currentMetadata.route.privacyNote),
      sidebarTitle: formTextOrFallback(formData, "routeSidebarTitle", context.currentMetadata.route.sidebarTitle),
      sidebarNote: formTextOrFallback(formData, "routeSidebarNote", context.currentMetadata.route.sidebarNote),
      steps: formLinesOrFallback(formData, "routeSteps", context.currentMetadata.route.steps),
      travelTimes: formLinesOrFallback(formData, "routeTravelTimes", context.currentMetadata.route.travelTimes)
    },
    accommodation: {
      name: formTextOrFallback(formData, "accommodationName", context.currentMetadata.accommodation.name),
      type: optionFromForm(formData, "accommodationType", partnerExpeditionAccommodationTypes, context.currentMetadata.accommodation.type || "Shared twin room included"),
      details: formLinesOrFallback(formData, "accommodationDetails", context.currentMetadata.accommodation.details),
      mealNote: formTextOrFallback(formData, "mealNote", context.currentMetadata.accommodation.mealNote)
    },
    team: hasTeamFields
      ? Array.from({ length: maxLength(teamNames, teamRoles, teamDetails) }, (_, index) => ({
          name: teamNames[index] ?? "",
          role: teamRoles[index] ?? "",
          detail: teamDetails[index] ?? ""
        })).filter((item) => item.name || item.role || item.detail)
      : context.currentMetadata.team,
    preparationCourse: hasPreparationFields
      ? {
          title: formText(formData, "preparationCourseTitle"),
          summary: formText(formData, "preparationCourseSummary"),
          imageUrl: (preparationCourseImageUpload ?? existingPreparationImage) || null,
          href: formText(formData, "preparationCourseHref"),
          ctaLabel: formText(formData, "preparationCourseCtaLabel")
        }
      : context.currentMetadata.preparationCourse,
    reviewCategories: context.currentMetadata.reviewCategories,
    reviews: context.currentMetadata.reviews,
    tripUpdates: hasTripUpdateFields
      ? Array.from({ length: maxLength(tripUpdateTitles, tripUpdateDates, tripUpdateBodies) }, (_, index) => ({
          title: tripUpdateTitles[index] ?? "",
          date: tripUpdateDates[index] ?? "",
          body: tripUpdateBodies[index] ?? ""
        })).filter((item) => item.title || item.date || item.body)
      : context.currentMetadata.tripUpdates,
    cancellationPolicy: hasCancellationFields
      ? Array.from({ length: maxLength(cancellationLabels, cancellationRefunds) }, (_, index) => ({
          label: cancellationLabels[index] ?? "",
          refund: cancellationRefunds[index] ?? ""
        })).filter((item) => item.label || item.refund)
      : context.currentMetadata.cancellationPolicy,
    faqs: hasFaqFields
      ? Array.from({ length: maxLength(faqQuestions, faqAnswers) }, (_, index) => ({
          question: faqQuestions[index] ?? "",
          answer: faqAnswers[index] ?? ""
        })).filter((item) => item.question || item.answer)
      : context.currentMetadata.faqs,
    finalCta: hasFinalCtaFields
      ? {
          eyebrow: formText(formData, "finalCtaEyebrow"),
          title: formText(formData, "finalCtaTitle"),
          body: formText(formData, "finalCtaBody"),
          primaryLabel: formText(formData, "finalCtaPrimaryLabel"),
          secondaryLabel: formText(formData, "finalCtaSecondaryLabel")
        }
      : context.currentMetadata.finalCta,
    weatherAdvisory: {
      title: formTextOrFallback(formData, "weatherAdvisoryTitle", context.currentMetadata.weatherAdvisory.title),
      body: formTextOrFallback(formData, "weatherAdvisoryBody", context.currentMetadata.weatherAdvisory.body)
    },
    bookingTrustIndicators: formLinesOrFallback(formData, "bookingTrustIndicators", context.currentMetadata.bookingTrustIndicators)
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

  return upload.dataUrl;
}

async function campaignContentImageFromForm(formData: FormData, fallbackPath: string) {
  const upload = await readUploadedImageAsDataUrl(formData.get("fileUpload"));

  if (upload.error) {
    redirectCampaignContentError(formData, fallbackPath, `image-${upload.error}`);
  }

  return upload.dataUrl;
}

async function campaignContentPortraitFromForm(formData: FormData, fallbackPath: string) {
  const upload = await readUploadedImageAsDataUrl(formData.get("imageFile"));

  if (upload.error) {
    redirectCampaignContentError(formData, fallbackPath, `image-${upload.error}`);
  }

  return upload.dataUrl;
}

async function imageFromAdminExpeditionForm(formData: FormData) {
  const upload = await readUploadedImageAsDataUrl(formData.get("imageFile"));

  if (upload.error) {
    redirectAdminExpeditionError(`image-${upload.error}`, formData);
  }

  return upload.dataUrl;
}

async function logoFromAdminPartnerForm(formData: FormData) {
  const upload = await readUploadedImageAsDataUrl(formData.get("logoFile"));

  if (upload.error) {
    redirectAdminPartnerError(`image-${upload.error}`, formData);
  }

  return upload.dataUrl;
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

async function userCanUseOrganizationPermission(
  userId: string,
  organizationId: string,
  permission: PartnerOrganizationPermission
) {
  const roleKeys = await getPortalUserRoles(userId);

  if (roleKeys.includes("admin")) {
    return true;
  }

  const [membership] = await db
    .select({ role: organizationUsers.role })
    .from(organizationUsers)
    .where(and(eq(organizationUsers.userId, userId), eq(organizationUsers.organizationId, organizationId), eq(organizationUsers.status, "active")))
    .limit(1);

  return partnerRoleAllows(membership?.role, permission);
}

async function requireOrganizationAccess(userId: string, organizationId: string, formData: FormData, fallbackPath: string) {
  if (!(await userCanAccessOrganization(userId, organizationId))) {
    redirectPartnerError(formData, fallbackPath, "organization-access");
  }
}

async function requireOrganizationPermission(
  userId: string,
  organizationId: string,
  permission: PartnerOrganizationPermission,
  formData: FormData,
  fallbackPath: string
) {
  await requireOrganizationAccess(userId, organizationId, formData, fallbackPath);

  if (!(await userCanUseOrganizationPermission(userId, organizationId, permission))) {
    redirectPartnerError(formData, fallbackPath, "partner-permission");
  }
}

async function requireCampaignAccess(
  userId: string,
  campaignId: string,
  formData: FormData,
  fallbackPath: string,
  permission?: PartnerOrganizationPermission
) {
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

  if (permission) {
    await requireOrganizationPermission(userId, campaign.organizationId, permission, formData, fallbackPath);
  }

  return campaign;
}

async function requirePartnerImpactSiteAccess(
  userId: string,
  impactSiteId: string,
  formData: FormData,
  fallbackPath: string,
  permission?: PartnerOrganizationPermission
) {
  const [site] = await db
    .select({
      id: impactSites.id,
      campaignId: impactSites.campaignId,
      name: impactSites.name
    })
    .from(impactSites)
    .where(eq(impactSites.id, impactSiteId))
    .limit(1);

  if (!site?.campaignId) {
    redirectPartnerError(formData, fallbackPath, "impact-site-missing");
  }

  await requireCampaignAccess(userId, site.campaignId, formData, fallbackPath, permission);

  return site;
}

async function requireExpeditionAccess(
  userId: string,
  expeditionId: string,
  formData: FormData,
  fallbackPath: string,
  permission?: PartnerOrganizationPermission
) {
  const [expedition] = await db
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

  if (permission) {
    await requireOrganizationPermission(userId, expedition.organizationId, permission, formData, fallbackPath);
  }

  return expedition;
}

async function expeditionMaxCapacity(expeditionId: string) {
  const departures = await db
    .select({ capacity: expeditionDepartures.capacity })
    .from(expeditionDepartures)
    .where(eq(expeditionDepartures.expeditionId, expeditionId));

  return departures.reduce((max, departure) => Math.max(max, departure.capacity), 0);
}

function defaultPartnerExpeditionMetadata(
  expedition: Awaited<ReturnType<typeof requireExpeditionAccess>>,
  maxCapacity: number,
  imageUrl = expedition.imageUrl
) {
  return buildDefaultExpeditionDetailMetadata({
    title: expedition.title,
    region: expedition.region,
    durationLabel: expeditionDurationLabel(expedition.durationDays),
    price: Number(expedition.basePrice),
    maxCapacity,
    galleryImages: [
      {
        src: imageUrl ?? "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1400&q=80",
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
  });
}

export async function createOrganizationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const name = formText(formData, "name");
  const slug = slugifyPartner(formText(formData, "slug") || name);
  const type = formText(formData, "type");
  const verification = verificationFromForm(formData.get("verification"));
  const logoUrl = await logoFromAdminPartnerForm(formData);

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
      logoUrl,
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
  const uploadedLogoUrl = await logoFromAdminPartnerForm(formData);

  if (!organizationId || !name || !slug || !type) {
    redirectAdminPartnerError("partner-invalid", formData);
  }

  const [organization] = await db.select({ id: organizations.id, logoUrl: organizations.logoUrl }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminPartnerError("partner-missing", formData);
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
      logoUrl: uploadedLogoUrl ?? organization.logoUrl,
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
  const imageUrl = await imageFromForm(formData, "imageFile", "/partner/campaigns/new");
  const endsAt = parseOptionalDate(formData.get("endsAt"));

  if (!organizationId || !title || !summary || !category || !region || !goalAmount || !impactUnit || !impactTarget) {
    redirectPartnerError(formData, "/partner/campaigns/new", "campaign");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectPartnerError(formData, "/partner/campaigns/new", "organization");
  }

  await requireOrganizationPermission(user.id, organizationId, "campaign:create", formData, "/partner/campaigns/new");

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
  const uploadedImageUrl = await imageFromForm(formData, "imageFile", "/partner/campaigns");
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

  await requireOrganizationPermission(user.id, campaign.organizationId, "campaign:update", formData, "/partner/campaigns");

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectPartnerError(formData, "/partner/campaigns", "organization");
  }

  await requireOrganizationPermission(user.id, organizationId, "campaign:update", formData, "/partner/campaigns");

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

export async function createPartnerImpactSiteAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const values = impactSiteFormValues(formData, true, (code) => redirectPartnerError(formData, "/partner/impact-sites", code));
  const campaignId = values.campaignId;

  if (!campaignId) {
    redirectPartnerError(formData, "/partner/impact-sites", "impact-site-invalid");
  }

  await requireCampaignAccess(user.id, campaignId, formData, "/partner/impact-sites", "impact-site:manage");

  const [site] = await db
    .insert(impactSites)
    .values(values)
    .returning({ id: impactSites.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "impact_site.created",
    entityType: "impact_site",
    entityId: site.id,
    metadata: { source: "partner_portal", campaignId, name: values.name }
  });

  redirectPartnerSaved(formData, "/partner/impact-sites", "impact-site-created");
}

export async function updatePartnerImpactSiteAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const impactSiteId = formText(formData, "impactSiteId");
  const values = impactSiteFormValues(formData, true, (code) => redirectPartnerError(formData, "/partner/impact-sites", code));
  const campaignId = values.campaignId;

  if (!impactSiteId || !campaignId) {
    redirectPartnerError(formData, "/partner/impact-sites", "impact-site-missing");
  }

  await requirePartnerImpactSiteAccess(user.id, impactSiteId, formData, "/partner/impact-sites", "impact-site:manage");
  await requireCampaignAccess(user.id, campaignId, formData, "/partner/impact-sites", "impact-site:manage");

  await db
    .update(impactSites)
    .set(values)
    .where(eq(impactSites.id, impactSiteId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "impact_site.updated",
    entityType: "impact_site",
    entityId: impactSiteId,
    metadata: { source: "partner_portal", campaignId, name: values.name }
  });

  redirectPartnerSaved(formData, "/partner/impact-sites", "impact-site-updated");
}

export async function deletePartnerImpactSiteAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const impactSiteId = formText(formData, "impactSiteId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!impactSiteId || !confirmed) {
    redirectPartnerError(formData, "/partner/impact-sites", "impact-site-delete");
  }

  const site = await requirePartnerImpactSiteAccess(user.id, impactSiteId, formData, "/partner/impact-sites", "impact-site:manage");

  await db.delete(impactSites).where(eq(impactSites.id, impactSiteId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "impact_site.deleted",
    entityType: "impact_site",
    entityId: impactSiteId,
    metadata: { source: "partner_portal", campaignId: site.campaignId, name: site.name }
  });

  redirectPartnerSaved(formData, "/partner/impact-sites", "impact-site-deleted");
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

  await requireOrganizationPermission(user.id, campaign.organizationId, "campaign:delete", formData, "/partner/campaigns");

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

export async function upsertCampaignMediaItemAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const mediaItemId = formText(formData, "mediaItemId");
  const campaignIdFromForm = formText(formData, "campaignId");
  const title = formText(formData, "title");
  const uploadedFileUrl = await campaignContentImageFromForm(formData, fallbackPath);
  const mediaType = normalizeCampaignMediaType(formData.get("mediaType"));
  const sortOrder = parseNonNegativeInteger(formData.get("sortOrder")) ?? 0;
  const isFeatured = formData.get("isFeatured") === "on";
  const now = new Date();

  const [existingItem] = mediaItemId
    ? await db
        .select({
          id: campaignMediaItems.id,
          campaignId: campaignMediaItems.campaignId,
          fileUrl: campaignMediaItems.fileUrl
        })
        .from(campaignMediaItems)
        .where(eq(campaignMediaItems.id, mediaItemId))
        .limit(1)
    : [];
  const campaignId = existingItem?.campaignId ?? campaignIdFromForm;

  if (!campaignId || !title || (!uploadedFileUrl && !existingItem?.fileUrl)) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-invalid");
  }

  await requireCampaignAccess(user.id, campaignId, formData, fallbackPath, "campaign:update");

  if (mediaItemId && !existingItem) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  if (existingItem) {
    await db
      .update(campaignMediaItems)
      .set({
        title,
        mediaType,
        fileUrl: uploadedFileUrl ?? existingItem.fileUrl,
        thumbnailUrl: nullableText(formData, "thumbnailUrl"),
        altText: nullableText(formData, "altText"),
        caption: nullableText(formData, "caption"),
        provenance: nullableText(formData, "provenance"),
        sortOrder,
        isFeatured,
        updatedAt: now
      })
      .where(eq(campaignMediaItems.id, existingItem.id));
  } else {
    await db.insert(campaignMediaItems).values({
      campaignId,
      title,
      mediaType,
      fileUrl: uploadedFileUrl!,
      thumbnailUrl: nullableText(formData, "thumbnailUrl"),
      altText: nullableText(formData, "altText"),
      caption: nullableText(formData, "caption"),
      provenance: nullableText(formData, "provenance"),
      sortOrder,
      isFeatured,
      updatedAt: now
    });
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: existingItem ? "campaign_media.updated" : "campaign_media.created",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { mediaType, title, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-saved");
}

export async function deleteCampaignMediaItemAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const mediaItemId = formText(formData, "mediaItemId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!mediaItemId || !confirmed) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-delete");
  }

  const [item] = await db
    .select({ id: campaignMediaItems.id, campaignId: campaignMediaItems.campaignId, title: campaignMediaItems.title })
    .from(campaignMediaItems)
    .where(eq(campaignMediaItems.id, mediaItemId))
    .limit(1);

  if (!item) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  await requireCampaignAccess(user.id, item.campaignId, formData, fallbackPath, "campaign:update");
  await db.delete(campaignMediaItems).where(eq(campaignMediaItems.id, mediaItemId));
  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign_media.deleted",
    entityType: "campaign",
    entityId: item.campaignId,
    metadata: { title: item.title, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-deleted");
}

export async function upsertCampaignBudgetLineItemAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const budgetLineItemId = formText(formData, "budgetLineItemId");
  const campaignIdFromForm = formText(formData, "campaignId");
  const category = formText(formData, "category");
  const amount = parsePositiveDecimal(formData.get("amount"));
  const spentAmount = parseNonNegativeDecimal(formData.get("spentAmount"));
  const sortOrder = parseNonNegativeInteger(formData.get("sortOrder")) ?? 0;
  const now = new Date();

  const [existingItem] = budgetLineItemId
    ? await db
        .select({ id: campaignBudgetLineItems.id, campaignId: campaignBudgetLineItems.campaignId })
        .from(campaignBudgetLineItems)
        .where(eq(campaignBudgetLineItems.id, budgetLineItemId))
        .limit(1)
    : [];
  const campaignId = existingItem?.campaignId ?? campaignIdFromForm;

  if (!campaignId || !category || !amount || spentAmount === null) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-invalid");
  }

  await requireCampaignAccess(user.id, campaignId, formData, fallbackPath, "campaign:update");

  if (budgetLineItemId && !existingItem) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  if (existingItem) {
    await db
      .update(campaignBudgetLineItems)
      .set({
        category,
        description: nullableText(formData, "description"),
        amount,
        spentAmount,
        sortOrder,
        updatedAt: now
      })
      .where(eq(campaignBudgetLineItems.id, existingItem.id));
  } else {
    await db.insert(campaignBudgetLineItems).values({
      campaignId,
      category,
      description: nullableText(formData, "description"),
      amount,
      spentAmount,
      sortOrder,
      updatedAt: now
    });
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: existingItem ? "campaign_budget.updated" : "campaign_budget.created",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { category, amount, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-saved");
}

export async function deleteCampaignBudgetLineItemAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const budgetLineItemId = formText(formData, "budgetLineItemId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!budgetLineItemId || !confirmed) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-delete");
  }

  const [item] = await db
    .select({ id: campaignBudgetLineItems.id, campaignId: campaignBudgetLineItems.campaignId, category: campaignBudgetLineItems.category })
    .from(campaignBudgetLineItems)
    .where(eq(campaignBudgetLineItems.id, budgetLineItemId))
    .limit(1);

  if (!item) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  await requireCampaignAccess(user.id, item.campaignId, formData, fallbackPath, "campaign:update");
  await db.delete(campaignBudgetLineItems).where(eq(campaignBudgetLineItems.id, budgetLineItemId));
  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign_budget.deleted",
    entityType: "campaign",
    entityId: item.campaignId,
    metadata: { category: item.category, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-deleted");
}

export async function upsertCampaignTimelinePhaseAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const timelinePhaseId = formText(formData, "timelinePhaseId");
  const campaignIdFromForm = formText(formData, "campaignId");
  const title = formText(formData, "title");
  const status = normalizeCampaignTimelinePhaseStatus(formData.get("status"));
  const startsAt = parseOptionalDate(formData.get("startsAt"));
  const endsAt = parseOptionalDate(formData.get("endsAt"));
  const sortOrder = parseNonNegativeInteger(formData.get("sortOrder")) ?? 0;
  const now = new Date();

  const [existingItem] = timelinePhaseId
    ? await db
        .select({ id: campaignTimelinePhases.id, campaignId: campaignTimelinePhases.campaignId })
        .from(campaignTimelinePhases)
        .where(eq(campaignTimelinePhases.id, timelinePhaseId))
        .limit(1)
    : [];
  const campaignId = existingItem?.campaignId ?? campaignIdFromForm;

  if (!campaignId || !title) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-invalid");
  }

  await requireCampaignAccess(user.id, campaignId, formData, fallbackPath, "campaign:update");

  if (timelinePhaseId && !existingItem) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  if (existingItem) {
    await db
      .update(campaignTimelinePhases)
      .set({
        title,
        description: nullableText(formData, "description"),
        status,
        startsAt,
        endsAt,
        deliverable: nullableText(formData, "deliverable"),
        evidenceNote: nullableText(formData, "evidenceNote"),
        sortOrder,
        updatedAt: now
      })
      .where(eq(campaignTimelinePhases.id, existingItem.id));
  } else {
    await db.insert(campaignTimelinePhases).values({
      campaignId,
      title,
      description: nullableText(formData, "description"),
      status,
      startsAt,
      endsAt,
      deliverable: nullableText(formData, "deliverable"),
      evidenceNote: nullableText(formData, "evidenceNote"),
      sortOrder,
      updatedAt: now
    });
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: existingItem ? "campaign_timeline.updated" : "campaign_timeline.created",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { title, status, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-saved");
}

export async function deleteCampaignTimelinePhaseAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const timelinePhaseId = formText(formData, "timelinePhaseId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!timelinePhaseId || !confirmed) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-delete");
  }

  const [item] = await db
    .select({ id: campaignTimelinePhases.id, campaignId: campaignTimelinePhases.campaignId, title: campaignTimelinePhases.title })
    .from(campaignTimelinePhases)
    .where(eq(campaignTimelinePhases.id, timelinePhaseId))
    .limit(1);

  if (!item) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  await requireCampaignAccess(user.id, item.campaignId, formData, fallbackPath, "campaign:update");
  await db.delete(campaignTimelinePhases).where(eq(campaignTimelinePhases.id, timelinePhaseId));
  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign_timeline.deleted",
    entityType: "campaign",
    entityId: item.campaignId,
    metadata: { title: item.title, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-deleted");
}

export async function upsertOrganizationTeamMemberAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const teamMemberId = formText(formData, "teamMemberId");
  const organizationIdFromForm = formText(formData, "organizationId");
  const name = formText(formData, "name");
  const role = formText(formData, "role");
  const uploadedImageUrl = await campaignContentPortraitFromForm(formData, fallbackPath);
  const sortOrder = parseNonNegativeInteger(formData.get("sortOrder")) ?? 0;
  const isPublic = formData.get("isPublic") === "on";
  const now = new Date();

  const [existingItem] = teamMemberId
    ? await db
        .select({
          id: organizationTeamMembers.id,
          organizationId: organizationTeamMembers.organizationId,
          imageUrl: organizationTeamMembers.imageUrl
        })
        .from(organizationTeamMembers)
        .where(eq(organizationTeamMembers.id, teamMemberId))
        .limit(1)
    : [];
  const organizationId = existingItem?.organizationId ?? organizationIdFromForm;

  if (!organizationId || !name || !role) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-invalid");
  }

  await requireOrganizationPermission(user.id, organizationId, "campaign:update", formData, fallbackPath);

  if (teamMemberId && !existingItem) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  if (existingItem) {
    await db
      .update(organizationTeamMembers)
      .set({
        name,
        role,
        bio: nullableText(formData, "bio"),
        imageUrl: uploadedImageUrl ?? existingItem.imageUrl,
        profileUrl: nullableText(formData, "profileUrl"),
        sortOrder,
        isPublic,
        updatedAt: now
      })
      .where(eq(organizationTeamMembers.id, existingItem.id));
  } else {
    await db.insert(organizationTeamMembers).values({
      organizationId,
      name,
      role,
      bio: nullableText(formData, "bio"),
      imageUrl: uploadedImageUrl,
      profileUrl: nullableText(formData, "profileUrl"),
      sortOrder,
      isPublic,
      updatedAt: now
    });
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: existingItem ? "organization_team.updated" : "organization_team.created",
    entityType: "organization",
    entityId: organizationId,
    metadata: { name, role, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-saved");
}

export async function deleteOrganizationTeamMemberAction(formData: FormData) {
  const fallbackPath = campaignContentReturnPath(formData, "/partner/campaigns");
  const user = await requireRole(["partner", "admin"], fallbackPath);
  const teamMemberId = formText(formData, "teamMemberId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!teamMemberId || !confirmed) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-delete");
  }

  const [item] = await db
    .select({ id: organizationTeamMembers.id, organizationId: organizationTeamMembers.organizationId, name: organizationTeamMembers.name })
    .from(organizationTeamMembers)
    .where(eq(organizationTeamMembers.id, teamMemberId))
    .limit(1);

  if (!item) {
    redirectCampaignContentError(formData, fallbackPath, "campaign-content-missing");
  }

  await requireOrganizationPermission(user.id, item.organizationId, "campaign:update", formData, fallbackPath);
  await db.delete(organizationTeamMembers).where(eq(organizationTeamMembers.id, teamMemberId));
  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "organization_team.deleted",
    entityType: "organization",
    entityId: item.organizationId,
    metadata: { name: item.name, source: fallbackPath.startsWith("/admin/") ? "admin" : "partner_portal" }
  });

  redirectCampaignContentSaved(formData, fallbackPath, "campaign-content-deleted");
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
  const imageUrl = await imageFromAdminExpeditionForm(formData);

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
      imageUrl,
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
  const uploadedImageUrl = await imageFromAdminExpeditionForm(formData);

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

  const [currentExpedition] = await db.select({ id: expeditions.id, imageUrl: expeditions.imageUrl }).from(expeditions).where(eq(expeditions.id, expeditionId)).limit(1);

  if (!currentExpedition) {
    redirectAdminExpeditionError("expedition-missing", formData);
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
      imageUrl: uploadedImageUrl ?? currentExpedition.imageUrl,
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

export async function cancelExpeditionBookingAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const bookingId = formText(formData, "bookingId");
  const reason = formText(formData, "reason") || "Operator cancellation";
  const now = new Date();

  const [booking] = await db
    .select({
      id: expeditionBookings.id,
      expeditionId: expeditionBookings.expeditionId,
      departureId: expeditionBookings.departureId,
      bookingCode: expeditionBookings.bookingCode,
      status: expeditionBookings.status,
      paymentStatus: expeditionBookings.paymentStatus,
      metadata: expeditionBookings.metadata,
      startsAt: expeditionDepartures.startsAt
    })
    .from(expeditionBookings)
    .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
    .where(eq(expeditionBookings.id, bookingId))
    .limit(1);

  if (!booking || !canCancelExpeditionBooking({ bookingStatus: booking.status, paymentStatus: booking.paymentStatus, startsAt: booking.startsAt }, now)) {
    redirectAdminExpeditionError("booking-cancel", formData);
  }

  const nextPaymentStatus = booking.paymentStatus === "paid" ? "refunded" : "expired";

  await db.transaction(async (tx) => {
    await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
      bookingId: booking.id,
      nextStatus: nextPaymentStatus,
      processedByUserId: user.id,
      providerPayload: {
        method: "operator_cancellation",
        cancellationReason: reason,
        cancelledAt: now.toISOString()
      },
      operationType: "operator_cancellation",
      now
    });

    await tx
      .update(expeditionBookings)
      .set({
        status: "cancelled",
        metadata: {
          ...objectMetadata(booking.metadata),
          cancellationReason: reason,
          cancelledByUserId: user.id,
          cancelledAt: now.toISOString()
        }
      })
      .where(eq(expeditionBookings.id, booking.id));
  });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition_booking.cancelled",
    entityType: "expedition_booking",
    entityId: booking.id,
    metadata: {
      expeditionId: booking.expeditionId,
      departureId: booking.departureId,
      bookingCode: booking.bookingCode,
      previousStatus: booking.status,
      previousPaymentStatus: booking.paymentStatus,
      nextPaymentStatus,
      reason
    }
  });

  redirectAdminExpeditionSaved("booking-cancelled", formData);
}

export async function cancelExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const departureId = formText(formData, "departureId");
  const reason = formText(formData, "reason") || "Operator cancelled this departure";
  const now = new Date();

  const [departure] = await db
    .select({
      id: expeditionDepartures.id,
      expeditionId: expeditionDepartures.expeditionId,
      status: expeditionDepartures.status,
      metadata: expeditionDepartures.metadata
    })
    .from(expeditionDepartures)
    .where(eq(expeditionDepartures.id, departureId))
    .limit(1);

  if (!departure || departure.status === "cancelled") {
    redirectAdminExpeditionError("departure-cancel", formData);
  }

  const bookingRows = await db
    .select({
      id: expeditionBookings.id,
      bookingCode: expeditionBookings.bookingCode,
      status: expeditionBookings.status,
      paymentStatus: expeditionBookings.paymentStatus,
      metadata: expeditionBookings.metadata,
      startsAt: expeditionDepartures.startsAt
    })
    .from(expeditionBookings)
    .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
    .where(eq(expeditionBookings.departureId, departure.id));

  const cancellableBookings = bookingRows.filter((booking) =>
    canCancelExpeditionBooking({ bookingStatus: booking.status, paymentStatus: booking.paymentStatus, startsAt: booking.startsAt }, now)
  );

  await db.transaction(async (tx) => {
    await tx
      .update(expeditionDepartures)
      .set({
        status: "cancelled",
        metadata: {
          ...objectMetadata(departure.metadata),
          cancellationReason: reason,
          cancelledByUserId: user.id,
          cancelledAt: now.toISOString()
        }
      })
      .where(eq(expeditionDepartures.id, departure.id));

    for (const booking of cancellableBookings) {
      const nextPaymentStatus = booking.paymentStatus === "paid" ? "refunded" : "expired";

      await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
        bookingId: booking.id,
        nextStatus: nextPaymentStatus,
        processedByUserId: user.id,
        providerPayload: {
          method: "operator_departure_cancellation",
          cancellationReason: reason,
          cancelledAt: now.toISOString()
        },
        operationType: "operator_departure_cancellation",
        now
      });

      await tx
        .update(expeditionBookings)
        .set({
          status: "cancelled",
          metadata: {
            ...objectMetadata(booking.metadata),
            cancellationReason: reason,
            cancelledByUserId: user.id,
            cancelledAt: now.toISOString(),
            source: "departure_cancellation"
          }
        })
        .where(eq(expeditionBookings.id, booking.id));
    }
  });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition_departure.cancelled",
    entityType: "expedition_departure",
    entityId: departure.id,
    metadata: {
      expeditionId: departure.expeditionId,
      previousStatus: departure.status,
      cancelledBookings: cancellableBookings.length,
      skippedBookings: bookingRows.length - cancellableBookings.length,
      reason
    }
  });

  redirectAdminExpeditionSaved("departure-cancelled", formData);
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

  if (!expeditionId || !title || !slug || !region || !durationDays || !basePrice || !summary || !relatedCampaignId) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-invalid");
  }

  const existingExpedition = await requireExpeditionAccess(user.id, expeditionId, formData, "/partner/expeditions", "expedition:manage");
  await requireCampaignAccess(user.id, relatedCampaignId, formData, "/partner/expeditions", "expedition:manage");

  const [existingSlug] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existingSlug && existingSlug.id !== expeditionId) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-slug");
  }

  const [uploadedImageUrl, maxCapacity] = await Promise.all([uploadedPartnerImage(formData, "imageFile"), expeditionMaxCapacity(expeditionId)]);
  const imageUrl = uploadedImageUrl ?? existingExpedition.imageUrl;
  const currentMetadata = normalizeExpeditionDetailMetadata(existingExpedition.metadata, defaultPartnerExpeditionMetadata(existingExpedition, maxCapacity));
  const metadata = await partnerExpeditionMetadataFromForm(formData, {
    currentMetadata,
    durationDays,
    basePrice: Number(basePrice),
    maxCapacity
  });

  const [expedition] = await db
    .update(expeditions)
    .set({
      title,
      slug,
      region,
      durationDays,
      basePrice,
      summary,
      imageUrl,
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

  await requireCampaignAccess(user.id, relatedCampaignId, formData, "/partner/expeditions", "expedition:manage");

  const [existing] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existing) {
    redirectPartnerError(formData, "/partner/expeditions", "expedition-slug");
  }

  const imageUrl = await uploadedPartnerImage(formData, "imageFile");
  const currentMetadata = defaultPartnerExpeditionMetadata(
    {
      id: "",
      title,
      slug,
      region,
      durationDays,
      basePrice,
      summary,
      imageUrl,
      metadata: null,
      relatedCampaignId,
      organizationId: null
    },
    0,
    imageUrl
  );
  const metadata = await partnerExpeditionMetadataFromForm(formData, {
    currentMetadata,
    durationDays,
    basePrice: Number(basePrice),
    maxCapacity: 0
  });

  const [expedition] = await db
    .insert(expeditions)
    .values({
      title,
      slug,
      region,
      durationDays,
      basePrice,
      summary,
      imageUrl,
      relatedCampaignId,
      metadata
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

  await requireExpeditionAccess(user.id, expeditionId, formData, "/partner/expeditions", "expedition:manage");

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

  await requireExpeditionAccess(user.id, existingDeparture.expeditionId, formData, "/partner/expeditions", "expedition:manage");

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
  const impactLink = initialAdminCampaignImpactLinkFromForm(formData);

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

  if (impactLink.mode === "existing") {
    const [site] = await db
      .select({
        id: impactSites.id,
        campaignId: impactSites.campaignId
      })
      .from(impactSites)
      .where(eq(impactSites.id, impactLink.impactSiteId))
      .limit(1);

    if (!site) {
      redirectAdminCampaignError("impact-site-missing", formData);
    }

    if (site.campaignId) {
      redirectAdminCampaignError("impact-site-assigned", formData);
    }
  }

  const now = new Date();
  let campaignId = "";

  await db.transaction(async (tx) => {
    const [campaign] = await tx
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

    campaignId = campaign.id;

    let linkedImpactSiteId: string | null = null;

    if (impactLink.mode === "new") {
      const [site] = await tx
        .insert(impactSites)
        .values({
          campaignId: campaign.id,
          ...impactLink.values
        })
        .returning({ id: impactSites.id });

      linkedImpactSiteId = site.id;

      await tx.insert(adminAuditLogs).values({
        actorUserId: user.id,
        action: "impact_site.created",
        entityType: "impact_site",
        entityId: site.id,
        metadata: { source: "admin_campaign_create", campaignId: campaign.id, name: impactLink.values.name }
      });
    }

    if (impactLink.mode === "existing") {
      const [site] = await tx
        .update(impactSites)
        .set({
          campaignId: campaign.id
        })
        .where(and(eq(impactSites.id, impactLink.impactSiteId), sql`${impactSites.campaignId} is null`))
        .returning({ id: impactSites.id, name: impactSites.name });

      if (!site) {
        throw new Error("Impact site was assigned before campaign creation finished.");
      }

      linkedImpactSiteId = site.id;

      await tx.insert(adminAuditLogs).values({
        actorUserId: user.id,
        action: "impact_site.linked",
        entityType: "impact_site",
        entityId: site.id,
        metadata: { source: "admin_campaign_create", campaignId: campaign.id, name: site.name }
      });
    }

    await tx.insert(adminAuditLogs).values({
      actorUserId: user.id,
      action: "campaign.created",
      entityType: "campaign",
      entityId: campaign.id,
      metadata: { source: "admin", slug, status, impactLinkMode: impactLink.mode, impactSiteId: linkedImpactSiteId }
    });
  });

  redirect(`/admin/campaigns/${campaignId}?saved=${encodeURIComponent("campaign-created")}`);
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

export async function createAdminImpactSiteAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns/impact-sites");
  const values = impactSiteFormValues(formData, false, (code) => redirectAdminCampaignError(code, formData));

  if (values.campaignId) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, values.campaignId)).limit(1);

    if (!campaign) {
      redirectAdminCampaignError("campaign-missing", formData);
    }
  }

  const [site] = await db
    .insert(impactSites)
    .values(values)
    .returning({ id: impactSites.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "impact_site.created",
    entityType: "impact_site",
    entityId: site.id,
    metadata: { source: "admin", campaignId: values.campaignId, name: values.name }
  });

  redirectAdminCampaignSaved("impact-site-created", formData);
}

export async function updateAdminImpactSiteAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns/impact-sites");
  const impactSiteId = formText(formData, "impactSiteId");
  const values = impactSiteFormValues(formData, false, (code) => redirectAdminCampaignError(code, formData));

  if (!impactSiteId) {
    redirectAdminCampaignError("impact-site-missing", formData);
  }

  const [site] = await db.select({ id: impactSites.id, name: impactSites.name }).from(impactSites).where(eq(impactSites.id, impactSiteId)).limit(1);

  if (!site) {
    redirectAdminCampaignError("impact-site-missing", formData);
  }

  if (values.campaignId) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, values.campaignId)).limit(1);

    if (!campaign) {
      redirectAdminCampaignError("campaign-missing", formData);
    }
  }

  await db
    .update(impactSites)
    .set(values)
    .where(eq(impactSites.id, impactSiteId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "impact_site.updated",
    entityType: "impact_site",
    entityId: impactSiteId,
    metadata: { source: "admin", previousName: site.name, campaignId: values.campaignId, name: values.name }
  });

  redirectAdminCampaignSaved("impact-site-updated", formData);
}

export async function deleteAdminImpactSiteAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns/impact-sites");
  const impactSiteId = formText(formData, "impactSiteId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!impactSiteId || !confirmed) {
    redirectAdminCampaignError("impact-site-delete", formData);
  }

  const [site] = await db
    .select({
      id: impactSites.id,
      campaignId: impactSites.campaignId,
      name: impactSites.name
    })
    .from(impactSites)
    .where(eq(impactSites.id, impactSiteId))
    .limit(1);

  if (!site) {
    redirectAdminCampaignError("impact-site-missing", formData);
  }

  await db.delete(impactSites).where(eq(impactSites.id, impactSiteId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "impact_site.deleted",
    entityType: "impact_site",
    entityId: impactSiteId,
    metadata: { source: "admin", campaignId: site.campaignId, name: site.name }
  });

  redirectAdminCampaignSaved("impact-site-deleted", formData);
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
  const attachmentUrl = await imageFromForm(formData, "imageFile", "/partner/activity");
  const shouldPublish = activityUse === "public_update" || activityUse === "update_and_evidence";
  const shouldSubmitEvidence = activityUse === "evidence" || activityUse === "update_and_evidence";

  if (!campaignId || !title || !body || (shouldSubmitEvidence && !attachmentUrl)) {
    redirectPartnerError(formData, "/partner/activity", "activity");
  }

  await requireCampaignAccess(user.id, campaignId, formData, "/partner/activity", "activity:create");

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

      await tx.insert(evidenceReviewEvents).values({
        evidenceId: evidence.id,
        actorUserId: user.id,
        action: "submitted",
        toStatus: "submitted",
        note: body || null,
        visibility: "partner_visible",
        metadata: {
          activityCode: generatedActivityCode,
          evidenceCode: generatedEvidenceCode,
          submittedFrom: "partner_activity"
        }
      });
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

  return createCampaignActivityAction(formData);
}

export async function submitEvidenceAction(formData: FormData) {
  formData.set("activityUse", "evidence");
  formData.set("redirectTo", "/partner/activity");

  if (!formText(formData, "body")) {
    formData.set("body", formText(formData, "title"));
  }

  return createCampaignActivityAction(formData);
}

export async function reviseEvidenceAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner/evidence");
  const evidenceId = formText(formData, "evidenceId");
  const title = formText(formData, "title");
  const body = formText(formData, "body");
  const attachmentUrl = await imageFromForm(formData, "imageFile", "/partner/evidence");

  if (!evidenceId || !title || !attachmentUrl) {
    redirectPartnerError(formData, "/partner/evidence", "evidence-revision");
  }

  const [evidence] = await db
    .select({
      id: projectEvidence.id,
      campaignId: projectEvidence.campaignId,
      impactSiteId: projectEvidence.impactSiteId,
      evidenceCode: projectEvidence.evidenceCode,
      evidenceType: projectEvidence.evidenceType,
      verificationStatus: projectEvidence.verificationStatus
    })
    .from(projectEvidence)
    .where(eq(projectEvidence.id, evidenceId))
    .limit(1);

  if (!evidence) {
    redirectPartnerError(formData, "/partner/evidence", "evidence-missing");
  }

  await requireCampaignAccess(user.id, evidence.campaignId, formData, "/partner/evidence", "evidence:revise");

  if (!evidenceCanBeRevisedByPartner(evidence.verificationStatus)) {
    redirectPartnerError(formData, "/partner/evidence", "evidence-state");
  }

  const now = new Date();
  const storageProvider = attachmentUrl.startsWith("data:image/") ? "database_inline" : getEvidenceStorageProvider();
  const reviewAction = evidenceReviewActionForTransition({
    fromStatus: evidence.verificationStatus,
    toStatus: "submitted"
  });

  await db.transaction(async (tx) => {
    await tx
      .update(projectEvidence)
      .set({
        title,
        fileUrl: attachmentUrl,
        storageProvider,
        verificationStatus: "submitted",
        verifiedAt: null,
        assignedReviewerUserId: null,
        reviewedByUserId: null,
        reviewedAt: null,
        clarificationResolvedAt: evidence.verificationStatus === "needs_clarification" ? now : null,
        rejectionReason: null,
        updatedAt: now,
        metadata: {
          observation: body || null,
          revisedAt: now.toISOString(),
          revisedByUserId: user.id
        }
      })
      .where(eq(projectEvidence.id, evidenceId));

    await tx
      .update(campaignActivities)
      .set({
        title,
        body: body || null,
        mediaUrl: attachmentUrl,
        verificationStatus: "submitted",
        verifiedAt: null,
        storageProvider
      })
      .where(eq(campaignActivities.sourceEvidenceId, evidenceId));

    await tx.insert(evidenceReviewEvents).values({
      evidenceId,
      actorUserId: user.id,
      action: reviewAction,
      fromStatus: evidence.verificationStatus,
      toStatus: "submitted",
      note: body || null,
      visibility: "partner_visible",
      metadata: {
        evidenceCode: evidence.evidenceCode,
        evidenceType: evidence.evidenceType,
        revisedAt: now.toISOString()
      }
    });
  });

  redirectPartnerSaved(formData, "/partner/evidence", "evidence-resubmitted");
}

async function linkEvidenceToCorporatePrograms(evidenceId: string, status: string) {
  if (!shouldLinkEvidenceToCorporateProgram(status)) {
    return [];
  }

  const [evidence] = await db
    .select({
      campaignId: projectEvidence.campaignId
    })
    .from(projectEvidence)
    .where(eq(projectEvidence.id, evidenceId))
    .limit(1);

  if (!evidence) {
    return [];
  }

  const fundedPrograms = await db
    .select({
      programId: corporateProjectPortfolio.programId
    })
    .from(corporateProjectPortfolio)
    .where(eq(corporateProjectPortfolio.campaignId, evidence.campaignId));

  if (fundedPrograms.length === 0) {
    return [];
  }

  await db
    .insert(corporateEvidenceCenter)
    .values(
      fundedPrograms.map((program) => ({
        programId: program.programId,
        evidenceId,
        visibility: corporateEvidenceVisibilityForStatus(status)
      }))
    )
    .onConflictDoNothing({
      target: [corporateEvidenceCenter.programId, corporateEvidenceCenter.evidenceId]
    });

  return fundedPrograms.map((program) => program.programId);
}

export async function verifyEvidenceAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin");
  const evidenceId = String(formData.get("evidenceId") ?? "");
  const status = normalizeEvidenceVerificationStatus(String(formData.get("status") ?? "verified"), "verified");
  const reviewNote = formText(formData, "reviewNote") || formText(formData, "rejectionReason");
  const reviewerAssignment = formText(formData, "reviewerAssignment");
  const redirectTo = safeRedirectPath(formData.get("redirectTo"), "/admin/campaigns/evidence");

  if (!evidenceId) {
    redirect("/admin?error=evidence");
  }

  if (evidenceReviewNoteRequired(status) && !reviewNote) {
    redirect(`${redirectTo}?error=review-note`);
  }

  const now = new Date();
  const [evidence] = await db
    .select({
      id: projectEvidence.id,
      evidenceCode: projectEvidence.evidenceCode,
      verificationStatus: projectEvidence.verificationStatus,
      assignedReviewerUserId: projectEvidence.assignedReviewerUserId
    })
    .from(projectEvidence)
    .where(eq(projectEvidence.id, evidenceId))
    .limit(1);

  if (!evidence) {
    redirect(`${redirectTo}?error=evidence-missing`);
  }

  const assignedReviewerUserId =
    reviewerAssignment === "clear"
      ? null
      : reviewerAssignment === "keep"
        ? evidence.assignedReviewerUserId
        : status === "in_review" || status === "needs_clarification"
          ? user.id
          : evidence.assignedReviewerUserId ?? user.id;
  const reviewAction = evidenceReviewActionForTransition({
    fromStatus: evidence.verificationStatus,
    toStatus: status,
    assignedReviewerChanged: assignedReviewerUserId !== evidence.assignedReviewerUserId
  });

  await db.transaction(async (tx) => {
    await tx
      .update(projectEvidence)
      .set({
        verificationStatus: status,
        verifiedAt: status === "verified" ? now : null,
        assignedReviewerUserId,
        reviewedByUserId: user.id,
        reviewedAt: now,
        clarificationNote: status === "needs_clarification" ? reviewNote : status === "verified" ? null : undefined,
        clarificationRequestedAt: status === "needs_clarification" ? now : undefined,
        clarificationResolvedAt: evidence.verificationStatus === "needs_clarification" && status !== "needs_clarification" ? now : undefined,
        rejectionReason: status === "rejected" ? reviewNote : null,
        updatedAt: now
      })
      .where(eq(projectEvidence.id, evidenceId));

    await tx
      .update(campaignActivities)
      .set({
        verificationStatus: status,
        verifiedAt: status === "verified" ? now : null,
        metadata: {
          reviewedByUserId: user.id,
          reviewedAt: now.toISOString(),
          reviewAction,
          reviewNote: reviewNote || null,
          rejectionReason: status === "rejected" ? reviewNote : null,
          clarificationNote: status === "needs_clarification" ? reviewNote : null
        }
      })
      .where(eq(campaignActivities.sourceEvidenceId, evidenceId));

    await tx.insert(evidenceReviewEvents).values({
      evidenceId,
      actorUserId: user.id,
      assignedToUserId: assignedReviewerUserId,
      action: reviewAction,
      fromStatus: evidence.verificationStatus,
      toStatus: status,
      note: reviewNote || null,
      visibility: status === "in_review" ? "internal" : "partner_visible",
      metadata: {
        evidenceCode: evidence.evidenceCode,
        reviewerAssignment,
        reviewedAt: now.toISOString()
      }
    });

    if (status !== "verified") {
      await tx.update(corporateEvidenceCenter).set({ visibility: "internal" }).where(eq(corporateEvidenceCenter.evidenceId, evidenceId));
    }
  });

  const linkedCorporateProgramIds = await linkEvidenceToCorporatePrograms(evidenceId, status);
  const linkedCorporatePrograms = linkedCorporateProgramIds.length;

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action:
      status === "verified"
        ? "evidence.verified"
        : status === "rejected"
          ? "evidence.rejected"
          : status === "needs_clarification"
            ? "evidence.clarification_requested"
            : "evidence.in_review",
    entityType: "project_evidence",
    entityId: evidenceId,
    metadata: {
      status,
      reviewAction,
      reviewNote: reviewNote || null,
      rejectionReason: status === "rejected" ? reviewNote : null,
      linkedCorporatePrograms
    }
  });

  if (linkedCorporateProgramIds.length > 0) {
    await db.insert(adminAuditLogs).values(
      linkedCorporateProgramIds.map((programId) => ({
        actorUserId: user.id,
        action: "corporate.evidence.auto_linked",
        entityType: "project_evidence",
        entityId: evidenceId,
        metadata: {
          status,
          programId,
          linkedCorporatePrograms
        }
      }))
    );
  }

  redirect(`${redirectTo}?saved=evidence`);
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

export async function runMonthlyBillingAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin");
  const limit = parsePositiveInteger(formData.get("limit")) ?? 25;
  const now = new Date();
  const summary = await processDueDonationSubscriptions({
    limit,
    processedByUserId: user.id,
    now
  });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "billing.monthly_run",
    entityType: "billing",
    metadata: {
      ...summary,
      limit,
      processedAt: now.toISOString()
    }
  });

  redirect(`/admin?saved=billing-run&charged=${summary.charged}&failed=${summary.failed}&skipped=${summary.skipped}`);
}

export async function settlePaymentOperationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin");
  const operationId = formText(formData, "operationId");
  const decision = formText(formData, "decision");
  const adminNote = formText(formData, "adminNote") || null;
  const now = new Date();

  const [operation] = await db
    .select({
      id: paymentOperations.id,
      operationType: paymentOperations.operationType,
      entityType: paymentOperations.entityType,
      donationId: paymentOperations.donationId,
      bookingId: paymentOperations.bookingId,
      requestedByUserId: paymentOperations.requestedByUserId,
      status: paymentOperations.status,
      amount: paymentOperations.amount,
      currency: paymentOperations.currency,
      reason: paymentOperations.reason,
      providerReference: paymentOperations.providerReference
    })
    .from(paymentOperations)
    .where(eq(paymentOperations.id, operationId))
    .limit(1);

  if (!operation || operation.status !== "pending" || operation.operationType !== "refund") {
    redirect("/admin?error=operation");
  }

  if (decision === "reject") {
    await db
      .update(paymentOperations)
      .set({
        processedByUserId: user.id,
        status: "rejected",
        processedAt: now,
        updatedAt: now,
        metadata: {
          decision: "rejected",
          adminNote
        }
      })
      .where(eq(paymentOperations.id, operation.id));

    if (operation.entityType === "donation" && operation.donationId) {
      const [donation] = await db
        .select({ donorEmail: donations.donorEmail })
        .from(donations)
        .where(eq(donations.id, operation.donationId))
        .limit(1);

      if (donation?.donorEmail) {
        await sendTransactionalEmail({
          userId: operation.requestedByUserId,
          recipientEmail: donation.donorEmail,
          subject: "Your Terumbu refund request update",
          template: "refund_rejected",
          payload: {
            operationId: operation.id,
            reason: adminNote ?? operation.reason ?? "Refund request rejected"
          }
        });
      }
    }

    if (operation.entityType === "expedition_booking" && operation.bookingId) {
      const [booking] = await db
        .select({ contactEmail: expeditionBookings.contactEmail })
        .from(expeditionBookings)
        .where(eq(expeditionBookings.id, operation.bookingId))
        .limit(1);

      await sendTransactionalEmail({
        userId: operation.requestedByUserId,
        recipientEmail: booking?.contactEmail ?? "support@terumbu.eco",
        subject: "Your expedition refund request update",
        template: "refund_rejected",
        payload: {
          operationId: operation.id,
          reason: adminNote ?? operation.reason ?? "Refund request rejected"
        }
      });
    }

    await db.insert(adminAuditLogs).values({
      actorUserId: user.id,
      action: "payment_operation.rejected",
      entityType: operation.entityType,
      entityId: operation.donationId ?? operation.bookingId,
      metadata: {
        operationId: operation.id,
        operationType: operation.operationType,
        adminNote
      }
    });

    redirect("/admin?saved=operation-rejected");
  }

  if (decision !== "approve") {
    redirect("/admin?error=operation");
  }

  if (operation.entityType === "donation" && operation.donationId) {
    const [donation] = await db
      .select({
        id: donations.id,
        donorEmail: donations.donorEmail,
        amount: donations.amount,
        currency: donations.currency,
        status: donations.status,
        campaignTitle: campaigns.title
      })
      .from(donations)
      .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .where(eq(donations.id, operation.donationId))
      .limit(1);

    if (!donation || donation.status !== "paid") {
      redirect("/admin?error=operation");
    }

    const providerResult = demoGatewaySettleRefund({
      idempotencyKey: `refund:${operation.id}`,
      amount: Number(operation.amount ?? donation.amount),
      currency: operation.currency ?? donation.currency,
      providerReference: operation.providerReference,
      now
    });

    await db.transaction(async (tx) => {
      await transitionDonationPayment(tx as unknown as typeof db, {
        donationId: donation.id,
        nextStatus: providerResult.status,
        providerReference: providerResult.providerReference,
        providerPayload: {
          method: "refund_settlement",
          operationId: operation.id,
          providerStatus: providerResult.rawStatus,
          providerProcessedAt: providerResult.processedAt.toISOString(),
          idempotencyKey: providerResult.idempotencyKey,
          adminNote,
          ...providerResult.metadata
        },
        processedByUserId: user.id,
        operationType: "refund_settlement",
        now
      });

      await tx
        .update(paymentOperations)
        .set({
          processedByUserId: user.id,
          status: "completed",
          providerReference: providerResult.providerReference,
          processedAt: now,
          updatedAt: now,
          metadata: {
            decision: "approved",
            providerStatus: providerResult.rawStatus,
            adminNote
          }
        })
        .where(eq(paymentOperations.id, operation.id));
    });

    if (donation.donorEmail) {
      await sendTransactionalEmail({
        userId: operation.requestedByUserId,
        recipientEmail: donation.donorEmail,
        subject: "Your Terumbu refund was processed",
        template: "refund_processed",
        payload: {
          operationId: operation.id,
          donationId: donation.id,
          campaign: donation.campaignTitle,
          amount: Number(operation.amount ?? donation.amount),
          currency: operation.currency ?? donation.currency
        }
      });
    }

    await db.insert(adminAuditLogs).values({
      actorUserId: user.id,
      action: "payment_operation.refund_processed",
      entityType: "donation",
      entityId: donation.id,
      metadata: {
        operationId: operation.id,
        providerReference: providerResult.providerReference,
        adminNote
      }
    });

    redirect("/admin?saved=refund-processed");
  }

  if (operation.entityType === "expedition_booking" && operation.bookingId) {
    const [booking] = await db
      .select({
        id: expeditionBookings.id,
        bookingCode: expeditionBookings.bookingCode,
        contactEmail: expeditionBookings.contactEmail,
        totalAmount: expeditionBookings.totalAmount,
        currency: expeditionBookings.currency,
        paymentStatus: expeditionBookings.paymentStatus,
        expeditionTitle: expeditions.title
      })
      .from(expeditionBookings)
      .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
      .where(eq(expeditionBookings.id, operation.bookingId))
      .limit(1);

    if (!booking || booking.paymentStatus !== "paid") {
      redirect("/admin?error=operation");
    }

    const providerResult = demoGatewaySettleRefund({
      idempotencyKey: `refund:${operation.id}`,
      amount: Number(operation.amount ?? booking.totalAmount),
      currency: operation.currency ?? booking.currency,
      providerReference: operation.providerReference,
      now
    });

    await db.transaction(async (tx) => {
      await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
        bookingId: booking.id,
        nextStatus: providerResult.status,
        providerReference: providerResult.providerReference,
        providerPayload: {
          method: "refund_settlement",
          operationId: operation.id,
          providerStatus: providerResult.rawStatus,
          providerProcessedAt: providerResult.processedAt.toISOString(),
          idempotencyKey: providerResult.idempotencyKey,
          adminNote,
          ...providerResult.metadata
        },
        processedByUserId: user.id,
        operationType: "refund_settlement",
        now
      });

      await tx
        .update(paymentOperations)
        .set({
          processedByUserId: user.id,
          status: "completed",
          providerReference: providerResult.providerReference,
          processedAt: now,
          updatedAt: now,
          metadata: {
            decision: "approved",
            providerStatus: providerResult.rawStatus,
            adminNote
          }
        })
        .where(eq(paymentOperations.id, operation.id));
    });

    await sendTransactionalEmail({
      userId: operation.requestedByUserId,
      recipientEmail: booking.contactEmail,
      subject: "Your expedition refund was processed",
      template: "refund_processed",
      payload: {
        operationId: operation.id,
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        expedition: booking.expeditionTitle,
        amount: Number(operation.amount ?? booking.totalAmount),
        currency: operation.currency ?? booking.currency
      }
    });

    await db.insert(adminAuditLogs).values({
      actorUserId: user.id,
      action: "payment_operation.refund_processed",
      entityType: "expedition_booking",
      entityId: booking.id,
      metadata: {
        operationId: operation.id,
        providerReference: providerResult.providerReference,
        adminNote
      }
    });

    redirect("/admin?saved=refund-processed");
  }

  redirect("/admin?error=operation");
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
