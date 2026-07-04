"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  accounts,
  adminAuditLogs,
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
import { transitionDonationPayment, transitionExpeditionBookingPayment } from "@/lib/payment-workflows";
import { getEvidenceStorageProvider, normalizeEvidenceUrl, readUploadedImageAsDataUrl } from "@/lib/storage";

function evidenceCode() {
  return `EVD-${randomBytes(5).toString("hex").toUpperCase()}`;
}

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"] as const;
const partnerCampaignStatuses = ["draft", "review"] as const;
const verificationStatuses = ["basic", "document", "field"] as const;
const organizationUserRoles = ["owner", "manager", "contributor", "viewer"] as const;
const organizationUserStatuses = ["active", "inactive"] as const;
const expeditionDepartureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"] as const;

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
  "/partner/campaigns",
  "/partner/campaigns/new",
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

function redirectAdminPartnerError(code: string): never {
  redirect(`/admin/partners?error=${encodeURIComponent(code)}`);
}

function redirectAdminPartnerSaved(code: string): never {
  redirect(`/admin/partners?saved=${encodeURIComponent(code)}`);
}

function redirectAdminCampaignError(code: string): never {
  redirect(`/admin/campaigns?error=${encodeURIComponent(code)}`);
}

function redirectAdminCampaignSaved(code: string): never {
  redirect(`/admin/campaigns?saved=${encodeURIComponent(code)}`);
}

function redirectAdminExpeditionError(code: string): never {
  redirect(`/admin/expeditions?error=${encodeURIComponent(code)}`);
}

function redirectAdminExpeditionSaved(code: string): never {
  redirect(`/admin/expeditions?saved=${encodeURIComponent(code)}`);
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
    redirectAdminCampaignError(`image-${upload.error}`);
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

export async function createOrganizationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const name = formText(formData, "name");
  const slug = slugifyPartner(formText(formData, "slug") || name);
  const type = formText(formData, "type");
  const verification = verificationFromForm(formData.get("verification"));

  if (!name || !slug || !type) {
    redirectAdminPartnerError("partner-invalid");
  }

  const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);

  if (existing) {
    redirectAdminPartnerError("partner-slug");
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

  redirectAdminPartnerSaved("partner-created");
}

export async function updateOrganizationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const organizationId = formText(formData, "organizationId");
  const name = formText(formData, "name");
  const slug = slugifyPartner(formText(formData, "slug") || name);
  const type = formText(formData, "type");
  const verification = verificationFromForm(formData.get("verification"));

  if (!organizationId || !name || !slug || !type) {
    redirectAdminPartnerError("partner-invalid");
  }

  const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);

  if (existing && existing.id !== organizationId) {
    redirectAdminPartnerError("partner-slug");
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

  redirectAdminPartnerSaved("partner-updated");
}

export async function deleteOrganizationAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/partners");
  const organizationId = formText(formData, "organizationId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!organizationId || !confirmed) {
    redirectAdminPartnerError("partner-delete");
  }

  const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.organizationId, organizationId)).limit(1);

  if (campaign) {
    redirectAdminPartnerError("partner-has-campaigns");
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

  redirectAdminPartnerSaved("partner-deleted");
}

export async function addOrganizationUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/partners");
  const organizationId = formText(formData, "organizationId");
  const email = formEmail(formData, "email");
  const role = organizationUserRoleFromForm(formData.get("role"));
  const status = organizationUserStatusFromForm(formData.get("status"));

  if (!organizationId || !email) {
    redirectAdminPartnerError("partner-user-invalid");
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    redirectAdminPartnerError("partner-user-missing");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminPartnerError("partner-missing");
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

  redirectAdminPartnerSaved("partner-user-assigned");
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
    redirectAdminPartnerError("partner-user-invalid");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminPartnerError("partner-missing");
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existingUser) {
    redirectAdminPartnerError("partner-user-exists");
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

  redirectAdminPartnerSaved("partner-user-created");
}

export async function updateOrganizationUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/partners");
  const organizationUserId = formText(formData, "organizationUserId");
  const role = organizationUserRoleFromForm(formData.get("role"));
  const status = organizationUserStatusFromForm(formData.get("status"));

  if (!organizationUserId) {
    redirectAdminPartnerError("partner-user-invalid");
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
    redirectAdminPartnerError("partner-user-missing");
  }

  await syncPartnerRoleForUser(membership.userId);

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "organization_user.updated",
    entityType: "organization",
    entityId: membership.organizationId,
    metadata: { userId: membership.userId, role, status }
  });

  redirectAdminPartnerSaved("partner-user-updated");
}

