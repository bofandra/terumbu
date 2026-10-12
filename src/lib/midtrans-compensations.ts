import { randomUUID } from "node:crypto";

import { and, eq, inArray, lt } from "drizzle-orm";

import { db } from "@/db/client";
import { expeditionBookingPayments, expeditionBookings, paymentOperations } from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email";
import { fetchMidtransTransactionStatus, midtransConfiguration, midtransIdrAmount } from "@/lib/midtrans";
import { midtransAutoRefundEnabled, midtransRefundEligible, midtransRefundKey, requestMidtransFullRefund } from "@/lib/midtrans-refunds";
import { transitionExpeditionBookingPayment } from "@/lib/payment-workflows";

const CONFLICT = "midtrans_capacity_conflict";
const RESOLVED = "provider_refunded";

function payloadObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Single durable incident per booking; the booking row lock prevents duplicate alerts. */
export async function queueMidtransCapacityConflict(input: {
  bookingId: string;
  providerReference: string;
  amount: number;
  providerPaymentType: unknown;
}): Promise<{ created: boolean; operationId: string | null }> {
  const queued = await db.transaction(async (tx) => {
    const [booking] = await tx.select({
      id: expeditionBookings.id,
      currency: expeditionBookings.currency,
      amount: expeditionBookings.totalAmount,
      userId: expeditionBookings.userId,
      contactEmail: expeditionBookings.contactEmail,
      bookingCode: expeditionBookings.bookingCode,
      status: expeditionBookings.status
    }).from(expeditionBookings).where(eq(expeditionBookings.id, input.bookingId))
      .limit(1).for("update");
    if (!booking || booking.status === "confirmed" || booking.currency !== "IDR" ||
        Number(booking.amount) !== input.amount || !Number.isSafeInteger(input.amount)) {
      throw new Error("Cannot queue compensation for an invalid booking.");
    }
    const [existing] = await tx.select({ id: paymentOperations.id }).from(paymentOperations)
      .where(and(eq(paymentOperations.bookingId, input.bookingId), eq(paymentOperations.operationType, CONFLICT)))
      .limit(1);
    if (existing) return { created: false, operationId: existing.id, email: booking.contactEmail, code: booking.bookingCode, userId: booking.userId };

    const [payment] = await tx.select({ id: expeditionBookingPayments.id }).from(expeditionBookingPayments)
      .where(and(eq(expeditionBookingPayments.bookingId, booking.id),
        eq(expeditionBookingPayments.provider, "midtrans"),
        eq(expeditionBookingPayments.providerReference, input.providerReference))).limit(1);
    if (!payment) throw new Error("Cannot compensate an unknown Midtrans provider order.");

    const [operation] = await tx.insert(paymentOperations).values({
      operationCode: "TRB-COMP-" + randomUUID(),
      operationType: CONFLICT, entityType: "expedition_booking",
      bookingId: booking.id, requestedByUserId: booking.userId,
      provider: "midtrans", providerReference: input.providerReference,
      status: "pending", amount: String(input.amount), currency: "IDR",
      reason: "Captured payment without an available seat: refund or operator resolution required.",
      metadata: {
        refundKey: midtransRefundKey(booking.id),
        paymentType: typeof input.providerPaymentType === "string" ? input.providerPaymentType : null,
        createdAt: new Date().toISOString()
      }
    }).returning({ id: paymentOperations.id });
    return { created: true, operationId: operation.id, email: booking.contactEmail, code: booking.bookingCode, userId: booking.userId };
  });

  if (queued.created) {
    const support = process.env.SUPPORT_EMAIL?.trim();
    const target = support && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support) ? support : null;
    // Notification failures remain visible in email_logs and must not delete the incident.
    try {
      if (target) {
        await sendTransactionalEmail({
          recipientEmail: target, subject: "URGENT Terumbu: expedition paid with no seats",
          template: "midtrans_capacity_conflict_operator",
          payload: { bookingCode: queued.code, operationId: queued.operationId, providerReference: input.providerReference,
            amount: input.amount, currency: "IDR", resolution: "Review compensation queue; no seat confirmed." }
        });
      } else {
        console.error("Midtrans capacity conflict needs operator attention; SUPPORT_EMAIL is missing.");
      }
      await sendTransactionalEmail({
        userId: queued.userId, recipientEmail: queued.email,
        subject: "Terumbu expedition: payment needs resolution",
        template: "midtrans_capacity_conflict_customer",
        payload: { bookingCode: queued.code,
          message: "We received your payment but cannot confirm the requested seats. Our team is reviewing a refund or alternative departure. Please do not pay again." }
      });
    } catch {
      console.error("Unable to enqueue Midtrans conflict notification.");
    }
  }
  return { created: queued.created, operationId: queued.operationId };
}

type CompensationOutcome = "not_found" | "disabled" | "pending" | "in_progress" | "submitted" |
  "provider_refunded" | "manual_review" | "not_eligible";

/**
 * GET Status is authoritative. Never send another provider POST after an
 * uncertain outcome; retain the same refund key and escalate for reconciliation.
 */
