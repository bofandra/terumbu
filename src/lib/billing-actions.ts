"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  donationSubscriptions,
  donations,
  expeditionBookings,
  paymentOperations,
  paymentTransactions,
  userPaymentMethods
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { normalizeCardLast4 } from "@/lib/checkout";
import { sendTransactionalEmail } from "@/lib/email";
import {
  ensureUserPaymentMethod,
  recordPaymentOperation,
  transitionDonationPayment,
  transitionExpeditionBookingPayment
} from "@/lib/payment-workflows";

function randomReference(prefix: string) {
  return `${prefix}-${new Date().getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function redirectToDashboardDonations() {
  redirect("/dashboard/donations?saved=billing");
}

export async function createPaymentMethodAction(formData: FormData) {
  const user = await requireUser("/dashboard/donations");
  const label = String(formData.get("label") ?? "").trim() || "Demo payment method";
  const brand = String(formData.get("brand") ?? "").trim() || "Demo Card";
  const last4 = normalizeCardLast4(formData.get("last4") ?? "4242");
  const makeDefault = formData.get("makeDefault") === "on";
  const now = new Date();

  await db.transaction(async (tx) => {
    const paymentMethodId = await ensureUserPaymentMethod(tx as unknown as typeof db, {
      userId: user.id,
      label,
      brand,
      last4,
      makeDefault,
      now
    });

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "payment_method_added",
      entityType: "payment_method",
      requestedByUserId: user.id,
      processedByUserId: user.id,
      status: "completed",
      metadata: {
        paymentMethodId,
        brand,
        last4
      },
      processedAt: now,
      now
    });
  });

  redirectToDashboardDonations();
}

export async function setDefaultPaymentMethodAction(formData: FormData) {
  const user = await requireUser("/dashboard/donations");
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "");
  const now = new Date();

  const [paymentMethod] = await db
    .select({ id: userPaymentMethods.id })
    .from(userPaymentMethods)
    .where(and(eq(userPaymentMethods.id, paymentMethodId), eq(userPaymentMethods.userId, user.id), eq(userPaymentMethods.status, "active")))
    .limit(1);

  if (!paymentMethod) {
    redirect("/dashboard/donations?error=payment_method");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(userPaymentMethods)
      .set({
        isDefault: false,
        updatedAt: now
      })
      .where(eq(userPaymentMethods.userId, user.id));

    await tx
      .update(userPaymentMethods)
      .set({
        isDefault: true,
        updatedAt: now
      })
      .where(eq(userPaymentMethods.id, paymentMethod.id));

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "payment_method_defaulted",
      entityType: "payment_method",
      requestedByUserId: user.id,
      processedByUserId: user.id,
      status: "completed",
      metadata: { paymentMethodId: paymentMethod.id },
      processedAt: now,
      now
    });
  });

  redirectToDashboardDonations();
}

export async function archivePaymentMethodAction(formData: FormData) {
  const user = await requireUser("/dashboard/donations");
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "");
  const now = new Date();

  const [paymentMethod] = await db
    .select({ id: userPaymentMethods.id })
    .from(userPaymentMethods)
    .where(and(eq(userPaymentMethods.id, paymentMethodId), eq(userPaymentMethods.userId, user.id)))
    .limit(1);

  if (!paymentMethod) {
    redirect("/dashboard/donations?error=payment_method");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(userPaymentMethods)
      .set({
        status: "archived",
        isDefault: false,
        updatedAt: now
      })
      .where(eq(userPaymentMethods.id, paymentMethod.id));

    await tx
      .update(donationSubscriptions)
      .set({
        paymentMethodId: null,
        updatedAt: now
      })
      .where(eq(donationSubscriptions.paymentMethodId, paymentMethod.id));

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "payment_method_archived",
      entityType: "payment_method",
      requestedByUserId: user.id,
      processedByUserId: user.id,
      status: "completed",
      metadata: { paymentMethodId: paymentMethod.id },
      processedAt: now,
      now
    });
  });

  redirectToDashboardDonations();
}

export async function cancelSubscriptionAction(formData: FormData) {
  const user = await requireUser("/dashboard/donations");
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const now = new Date();

  const [subscription] = await db
    .select({
      id: donationSubscriptions.id,
      amount: donationSubscriptions.amount,
      currency: donationSubscriptions.currency,
      status: donationSubscriptions.status
    })
    .from(donationSubscriptions)
    .where(and(eq(donationSubscriptions.id, subscriptionId), eq(donationSubscriptions.userId, user.id)))
    .limit(1);

  if (!subscription) {
    redirect("/dashboard/donations?error=subscription");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(donationSubscriptions)
      .set({
        status: "cancelled",
        cancelledAt: now,
        nextBillingAt: null,
        updatedAt: now
      })
      .where(eq(donationSubscriptions.id, subscription.id));

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "subscription_cancelled",
      entityType: "subscription",
      subscriptionId: subscription.id,
      requestedByUserId: user.id,
      processedByUserId: user.id,
      status: "completed",
      amount: subscription.amount,
      currency: subscription.currency,
      metadata: {
        previousStatus: subscription.status,
        nextStatus: "cancelled"
      },
      processedAt: now,
      now
    });
  });

  redirectToDashboardDonations();
}

export async function retryDonationPaymentAction(formData: FormData) {
  const user = await requireUser("/dashboard/donations");
  const donationId = String(formData.get("donationId") ?? "");
  const providerReference = randomReference("DEMO-RETRY-DONATION");
  const now = new Date();

  const [donation] = await db
    .select({
      id: donations.id,
      userId: donations.userId,
      donorEmail: donations.donorEmail,
      status: donations.status
    })
    .from(donations)
    .where(and(eq(donations.id, donationId), eq(donations.userId, user.id)))
    .limit(1);

  if (!donation || donation.status === "paid" || donation.status === "refunded") {
    redirect("/dashboard/donations?error=retry");
  }

  let receiptNumber: string | null = null;

  await db.transaction(async (tx) => {
    await tx
      .update(paymentTransactions)
      .set({
        providerReference,
        status: "pending",
        updatedAt: now
      })
      .where(eq(paymentTransactions.donationId, donation.id));

    const result = await transitionDonationPayment(tx as unknown as typeof db, {
      donationId: donation.id,
      nextStatus: "paid",
      providerReference,
      providerPayload: {
        method: "demo_retry",
        retriedAt: now.toISOString()
      },
      processedByUserId: user.id,
      operationType: "retry",
      now
    });

    receiptNumber = result?.receiptCreated ? result.receiptNumber : null;
  });

  if (receiptNumber && donation.donorEmail) {
    await sendTransactionalEmail({
      userId: user.id,
      recipientEmail: donation.donorEmail,
      subject: "Your Terumbu donation receipt",
      template: "donation_receipt",
      payload: {
        receiptNumber,
        donationId: donation.id
      }
    });
  }

  redirectToDashboardDonations();
}

export async function requestDonationRefundAction(formData: FormData) {
  const user = await requireUser("/dashboard/donations");
  const donationId = String(formData.get("donationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "Refund requested from dashboard";
  const now = new Date();

  const [donation] = await db
    .select({
      id: donations.id,
      amount: donations.amount,
      currency: donations.currency,
      status: donations.status
    })
    .from(donations)
    .where(and(eq(donations.id, donationId), eq(donations.userId, user.id)))
    .limit(1);

  if (!donation || donation.status !== "paid") {
    redirect("/dashboard/donations?error=refund");
  }

  const [existingRequest] = await db
    .select({ id: paymentOperations.id })
    .from(paymentOperations)
    .where(and(eq(paymentOperations.donationId, donation.id), eq(paymentOperations.operationType, "refund"), eq(paymentOperations.status, "pending")))
    .limit(1);

  if (!existingRequest) {
    await recordPaymentOperation(db, {
      operationType: "refund",
      entityType: "donation",
      donationId: donation.id,
      requestedByUserId: user.id,
      status: "pending",
      amount: donation.amount,
      currency: donation.currency,
      reason,
      now
    });
  }

  redirectToDashboardDonations();
}

export async function retryExpeditionPaymentAction(formData: FormData) {
  const user = await requireUser("/dashboard/expeditions");
  const bookingId = String(formData.get("bookingId") ?? "");
  const providerReference = randomReference("DEMO-RETRY-EXPEDITION");
  const now = new Date();

  const [booking] = await db
    .select({
      id: expeditionBookings.id,
      paymentStatus: expeditionBookings.paymentStatus
    })
    .from(expeditionBookings)
    .where(and(eq(expeditionBookings.id, bookingId), eq(expeditionBookings.userId, user.id)))
    .limit(1);

  if (!booking || booking.paymentStatus === "paid" || booking.paymentStatus === "refunded") {
    redirect("/dashboard/expeditions?error=retry");
  }

  await db.transaction(async (tx) => {
    await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
      bookingId: booking.id,
      nextStatus: "paid",
      providerReference,
      providerPayload: {
        method: "demo_retry",
        retriedAt: now.toISOString()
      },
      processedByUserId: user.id,
      operationType: "retry",
      now
    });
  });

  redirect("/dashboard/expeditions?saved=billing");
}

export async function requestExpeditionRefundAction(formData: FormData) {
  const user = await requireUser("/dashboard/expeditions");
  const bookingId = String(formData.get("bookingId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "Expedition refund requested from dashboard";
  const now = new Date();

  const [booking] = await db
    .select({
      id: expeditionBookings.id,
      totalAmount: expeditionBookings.totalAmount,
      currency: expeditionBookings.currency,
      paymentStatus: expeditionBookings.paymentStatus
    })
    .from(expeditionBookings)
    .where(and(eq(expeditionBookings.id, bookingId), eq(expeditionBookings.userId, user.id)))
    .limit(1);

  if (!booking || booking.paymentStatus !== "paid") {
    redirect("/dashboard/expeditions?error=refund");
  }

  const [existingRequest] = await db
    .select({ id: paymentOperations.id })
    .from(paymentOperations)
    .where(and(eq(paymentOperations.bookingId, booking.id), eq(paymentOperations.operationType, "refund"), eq(paymentOperations.status, "pending")))
    .limit(1);

  if (!existingRequest) {
    await recordPaymentOperation(db, {
      operationType: "refund",
      entityType: "expedition_booking",
      bookingId: booking.id,
      requestedByUserId: user.id,
      status: "pending",
      amount: booking.totalAmount,
      currency: booking.currency,
      reason,
      now
    });
  }

  redirect("/dashboard/expeditions?saved=billing");
}
