import { createHash } from "node:crypto";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  checkoutStatusAccessTokens, checkoutStatusRequestLimits,
  donations, expeditionBookingPayments, expeditionBookings, paymentTransactions
} from "@/db/schema";
import { authAppBaseUrl } from "@/lib/auth-tokens";
import {
  checkoutStatusTokenHash, newCheckoutStatusToken, setCheckoutStatusCookie
} from "@/lib/checkout-status-access";
import { sendTransactionalEmail } from "@/lib/email";

export const CHECKOUT_RECOVERY_MINUTES = 15;
export const CHECKOUT_DEVICE_DAYS = 30;
export const CHECKOUT_RECOVERY_MAX_ITEMS = 10;

const SHA256 = /^[0-9a-f]{64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validCheckoutRecoveryEmail(input: unknown): input is string {
  return typeof input === "string" && input.length <= 255 && EMAIL.test(input);
}

export function normalizeCheckoutRecoveryEmail(input: string) {
  return input.trim().toLowerCase();
}

export function checkoutRecoveryThrottleKey(scope: string, key: string) {
  return createHash("sha256").update(scope + "\u0000" + key, "utf8").digest("hex");
}

export function checkoutRecoveryExpiry(now: Date) {
  return new Date(now.getTime() + CHECKOUT_RECOVERY_MINUTES * 60_000);
}

export function checkoutDeviceExpiry(now: Date) {
  return new Date(now.getTime() + CHECKOUT_DEVICE_DAYS * 24 * 60 * 60_000);
}

function checkoutLink(token: string) {
  const url = new URL("/checkout/access", authAppBaseUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

async function takeRequestSlot(scope: string, key: string, limit: number, now: Date) {
  const keyHash = checkoutRecoveryThrottleKey(scope, key);
  const resetAt = new Date(now.getTime() + 60 * 60_000);
  // Atomic across app replicas. Multiple simultaneous requests to the same
  // address cannot sidestep the counter by racing individual read queries.
  const [hit] = await db.insert(checkoutStatusRequestLimits).values({
    keyHash, hits: 1, resetAt
  }).onConflictDoUpdate({
    target: checkoutStatusRequestLimits.keyHash,
    set: {
      hits: sql`case when ${checkoutStatusRequestLimits.resetAt} <= ${now}
        then 1 else least(${checkoutStatusRequestLimits.hits} + 1, 100000) end`,
      resetAt: sql`case when ${checkoutStatusRequestLimits.resetAt} <= ${now}
        then ${resetAt} else ${checkoutStatusRequestLimits.resetAt} end`
    }
  }).returning({ hits: checkoutStatusRequestLimits.hits });
  return Boolean(hit && hit.hits <= limit);
}

type GuestCheckout = { id: string; type: "donation" | "expedition" };

async function recentGuestMidtransCheckouts(email: string): Promise<GuestCheckout[]> {
  const [guestDonations, guestBookings] = await Promise.all([
    db.select({ id: donations.id, createdAt: donations.createdAt })
      .from(donations)
      .innerJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
      .where(and(eq(donations.donorEmail, email), isNull(donations.userId),
        eq(paymentTransactions.provider, "midtrans")))
      .orderBy(desc(donations.createdAt)).limit(CHECKOUT_RECOVERY_MAX_ITEMS),
    db.select({ id: expeditionBookings.id, createdAt: expeditionBookings.bookedAt })
      .from(expeditionBookings)
      .innerJoin(expeditionBookingPayments, eq(expeditionBookingPayments.bookingId, expeditionBookings.id))
      .where(and(eq(expeditionBookings.contactEmail, email), isNull(expeditionBookings.userId),
        eq(expeditionBookingPayments.provider, "midtrans")))
      .orderBy(desc(expeditionBookings.bookedAt)).limit(CHECKOUT_RECOVERY_MAX_ITEMS)
  ]);
  return [
    ...guestDonations.map(row => ({ id: row.id, type: "donation" as const, createdAt: row.createdAt })),
    ...guestBookings.map(row => ({ id: row.id, type: "expedition" as const, createdAt: row.createdAt }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, CHECKOUT_RECOVERY_MAX_ITEMS)
    .map(({ id, type }) => ({ id, type }));
}

/**
 * Generic success regardless of address or payment existence. The raw
 * capability is emailed directly and never added to the email audit log.
 */
export async function requestGuestCheckoutRecovery(
  rawEmail: string,
  clientKey: string,
  now = new Date()
): Promise<void> {
  const email = normalizeCheckoutRecoveryEmail(rawEmail);
  if (!validCheckoutRecoveryEmail(email)) return;
  const [emailAllowed, clientAllowed] = await Promise.all([
    takeRequestSlot("checkout-email", email, 3, now),
    takeRequestSlot("checkout-client", clientKey.slice(0, 150), 20, now)
  ]);
  if (!emailAllowed || !clientAllowed) return;

  const checkouts = await recentGuestMidtransCheckouts(email);
  if (!checkouts.length) return;

  const issued = checkouts.map((checkout) => {
    const token = newCheckoutStatusToken();
    return {
      ...checkout,
      token,
      tokenHash: checkoutStatusTokenHash(token),
      expiresAt: checkoutRecoveryExpiry(now)
    };
  });
  await db.insert(checkoutStatusAccessTokens).values(issued.map(item => ({
    tokenHash: item.tokenHash,
    checkoutType: item.type,
    checkoutId: item.id,
    purpose: "recovery",
    expiresAt: item.expiresAt
  })));
  const links = issued.map((item, i) =>
    `${i + 1}. ${item.type === "expedition" ? "Expedition" : "Donation"} payment: ${checkoutLink(item.token)}`
  ).join("\n");

  try {
    const sent = await sendTransactionalEmail({
      recipientEmail: email,
      subject: "Terumbu: securely open your payment history",
      template: "guest_checkout_status_recovery",
      payload: {
        explanation: "Open the link on the device you wish to use, then confirm. Links expire in 15 minutes and work once.",
        links,
        expiresAt: checkoutRecoveryExpiry(now).toISOString()
      },
      auditPayload: {
        recoveryLinksRedacted: true,
        checkoutCount: issued.length,
        expiresAt: checkoutRecoveryExpiry(now).toISOString()
      }
    });
    if (sent.status !== "sent") {
      await db.delete(checkoutStatusAccessTokens)
        .where(sql`${checkoutStatusAccessTokens.tokenHash} in (${sql.join(issued.map(x => sql`${x.tokenHash}`), sql`, `)})`);
    }
  } catch {
    // Never expose address existence or delivery provider errors to the caller.
    console.error("Guest checkout email status recovery failed.");
  }
}

/** Atomic one-use exchange, then create a separate 30-day per-device grant. */
export async function redeemGuestCheckoutRecovery(rawToken: string, now = new Date()) {
  if (!SHA256.test(rawToken)) return null;
  const recoveryHash = checkoutStatusTokenHash(rawToken);
  const newToken = newCheckoutStatusToken();
  const newTokenHash = checkoutStatusTokenHash(newToken);
  const [grant] = await db.transaction(async tx => {
    const [record] = await tx.update(checkoutStatusAccessTokens)
      .set({ usedAt: now })
      .where(and(
        eq(checkoutStatusAccessTokens.tokenHash, recoveryHash),
        eq(checkoutStatusAccessTokens.purpose, "recovery"),
        isNull(checkoutStatusAccessTokens.usedAt),
        gt(checkoutStatusAccessTokens.expiresAt, now)
      )).returning({
        id: checkoutStatusAccessTokens.checkoutId,
        type: checkoutStatusAccessTokens.checkoutType
      });
    if (!record || (record.type !== "donation" && record.type !== "expedition")) return [];
    return tx.insert(checkoutStatusAccessTokens).values({
      tokenHash: newTokenHash,
      checkoutType: record.type,
      checkoutId: record.id,
      purpose: "device_access",
      expiresAt: checkoutDeviceExpiry(now)
    }).returning({ id: checkoutStatusAccessTokens.checkoutId, type: checkoutStatusAccessTokens.checkoutType });
  });
  if (!grant || (grant.type !== "donation" && grant.type !== "expedition")) return null;
  await setCheckoutStatusCookie(grant.id, newToken);
  return { type: grant.type, id: grant.id };
}

export async function hasRecoveredCheckoutAccess(input: {
  token: string | null;
  checkoutId: string;
  type: "donation" | "expedition";
}, now = new Date()) {
  if (!input.token || !SHA256.test(input.token)) return false;
  const [record] = await db.select({ hash: checkoutStatusAccessTokens.tokenHash })
    .from(checkoutStatusAccessTokens).where(and(
      eq(checkoutStatusAccessTokens.tokenHash, checkoutStatusTokenHash(input.token)),
      eq(checkoutStatusAccessTokens.checkoutType, input.type),
      eq(checkoutStatusAccessTokens.checkoutId, input.checkoutId),
      eq(checkoutStatusAccessTokens.purpose, "device_access"),
      gt(checkoutStatusAccessTokens.expiresAt, now)
    )).limit(1);
  return Boolean(record);
}