export async function removeOrganizationUserAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/partners");
  const organizationUserId = formText(formData, "organizationUserId");

  if (!organizationUserId) {
    redirectAdminPartnerError("partner-user-invalid");
  }

  const [membership] = await db
    .delete(organizationUsers)
    .where(eq(organizationUsers.id, organizationUserId))
    .returning({
      organizationId: organizationUsers.organizationId,
      userId: organizationUsers.userId
    });

  if (!membership) {
    redirectAdminPartnerError("partner-user-missing");
  }

  await syncPartnerRoleForUser(membership.userId);

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "organization_user.removed",
    entityType: "organization",
    entityId: membership.organizationId,
    metadata: { userId: membership.userId }
  });

  redirectAdminPartnerSaved("partner-user-removed");
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

  if (!title || !slug || !region || !durationDays || !basePrice || !summary) {
    redirectAdminExpeditionError("expedition-invalid");
  }

  const [existing] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existing) {
    redirectAdminExpeditionError("expedition-slug");
  }

  if (relatedCampaignId) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, relatedCampaignId)).limit(1);

    if (!campaign) {
      redirectAdminExpeditionError("campaign-missing");
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
      relatedCampaignId
    })
    .returning({ id: expeditions.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition.created",
    entityType: "expedition",
    entityId: expedition.id,
    metadata: { slug, relatedCampaignId }
  });

  redirectAdminExpeditionSaved("expedition-created");
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

  if (!expeditionId || !title || !slug || !region || !durationDays || !basePrice || !summary) {
    redirectAdminExpeditionError("expedition-invalid");
  }

  const [existingSlug] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.slug, slug)).limit(1);

  if (existingSlug && existingSlug.id !== expeditionId) {
    redirectAdminExpeditionError("expedition-slug");
  }

  if (relatedCampaignId) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, relatedCampaignId)).limit(1);

    if (!campaign) {
      redirectAdminExpeditionError("campaign-missing");
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
      relatedCampaignId
    })
    .where(eq(expeditions.id, expeditionId))
    .returning({ id: expeditions.id });

  if (!expedition) {
    redirectAdminExpeditionError("expedition-missing");
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition.updated",
    entityType: "expedition",
    entityId: expeditionId,
    metadata: { slug, relatedCampaignId }
  });

  redirectAdminExpeditionSaved("expedition-updated");
}

export async function deleteExpeditionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const expeditionId = formText(formData, "expeditionId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!expeditionId || !confirmed) {
    redirectAdminExpeditionError("expedition-delete");
  }

  const [booking] = await db.select({ id: expeditionBookings.id }).from(expeditionBookings).where(eq(expeditionBookings.expeditionId, expeditionId)).limit(1);

  if (booking) {
    redirectAdminExpeditionError("expedition-has-bookings");
  }

  const [expedition] = await db.delete(expeditions).where(eq(expeditions.id, expeditionId)).returning({ id: expeditions.id, slug: expeditions.slug });

  if (!expedition) {
    redirectAdminExpeditionError("expedition-missing");
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition.deleted",
    entityType: "expedition",
    entityId: expedition.id,
    metadata: { slug: expedition.slug }
  });

  redirectAdminExpeditionSaved("expedition-deleted");
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
    redirectAdminExpeditionError("departure-invalid");
  }

  const [expedition] = await db.select({ id: expeditions.id }).from(expeditions).where(eq(expeditions.id, expeditionId)).limit(1);

  if (!expedition) {
    redirectAdminExpeditionError("expedition-missing");
  }

  const [existing] = await db
    .select({ id: expeditionDepartures.id })
    .from(expeditionDepartures)
    .where(and(eq(expeditionDepartures.expeditionId, expeditionId), eq(expeditionDepartures.startsAt, startsAt)))
    .limit(1);

  if (existing) {
    redirectAdminExpeditionError("departure-duplicate");
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

  redirectAdminExpeditionSaved("departure-created");
}

export async function updateExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const departureId = formText(formData, "departureId");
  const startsAt = parseDateTime(formData.get("startsAt"));
  const endsAt = parseDateTime(formData.get("endsAt"));
  const capacity = parsePositiveInteger(formData.get("capacity"));
  const status = expeditionDepartureStatusFromForm(formData.get("status"));

  if (!departureId || !startsAt || !endsAt || !capacity || endsAt <= startsAt) {
    redirectAdminExpeditionError("departure-invalid");
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
    redirectAdminExpeditionError("departure-missing");
  }

  if (capacity < existingDeparture.seatsBooked) {
    redirectAdminExpeditionError("departure-capacity");
  }

  const [duplicate] = await db
    .select({ id: expeditionDepartures.id })
    .from(expeditionDepartures)
    .where(and(eq(expeditionDepartures.expeditionId, existingDeparture.expeditionId), eq(expeditionDepartures.startsAt, startsAt)))
    .limit(1);

  if (duplicate && duplicate.id !== departureId) {
    redirectAdminExpeditionError("departure-duplicate");
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

  redirectAdminExpeditionSaved("departure-updated");
}

export async function deleteExpeditionDepartureAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/expeditions");
  const departureId = formText(formData, "departureId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!departureId || !confirmed) {
    redirectAdminExpeditionError("departure-delete");
  }

  const [booking] = await db.select({ id: expeditionBookings.id }).from(expeditionBookings).where(eq(expeditionBookings.departureId, departureId)).limit(1);

  if (booking) {
    redirectAdminExpeditionError("departure-has-bookings");
  }

  const [departure] = await db
    .delete(expeditionDepartures)
    .where(eq(expeditionDepartures.id, departureId))
    .returning({
      id: expeditionDepartures.id,
      expeditionId: expeditionDepartures.expeditionId
    });

  if (!departure) {
    redirectAdminExpeditionError("departure-missing");
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "expedition_departure.deleted",
    entityType: "expedition_departure",
    entityId: departure.id,
    metadata: { expeditionId: departure.expeditionId }
  });

  redirectAdminExpeditionSaved("departure-deleted");
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
    redirectAdminCampaignError("campaign-invalid");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminCampaignError("organization-missing");
  }

  const [existingSlug] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, slug)).limit(1);

  if (existingSlug) {
    redirectAdminCampaignError("campaign-slug");
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

  redirectAdminCampaignSaved("campaign-created");
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
    redirectAdminCampaignError("campaign-invalid");
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
    redirectAdminCampaignError("campaign-missing");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectAdminCampaignError("organization-missing");
  }

  const [existingSlug] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, slug)).limit(1);

  if (existingSlug && existingSlug.id !== campaignId) {
    redirectAdminCampaignError("campaign-slug");
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

  redirectAdminCampaignSaved("campaign-updated");
}

export async function deleteAdminCampaignAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns");
  const campaignId = formText(formData, "campaignId");
  const confirmed = formData.get("confirmDelete") === "delete";

  if (!campaignId || !confirmed) {
    redirectAdminCampaignError("campaign-delete");
  }

  const [campaign] = await db.select({ id: campaigns.id, title: campaigns.title }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);

  if (!campaign) {
    redirectAdminCampaignError("campaign-missing");
  }

  const blockers = await getCampaignDeleteBlockers(campaignId);

  if (blockers.blocked) {
    redirectAdminCampaignError("campaign-has-history");
  }

  await db.delete(campaigns).where(eq(campaigns.id, campaignId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.deleted",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { source: "admin", title: campaign.title }
  });

  redirectAdminCampaignSaved("campaign-deleted");
}

export async function updateCampaignStatusAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns");
  const campaignId = String(formData.get("campaignId") ?? "");
  const status = String(formData.get("status") ?? "");
  const now = new Date();

  if (!campaignId || !campaignStatuses.includes(status as (typeof campaignStatuses)[number])) {
    redirect("/admin/campaigns?error=campaign");
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
    redirect("/admin/campaigns?error=campaign");
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

  redirect("/admin/campaigns?saved=status");
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

export async function createCampaignUpdateAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const campaignId = String(formData.get("campaignId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const imageUrl = await imageFromForm(formData, "imageFile", "imageUrl", "/partner/updates");

  if (!campaignId || !title || !body) {
    redirectPartnerError(formData, "/partner/updates", "update");
  }

  await requireCampaignAccess(user.id, campaignId, formData, "/partner/updates");

  await db.insert(campaignUpdates).values({
    campaignId,
    title,
    body,
    imageUrl,
    publishedAt: new Date()
  });

  redirectPartnerSaved(formData, "/partner/updates", "update");
}

export async function submitEvidenceAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const campaignId = String(formData.get("campaignId") ?? "");
  const impactSiteId = String(formData.get("impactSiteId") || "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const evidenceType = String(formData.get("evidenceType") ?? "field_photo").trim();
  const fileUrl = await imageFromForm(formData, "imageFile", "fileUrl", "/partner/evidence/submit");

  if (!campaignId || !title || !fileUrl) {
    redirectPartnerError(formData, "/partner/evidence/submit", "evidence");
  }

  await requireCampaignAccess(user.id, campaignId, formData, "/partner/evidence/submit");

  if (impactSiteId) {
    const [site] = await db.select({ campaignId: impactSites.campaignId }).from(impactSites).where(eq(impactSites.id, impactSiteId)).limit(1);

    if (!site || site.campaignId !== campaignId) {
      redirectPartnerError(formData, "/partner/evidence/submit", "impact-site");
    }
  }

  await db.insert(projectEvidence).values({
    campaignId,
    impactSiteId,
    uploadedByUserId: user.id,
    evidenceCode: evidenceCode(),
    title,
    evidenceType,
    fileUrl,
    storageProvider: fileUrl.startsWith("data:image/") ? "database_inline" : getEvidenceStorageProvider(),
    verificationStatus: "submitted",
    metadata: {
      submittedFrom: "partner_portal"
    }
  });

  redirectPartnerSaved(formData, "/partner/evidence/submit", "evidence");
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
