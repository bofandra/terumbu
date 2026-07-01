"use server";

import { randomBytes } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  campaignUpdates,
  campaigns,
  corporateProjectPortfolio,
  donationReceipts,
  donations,
  expeditions,
  impactSites,
  organizations,
  paymentTransactions,
  projectEvidence,
  sponsoredEcosystems
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { buildReceiptNumber } from "@/lib/checkout";
import { sendTransactionalEmail } from "@/lib/email";
import { getEvidenceStorageProvider, normalizeEvidenceUrl, readUploadedImageAsDataUrl } from "@/lib/storage";

function evidenceCode() {
  return `EVD-${randomBytes(5).toString("hex").toUpperCase()}`;
}

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"] as const;
const verificationStatuses = ["basic", "document", "field"] as const;

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

function campaignStatusFromForm(value: FormDataEntryValue | null) {
  const status = String(value ?? "draft");

  return campaignStatuses.includes(status as (typeof campaignStatuses)[number]) ? (status as (typeof campaignStatuses)[number]) : "draft";
}

function slugifyTitle(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || `campaign-${randomBytes(2).toString("hex")}`;
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

export async function createPartnerCampaignAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const organizationId = formText(formData, "organizationId");
  const title = formText(formData, "title");
  const summary = formText(formData, "summary");
  const story = formText(formData, "story");
  const category = formText(formData, "category");
  const region = formText(formData, "region");
  const goalAmount = parseIdrAmount(formData.get("goalAmount"));
  const impactUnit = formText(formData, "impactUnit");
  const impactTarget = parsePositiveInteger(formData.get("impactTarget"));
  const status = campaignStatusFromForm(formData.get("status"));
  const imageUrl = await imageFromForm(formData, "imageFile", "imageUrl", "/partner/campaigns/new");
  const endsAt = parseOptionalDate(formData.get("endsAt"));

  if (!organizationId || !title || !summary || !category || !region || !goalAmount || !impactUnit || !impactTarget) {
    redirectPartnerError(formData, "/partner/campaigns/new", "campaign");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectPartnerError(formData, "/partner/campaigns/new", "organization");
  }

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
  const status = campaignStatusFromForm(formData.get("status"));
  const uploadedImageUrl = await imageFromForm(formData, "imageFile", "imageUrl", "/partner/campaigns");
  const endsAt = parseOptionalDate(formData.get("endsAt"));
  const removeImage = formData.get("removeImage") === "on";

  if (!campaignId || !organizationId || !title || !summary || !category || !region || !goalAmount || !impactUnit || !impactTarget) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-update");
  }

  const [campaign] = await db
    .select({
      id: campaigns.id,
      imageUrl: campaigns.imageUrl,
      publishedAt: campaigns.publishedAt
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-missing");
  }

  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (!organization) {
    redirectPartnerError(formData, "/partner/campaigns", "organization");
  }

  const now = new Date();

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

  const [campaign] = await db.select({ id: campaigns.id, title: campaigns.title }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);

  if (!campaign) {
    redirectPartnerError(formData, "/partner/campaigns", "campaign-missing");
  }

  await db.transaction(async (tx) => {
    const donationRows = await tx.select({ id: donations.id }).from(donations).where(eq(donations.campaignId, campaignId));
    const donationIds = donationRows.map((donation) => donation.id);

    if (donationIds.length > 0) {
      await tx.delete(paymentTransactions).where(inArray(paymentTransactions.donationId, donationIds));
    }

    await tx.delete(corporateProjectPortfolio).where(eq(corporateProjectPortfolio.campaignId, campaignId));
    await tx.delete(sponsoredEcosystems).where(eq(sponsoredEcosystems.campaignId, campaignId));
    await tx.delete(donations).where(eq(donations.campaignId, campaignId));
    await tx.update(impactSites).set({ campaignId: null }).where(eq(impactSites.campaignId, campaignId));
    await tx.update(expeditions).set({ relatedCampaignId: null }).where(eq(expeditions.relatedCampaignId, campaignId));
    await tx.delete(campaigns).where(eq(campaigns.id, campaignId));
  });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "campaign.deleted",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { source: "partner_portal", title: campaign.title }
  });

  redirectPartnerSaved(formData, "/partner/campaigns", "campaign-deleted");
}

export async function updateCampaignStatusAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/campaigns");
  const campaignId = String(formData.get("campaignId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!campaignId || !campaignStatuses.includes(status as (typeof campaignStatuses)[number])) {
    redirect("/admin/campaigns?error=campaign");
  }

  await db
    .update(campaigns)
    .set({
      status: status as (typeof campaignStatuses)[number],
      publishedAt: status === "published" ? new Date() : undefined,
      updatedAt: new Date()
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
  await requireRole(["partner", "admin"], "/partner");
  const campaignId = String(formData.get("campaignId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const imageUrl = await imageFromForm(formData, "imageFile", "imageUrl", "/partner/updates");

  if (!campaignId || !title || !body) {
    redirectPartnerError(formData, "/partner/updates", "update");
  }

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
  const status = formData.get("status") === "failed" ? "failed" : "paid";
  const now = new Date();
  let receiptEmailNumber: string | null = null;

  const [donation] = await db
    .select({
      id: donations.id,
      campaignId: donations.campaignId,
      donorEmail: donations.donorEmail,
      amount: donations.amount,
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

  await db.transaction(async (tx) => {
    await tx.update(donations).set({ status }).where(eq(donations.id, donation.id));

    await tx
      .update(paymentTransactions)
      .set({
        status,
        updatedAt: now
      })
      .where(eq(paymentTransactions.donationId, donation.id));

    if (status === "paid" && donation.status !== "paid") {
      await tx
        .update(campaigns)
        .set({
          raisedAmount: sql`${campaigns.raisedAmount} + ${donation.amount}`,
          donorCount: sql`${campaigns.donorCount} + 1`,
          updatedAt: now
        })
        .where(eq(campaigns.id, donation.campaignId));

      const receiptNumber = buildReceiptNumber(donation.id, now);

      await tx
        .insert(donationReceipts)
        .values({
          donationId: donation.id,
          receiptNumber,
          issuedAt: now,
          emailedAt: now,
          payload: {
            campaign: donation.campaignTitle,
            amount: Number(donation.amount),
            currency: "IDR"
          }
        })
        .onConflictDoNothing({
          target: donationReceipts.donationId
        });

      receiptEmailNumber = receiptNumber;
    }
  });

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
        currency: "IDR"
      }
    });
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "donation.reconciled",
    entityType: "donation",
    entityId: donation.id,
    metadata: { status }
  });

  redirect("/admin?saved=donation");
}
