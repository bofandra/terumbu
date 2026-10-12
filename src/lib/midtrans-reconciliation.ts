import { asc, and, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  donations, expeditionBookingPayments, expeditionBookings,
  midtransReconciliationChecks, paymentOperations, paymentTransactions
} from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email";
import {
  fetchMidtransTransactionStatus, midtransConfiguration, type MidtransConfiguration
} from "@/lib/midtrans";
import { applyVerifiedMidtransStatus, type MidtransSettlementResult } from "@/lib/midtrans-settlement";

export const MIDTRANS_RECONCILIATION_INTERVAL_MINUTES = 5;
export const MIDTRANS_RECONCILIATION_ATTENTION_MINUTES = 60;
export const MIDTRANS_RECONCILIATION_BATCH_SIZE = 20;
export const MIDTRANS_HISTORICAL_INTERVAL_HOURS = 24;
export const MIDTRANS_RECENT_WINDOW_DAYS = 7;

type Candidate = {
  orderId: string;
  createdAt: Date;
  entityType: "donation" | "expedition_booking";
  donationId?: string;
  bookingId?: string;
};

export function midtransReconciliationDue(lastChecked: Date | null, now = new Date()) {
  return !lastChecked || lastChecked.getTime() <= now.getTime() - MIDTRANS_RECONCILIATION_INTERVAL_MINUTES * 60_000;
}

export function midtransNeedsOperatorAttention(
  input: { ageMs: number; status?: MidtransSettlementResult["status"]; failed?: boolean }
) {
  return input.status === "manual_review" || input.status === "mismatch" || input.status === "unknown" ||
    Boolean(input.failed && input.ageMs >= MIDTRANS_RECONCILIATION_ATTENTION_MINUTES * 60_000);
}

async function pendingMidtransOrders(now: Date): Promise<Candidate[]> {
  const olderThanTwoMinutes = new Date(now.getTime() - 2 * 60_000);
  const sevenDaysAgo = new Date(now.getTime() - MIDTRANS_RECENT_WINDOW_DAYS * 24 * 60 * 60_000);
  const dueBy = new Date(now.getTime() - MIDTRANS_RECONCILIATION_INTERVAL_MINUTES * 60_000);
  const historicalDueBy = new Date(now.getTime() - MIDTRANS_HISTORICAL_INTERVAL_HOURS * 60 * 60_000);
  const donationRows = await db.select({
    orderId: paymentTransactions.providerReference,
    id: donations.id,
    createdAt: paymentTransactions.createdAt
  }).from(paymentTransactions)
    .innerJoin(donations, eq(paymentTransactions.donationId, donations.id))
    .leftJoin(midtransReconciliationChecks,
      eq(paymentTransactions.providerReference, midtransReconciliationChecks.providerReference))
    .where(and(
      eq(paymentTransactions.provider, "midtrans"),
      inArray(donations.status, ["created", "pending", "failed", "expired"]),
      lt(paymentTransactions.createdAt, olderThanTwoMinutes),
      or(
        isNull(midtransReconciliationChecks.lastCheckedAt),
        and(gte(paymentTransactions.createdAt, sevenDaysAgo), lt(midtransReconciliationChecks.lastCheckedAt, dueBy)),
        and(lt(paymentTransactions.createdAt, sevenDaysAgo), lt(midtransReconciliationChecks.lastCheckedAt, historicalDueBy))
      )
    )).orderBy(asc(sql`coalesce(${midtransReconciliationChecks.lastCheckedAt}, 'epoch'::timestamptz)`))
    .limit(MIDTRANS_RECONCILIATION_BATCH_SIZE);

  const bookingRows = await db.select({
    orderId: expeditionBookingPayments.providerReference,
    id: expeditionBookings.id,
    createdAt: expeditionBookingPayments.createdAt
  }).from(expeditionBookingPayments)
    .innerJoin(expeditionBookings, eq(expeditionBookingPayments.bookingId, expeditionBookings.id))
    .leftJoin(midtransReconciliationChecks,
      eq(expeditionBookingPayments.providerReference, midtransReconciliationChecks.providerReference))
    .where(and(
      eq(expeditionBookingPayments.provider, "midtrans"),
      inArray(expeditionBookings.paymentStatus, ["created", "pending", "failed", "expired"]),
      lt(expeditionBookingPayments.createdAt, olderThanTwoMinutes),
      or(
        isNull(midtransReconciliationChecks.lastCheckedAt),
        and(gte(expeditionBookingPayments.createdAt, sevenDaysAgo), lt(midtransReconciliationChecks.lastCheckedAt, dueBy)),
        and(lt(expeditionBookingPayments.createdAt, sevenDaysAgo), lt(midtransReconciliationChecks.lastCheckedAt, historicalDueBy))
      )
    )).orderBy(asc(sql`coalesce(${midtransReconciliationChecks.lastCheckedAt}, 'epoch'::timestamptz)`))
    .limit(MIDTRANS_RECONCILIATION_BATCH_SIZE);

  return [
    ...donationRows.map((row): Candidate => ({
      orderId: row.orderId, createdAt: row.createdAt, entityType: "donation", donationId: row.id
    })),
    ...bookingRows.map((row): Candidate => ({
      orderId: row.orderId, createdAt: row.createdAt, entityType: "expedition_booking", bookingId: row.id
    }))
  ];
}

