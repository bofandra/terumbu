"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { campaigns, donations, paymentTransactions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { normalizeDonationContributionIntent, parseDonationAmount } from "@/lib/checkout";
import { minimumDonationAmount, normalizeCurrency } from "@/lib/impact-calculations";
import { createMidtransSnapPayment, midtransConfiguration, midtransSnapOrigin } from "@/lib/midtrans";
import { recordPaymentOperation } from "@/lib/payment-workflows";

function checkoutError(error: string) {
  return "/checkout/donation?error=" + encodeURIComponent(error);
}

function validStoredSnapUrl(value: unknown, origin: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === origin && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Standalone donation checkout: manual transfer remains available independently.
 * An order and its provider reference are persisted BEFORE calling Midtrans so
 * even a late webhook can always be reconciled to a known donation.
 */
export async function createMidtransDonationAction(formData: FormData) {
  const config = midtransConfiguration();
  if (!config) redirect(checkoutError("gateway"));

  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();
  const campaignSlug = String(formData.get("campaignSlug") ?? "").trim();
  const customAmount = parseDonationAmount(formData.get("customAmount"));
  const amount = customAmount > 0 ? customAmount : parseDonationAmount(formData.get("amount"));
  const donorName = String(formData.get("donorName") ?? "").trim();
  const donorEmail = String(formData.get("donorEmail") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);
  const contributionIntent = normalizeDonationContributionIntent(formData.get("intent"));

  if (!/^donation-[0-9a-f]{24}$/.test(idempotencyKey) || !campaignSlug ||
      !donorName || donorName.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail) || donorEmail.length > 255 ||
      !Number.isSafeInteger(amount) || amount < minimumDonationAmount("IDR") || amount >= 1_000_000_000_000) {
    redirect(checkoutError("invalid"));
  }

  const [campaign] = await db.select({ id: campaigns.id, currency: campaigns.currency })
    .from(campaigns)
    .where(and(eq(campaigns.slug, campaignSlug), eq(campaigns.status, "published")))
    .limit(1);
  if (!campaign || normalizeCurrency(campaign.currency) !== "IDR") {
    redirect(checkoutError("campaign"));
  }

  const [existing] = await db.select({
    id: donations.id,
    campaignId: donations.campaignId,
    amount: donations.amount,
    email: donations.donorEmail,
    status: donations.status,
    provider: paymentTransactions.provider,
    redirectData: paymentTransactions.payload
  }).from(donations)
    .leftJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
    .where(eq(donations.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) {
    // Do not leak another checkout's payment URL through a reused key.
    if (existing.campaignId !== campaign.id || Number(existing.amount) !== amount ||
        existing.email !== donorEmail || existing.provider !== "midtrans") {
      redirect(checkoutError("invalid"));
    }
    if (existing.status === "paid" || existing.status === "refunded") {
      redirect("/checkout/success?type=donation&id=" + existing.id + "&status=" + existing.status);
    }
    const savedUrl = existing.redirectData && typeof existing.redirectData === "object" &&
      !Array.isArray(existing.redirectData) ? (existing.redirectData as Record<string, unknown>).redirectUrl : null;
    if (existing.status === "pending" && validStoredSnapUrl(savedUrl, midtransSnapOrigin(config))) {
      redirect(savedUrl);
    }
    // Never automatically initiate a second charge for the same order ID.
    redirect(checkoutError("gateway"));
  }

  const sessionUser = await getSessionUser();
  const orderId = "TRB-DON-" + randomUUID();
  const now = new Date();
  const providerPayload = {
    method: "midtrans_snap",
    contributionIntent,
    createdAt: now.toISOString()
  };

  const [inserted] = await db.transaction(async (tx) => {
    const rows = await tx.insert(donations).values({
      campaignId: campaign.id,
      userId: sessionUser?.id ?? null,
      idempotencyKey,
      donorName,
      donorEmail,
      amount: amount.toFixed(2),
      currency: "IDR",
      status: "pending",
      message,
      createdAt: now
    }).onConflictDoNothing({ target: donations.idempotencyKey }).returning({ id: donations.id });
    if (!rows[0]) return [];

    await tx.insert(paymentTransactions).values({
      donationId: rows[0].id,
      paymentMethodId: null,
      provider: "midtrans",
      providerReference: orderId,
      status: "created",
      payload: providerPayload,
      updatedAt: now
    });
    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "midtrans_donation_initiated",
      entityType: "donation",
      donationId: rows[0].id,
      requestedByUserId: sessionUser?.id ?? null,
      status: "pending",
      amount: amount.toFixed(2),
      currency: "IDR",
      provider: "midtrans",
      providerReference: orderId,
      metadata: providerPayload,
      now
    });
    return rows;
  });
  if (!inserted) redirect(checkoutError("gateway"));

  let redirectUrl: string;
  try {
    redirectUrl = await createMidtransSnapPayment(config, { orderId, amount, donorName, donorEmail });
  } catch {
    // The provider may have accepted a request even when its response was
    // lost. Keep the durable pending order for webhook reconciliation.
    console.error("Midtrans donation initiation could not be completed.");
    redirect(checkoutError("gateway"));
  }

  const updated = await db.update(paymentTransactions).set({
    status: "pending",
    payload: { ...providerPayload, redirectUrl, snapCreatedAt: new Date().toISOString() },
    updatedAt: new Date()
  }).where(and(eq(paymentTransactions.provider, "midtrans"), eq(paymentTransactions.providerReference, orderId)))
    .returning({ id: paymentTransactions.id });
  if (!updated.length) {
    console.error("Midtrans donation link was not persisted.");
    redirect(checkoutError("gateway"));
  }

  redirect(redirectUrl);
}
