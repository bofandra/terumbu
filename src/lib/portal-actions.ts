"use server";

import { randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  campaignUpdates,
  campaigns,
  donationReceipts,
  donations,
  emailLogs,
  paymentTransactions,
  projectEvidence
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { buildReceiptNumber } from "@/lib/checkout";
import { getEvidenceStorageProvider, normalizeEvidenceUrl } from "@/lib/storage";

function evidenceCode() {
  return `EVD-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function createCampaignUpdateAction(formData: FormData) {
  await requireUser("/partner");
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
  const user = await requireUser("/partner");
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
  await requireUser("/admin");
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

  redirect("/admin?saved=evidence");
}

export async function reconcileDonationAction(formData: FormData) {
  await requireUser("/admin");
  const donationId = String(formData.get("donationId") ?? "");
  const status = formData.get("status") === "failed" ? "failed" : "paid";
  const now = new Date();

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

      if (donation.donorEmail) {
        await tx.insert(emailLogs).values({
          recipientEmail: donation.donorEmail,
          subject: "Your Terumbu donation receipt",
          template: "donation_receipt",
          status: "sent",
          payload: {
            receiptNumber,
            donationId: donation.id
          },
          sentAt: now
        });
      }
    }
  });

  redirect("/admin?saved=donation");
}