async function writeCheck(orderId: string, providerState: string | null, failed: boolean, now: Date) {
  await db.insert(midtransReconciliationChecks).values({
    providerReference: orderId,
    lastCheckedAt: now,
    lastProviderStatus: providerState?.slice(0, 40) ?? null,
    attempts: 1,
    failures: failed ? 1 : 0,
    updatedAt: now
  }).onConflictDoUpdate({
    target: midtransReconciliationChecks.providerReference,
    set: {
      lastCheckedAt: now,
      lastProviderStatus: providerState?.slice(0, 40) ?? null,
      attempts: sql`${midtransReconciliationChecks.attempts} + 1`,
      failures: failed ? sql`${midtransReconciliationChecks.failures} + 1` : 0,
      updatedAt: now
    }
  });
}

async function createAttentionCase(candidate: Candidate, reason: string) {
  const [record] = await db.insert(paymentOperations).values({
    operationCode: "MT-RECON-" + candidate.orderId,
    operationType: "midtrans_reconciliation_attention",
    entityType: candidate.entityType,
    donationId: candidate.donationId ?? null,
    bookingId: candidate.bookingId ?? null,
    provider: "midtrans",
    providerReference: candidate.orderId,
    status: "manual_review",
    currency: "IDR",
    reason,
    metadata: { orderCreatedAt: candidate.createdAt.toISOString(), detectedAt: new Date().toISOString() }
  }).onConflictDoNothing({ target: paymentOperations.operationCode })
    .returning({ id: paymentOperations.id });

  if (!record) return false;
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();
  if (supportEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    try {
      await sendTransactionalEmail({
        recipientEmail: supportEmail,
        subject: "Terumbu: Midtrans payment reconciliation needs review",
        template: "midtrans_reconciliation_attention",
        payload: { operationId: record.id, entityType: candidate.entityType,
          providerReference: candidate.orderId, reason }
      });
    } catch {
      console.error("Midtrans reconciliation alert email could not be recorded.");
    }
  } else {
    console.error("Midtrans reconciliation attention case created; SUPPORT_EMAIL is not configured.");
  }
  return true;
}

export async function processMissingMidtransWebhooks(
  now = new Date(),
  overrides: { config?: MidtransConfiguration | null; fetcher?: typeof fetch } = {}
) {
  const config = overrides.config === undefined ? midtransConfiguration() : overrides.config;
  if (!config) return { disabled: true, scanned: 0, updated: 0, unchanged: 0, attention: 0, failed: 0 };
  const candidates = await pendingMidtransOrders(now);
  const results = { disabled: false, scanned: candidates.length, updated: 0, unchanged: 0, attention: 0, failed: 0 };
  for (const candidate of candidates) {
    let failed = false;
    let providerStatus: string | null = null;
    try {
      const verified = await fetchMidtransTransactionStatus(config, candidate.orderId, overrides.fetcher);
      providerStatus = typeof verified.transaction_status === "string" ? verified.transaction_status : null;
      const applied = await applyVerifiedMidtransStatus(candidate.orderId, verified, "midtrans_reconciled");
      if (applied.status === "updated") results.updated += 1;
      else if (applied.status === "unchanged" || applied.status === "capacity_unavailable") results.unchanged += 1;
      else if (midtransNeedsOperatorAttention({ ageMs: now.getTime() - candidate.createdAt.getTime(), status: applied.status })) {
        if (await createAttentionCase(candidate, "Provider state or stored amount requires manual payment reconciliation.")) {
          results.attention += 1;
        }
      }
    } catch {
      failed = true;
      results.failed += 1;
      if (midtransNeedsOperatorAttention({
        ageMs: now.getTime() - candidate.createdAt.getTime(), failed: true
      })) {
        if (await createAttentionCase(candidate, "Provider status could not be verified after one hour.")) {
          results.attention += 1;
        }
      }
    } finally {
      // A failed provider request is never interpreted as a failed payment.
      await writeCheck(candidate.orderId, providerStatus, failed, now);
    }
  }
  return results;
}
