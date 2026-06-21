"use server";

import { randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  campaignUpdates,
  campaigns,
  donationReceipts,
  donations,
  organizations,
  paymentTransactions,
  projectEvidence
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { buildReceiptNumber } from "@/lib/checkout";
import { sendTransactionalEmail } from "@/lib/email";
import { getEvidenceStorageProvider, normalizeEvidenceUrl } from "@/lib/storage";

function evidenceCode() {
  return `EVD-${randomBytes(5).toString("hex").toUpperCase()}`;
}

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"] as const;
const verificationStatuses = ["basic", "document", "field"] as const;

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
  const imageUrl = normalizeEvidenceUrl(formData.get("imageUrl"));

  if (!campaignId || !title || !body) {
    redirect("/partner?error=update");
  }

  await db.insert(campaignUpdates).values({
    campaignId,
    title,
    body,
    imageUrl,
    publishedAt: new Date()
  });

  redirect("/partner?saved=update");
}

export async function submitEvidenceAction(formData: FormData) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const campaignId = String(formData.get("campaignId") ?? "");
  const impactSiteId = String(formData.get("impactSiteId") || "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const evidenceType = String(formData.get("evidenceType") ?? "field_photo").trim();
  const fileUrl = normalizeEvidenceUrl(formData.get("fileUrl"));

  if (!campaignId || !title || !fileUrl) {
    redirect("/partner?error=evidence");
  }

  await db.insert(projectEvidence).values({
    campaignId,
    impactSiteId,
    uploadedByUserId: user.id,
    evidenceCode: evidenceCode(),
    title,
    evidenceType,
    fileUrl,
    storageProvider: getEvidenceStorageProvider(),
    verificationStatus: "submitted",
    metadata: {
      submittedFrom: "partner_portal"
    }
  });

  redirect("/partner?saved=evidence");
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
