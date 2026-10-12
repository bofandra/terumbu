import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { donations, expeditionBookingPayments, expeditionBookings, paymentOperations, paymentTransactions } from "@/db/schema";
import { queueMidtransCapacityConflict, reconcileMidtransCompensation } from "@/lib/midtrans-compensations";
import { verifiedExpeditionGrossMatches } from "@/lib/midtrans-expedition";
import { midtransIdrAmount, midtransPaymentState, type MidtransStatusPayload } from "@/lib/midtrans";
import { transitionDonationPayment, transitionExpeditionBookingPayment } from "@/lib/payment-workflows";

export type MidtransSettlementResult = {
  type: "donation" | "expedition" | "unknown";
  status: "updated" | "unchanged" | "mismatch" | "capacity_unavailable" | "manual_review" | "unknown";
};

/**
 * Apply an independently retrieved provider GET Status result. Both signed
 * webhooks and the missing-notification worker use this same transition path.
 * Never pass a browser return/callback payload into this function.
 */
export async function applyVerifiedMidtransStatus(
  orderId: string,
  current: MidtransStatusPayload,
  operationType: "midtrans_webhook" | "midtrans_reconciled" = "midtrans_webhook"
): Promise<MidtransSettlementResult> {
  const amount = midtransIdrAmount(current.gross_amount);
  if (current.order_id !== orderId || amount === null) {
    return { type: "unknown", status: "mismatch" };
  }
  const [payment] = await db.select({ donationId: paymentTransactions.donationId })
    .from(paymentTransactions)
    .where(and(eq(paymentTransactions.provider, "midtrans"), eq(paymentTransactions.providerReference, orderId)))
    .limit(1);
  const [expeditionPayment] = payment?.donationId ? [] : await db.select({ bookingId: expeditionBookingPayments.bookingId })
    .from(expeditionBookingPayments)
    .where(and(eq(expeditionBookingPayments.provider, "midtrans"), eq(expeditionBookingPayments.providerReference, orderId)))
    .limit(1);
  if (!payment?.donationId && !expeditionPayment?.bookingId) {
    return { type: "unknown", status: "unknown" };
  }
  const type = expeditionPayment?.bookingId ? "expedition" : "donation";
  const status = midtransPaymentState(current);
  if (!status) return { type, status: "manual_review" };

  if (expeditionPayment?.bookingId) {
    const bookingId = expeditionPayment.bookingId;
    let result: "mismatch" | "unchanged" | "updated" | "capacity_unavailable";
    try {
      result = await db.transaction(async (tx) => {
        const [booking] = await tx.select({
          id: expeditionBookings.id,
          amount: expeditionBookings.totalAmount,
          currency: expeditionBookings.currency,
          status: expeditionBookings.status,
          paymentStatus: expeditionBookings.paymentStatus
        }).from(expeditionBookings).where(eq(expeditionBookings.id, bookingId)).limit(1).for("update");
        if (!booking || !verifiedExpeditionGrossMatches(booking.currency, Number(booking.amount), amount)) {
          return "mismatch" as const;
        }
        if (booking.paymentStatus === status ||
            (booking.paymentStatus === "refunded" && status !== "refunded")) {
          return "unchanged" as const;
        }
        if (status === "paid") {
          const [conflict] = await tx.select({ id: paymentOperations.id }).from(paymentOperations)
            .where(and(eq(paymentOperations.bookingId, bookingId),
              eq(paymentOperations.operationType, "midtrans_capacity_conflict"))).limit(1);
          if (conflict || booking.status === "cancelled") return "capacity_unavailable" as const;
        }
        const updated = await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
          bookingId,
          nextStatus: status,
          providerReference: orderId,
          providerPayload: {
            method: "midtrans_snap",
            providerTransactionId: typeof current.transaction_id === "string" ? current.transaction_id : null,
            providerStatus: current.transaction_status,
            verifiedAt: new Date().toISOString()
          },
          operationType
        });
        return updated ? "updated" as const : "mismatch" as const;
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "EXPEDITION_CAPACITY_UNAVAILABLE") throw error;
      result = "capacity_unavailable";
    }
    if (result === "capacity_unavailable") {
      await queueMidtransCapacityConflict({
        bookingId, providerReference: orderId, amount, providerPaymentType: current.payment_type
      });
      // This is deliberately a separate, feature-gated financial action.
      // The permanent case exists even if this provider call is unavailable.
      try {
        await reconcileMidtransCompensation(bookingId);
      } catch {
        console.error("Midtrans compensation reconciliation failed after durable incident creation.");
      }
    }
    return { type: "expedition", status: result };
  }

  const result = await db.transaction(async (tx) => {
    const [donation] = await tx.select({
      id: donations.id,
      amount: donations.amount,
      currency: donations.currency,
      status: donations.status
    }).from(donations).where(eq(donations.id, payment!.donationId!)).limit(1).for("update");
    if (!donation || donation.currency !== "IDR" || Number(donation.amount) !== amount) {
      return "mismatch" as const;
    }
    if (donation.status === status || (donation.status === "refunded" && status !== "refunded")) {
      return "unchanged" as const;
    }
    const updated = await transitionDonationPayment(tx as unknown as typeof db, {
      donationId: donation.id,
      nextStatus: status,
      providerReference: orderId,
      providerPayload: {
        method: "midtrans_snap",
        providerTransactionId: typeof current.transaction_id === "string" ? current.transaction_id : null,
        providerStatus: current.transaction_status,
        providerFraudStatus: typeof current.fraud_status === "string" ? current.fraud_status : null,
        providerPaymentType: typeof current.payment_type === "string" ? current.payment_type : null,
        verifiedAt: new Date().toISOString()
      },
      operationType
    });
    return updated ? "updated" as const : "mismatch" as const;
  });
  return { type: "donation", status: result };
}