export async function reconcileMidtransCompensation(bookingId: string): Promise<CompensationOutcome> {
  const config = midtransConfiguration();
  if (!config) return "disabled";
  const [candidate] = await db.select({
    id: paymentOperations.id,
    status: paymentOperations.status,
    updatedAt: paymentOperations.updatedAt,
    metadata: paymentOperations.metadata,
    providerReference: paymentOperations.providerReference,
    amount: paymentOperations.amount,
    bookingStatus: expeditionBookings.status,
    bookingPaymentStatus: expeditionBookings.paymentStatus,
    bookingAmount: expeditionBookings.totalAmount,
    bookingCurrency: expeditionBookings.currency
  }).from(paymentOperations).innerJoin(expeditionBookings, eq(paymentOperations.bookingId, expeditionBookings.id))
    .where(and(eq(paymentOperations.bookingId, bookingId), eq(paymentOperations.operationType, CONFLICT)))
    .limit(1);
  if (!candidate) return "not_found";
  if (candidate.status === RESOLVED) return "provider_refunded";
  if (candidate.status === "manual_review") return "manual_review";
  if (candidate.bookingStatus === "confirmed" || candidate.bookingCurrency !== "IDR" ||
      candidate.amount == null || Number(candidate.amount) !== Number(candidate.bookingAmount) ||
      !candidate.providerReference) return "not_eligible";

  let provider;
  try {
    provider = await fetchMidtransTransactionStatus(config, candidate.providerReference);
  } catch {
    // An unavailable GET Status must never produce a refund POST.
    console.error("Compensation provider status is unavailable.");
    return "pending";
  }
  const amount = Number(candidate.bookingAmount);
  if (provider.order_id !== candidate.providerReference ||
      midtransIdrAmount(provider.gross_amount) !== amount) {
    await db.update(paymentOperations).set({
      status: "manual_review", updatedAt: new Date(),
      metadata: { ...payloadObject(candidate.metadata), reason: "provider_amount_mismatch" }
    }).where(eq(paymentOperations.id, candidate.id));
    return "manual_review";
  }

  if (provider.transaction_status === "refund" || provider.transaction_status === "chargeback") {
    await db.transaction(async (tx) => {
      const [booking] = await tx.select({ status: expeditionBookings.status, paymentStatus: expeditionBookings.paymentStatus })
        .from(expeditionBookings).where(eq(expeditionBookings.id, bookingId)).limit(1).for("update");
      if (!booking || booking.status === "confirmed") return;
      if (booking.paymentStatus !== "refunded") {
        await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
          bookingId, nextStatus: "refunded", providerReference: candidate.providerReference,
          operationType: "midtrans_compensation_provider_refunded",
          providerPayload: { verifiedAt: new Date().toISOString(), providerStatus: provider.transaction_status }
        });
      }
      await tx.update(paymentOperations).set({
        status: RESOLVED, processedAt: new Date(), updatedAt: new Date(),
        metadata: { ...payloadObject(candidate.metadata), providerStatus: provider.transaction_status }
      }).where(eq(paymentOperations.id, candidate.id));
    });
    return "provider_refunded";
  }
  if (candidate.status === "refund_submitted") return "submitted";
  if (candidate.status === "requesting") {
    // An interrupted/unknown provider call is *not* automatically repeated.
    if (candidate.updatedAt < new Date(Date.now() - 15 * 60_000)) {
      await db.update(paymentOperations).set({
        status: "manual_review", updatedAt: new Date(),
        metadata: { ...payloadObject(candidate.metadata), reason: "unknown_refund_outcome" }
      }).where(and(eq(paymentOperations.id, candidate.id), eq(paymentOperations.status, "requesting")));
      return "manual_review";
    }
    return "in_progress";
  }
  if (candidate.status !== "pending") return "not_eligible";
  if (!midtransAutoRefundEnabled(config)) return "disabled";
  if (!midtransRefundEligible(provider, amount)) {
    await db.update(paymentOperations).set({
      status: "manual_review", updatedAt: new Date(),
      metadata: { ...payloadObject(candidate.metadata), reason: "unsupported_or_unsettled_method",
        providerStatus: provider.transaction_status }
    }).where(and(eq(paymentOperations.id, candidate.id), eq(paymentOperations.status, "pending")));
    return "manual_review";
  }

  const [claimed] = await db.update(paymentOperations).set({
    status: "requesting", updatedAt: new Date()
  }).where(and(eq(paymentOperations.id, candidate.id), eq(paymentOperations.status, "pending")))
    .returning({ id: paymentOperations.id });
  if (!claimed) return "in_progress";
  try {
    await requestMidtransFullRefund(config, {
      orderId: candidate.providerReference,
      refundKey: midtransRefundKey(bookingId),
      amount
    });
    await db.update(paymentOperations).set({
      status: "refund_submitted", updatedAt: new Date(),
      metadata: { ...payloadObject(candidate.metadata), requestedAt: new Date().toISOString() }
    }).where(and(eq(paymentOperations.id, candidate.id), eq(paymentOperations.status, "requesting")));
    return "submitted";
  } catch {
    // A timeout might mean the provider accepted the refund: never generate
    // a new key or blindly retry POST. Operators can reconcile by GET Status.
    await db.update(paymentOperations).set({
      status: "manual_review", updatedAt: new Date(),
      metadata: { ...payloadObject(candidate.metadata), reason: "refund_request_uncertain" }
    }).where(and(eq(paymentOperations.id, candidate.id), eq(paymentOperations.status, "requesting")));
    console.error("Midtrans refund attempt requires manual reconciliation.");
    return "manual_review";
  }
}

export async function processDueMidtransCompensations() {
  if (!midtransConfiguration()) return { processed: 0, disabled: true };
  const rows = await db.select({ bookingId: paymentOperations.bookingId })
    .from(paymentOperations)
    .where(and(eq(paymentOperations.operationType, CONFLICT),
      inArray(paymentOperations.status, ["pending", "refund_submitted", "requesting"])))
    .limit(25);
  const results: Record<string, number> = {};
  for (const row of rows) {
    if (!row.bookingId) continue;
    const outcome = await reconcileMidtransCompensation(row.bookingId);
    results[outcome] = (results[outcome] ?? 0) + 1;
  }
  return { processed: rows.length, results, disabled: false };
}
