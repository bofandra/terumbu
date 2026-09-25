"use server";

import { randomBytes } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  donationSubscriptions,
  donations,
  expeditionBookingPayments,
  expeditionBookings,
  expeditionDepartures,
  paymentOperations,
  paymentTransactions,
  userPaymentMethods
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  activeSubscriptionStatuses,
  canArchivePaymentMethod,
  canCancelSubscription,
  canUsePaymentMethodForSubscription,
  parseExpiryMonth,
  parseExpiryYear
} from "@/lib/billing-lifecycle";
import { normalizeCardLast4 } from "@/lib/checkout";
import { expeditionDepartureAvailability } from "@/lib/expedition-booking-lifecycle";
import {
  ensureUserPaymentMethod,
  recordPaymentOperation
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
  const expMonth = parseExpiryMonth(formData.get("expMonth"));
  const expYear = parseExpiryYear(formData.get("expYear"));
  const makeDefault = formData.get("makeDefault") === "on";
  const now = new Date();

  await db.transaction(async (tx) => {
    const paymentMethodId = await ensureUserPaymentMethod(tx as unknown as typeof db, {
      userId: user.id,
      label,
      brand,
      last4,
      expMonth,
      expYear,
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
    .select({
      id: userPaymentMethods.id,
      status: userPaymentMethods.status
    })
    .from(userPaymentMethods)
    .where(and(eq(userPaymentMethods.id, paymentMethodId), eq(userPaymentMethods.userId, user.id)))
    .limit(1);

  const [activeSubscription] = await db
    .select({ id: donationSubscriptions.id })
    .from(donationSubscriptions)
    .where(and(eq(donationSubscriptions.paymentMethodId, paymentMethodId), eq(donationSubscriptions.userId, user.id), inArray(donationSubscriptions.status, [...activeSubscriptionStatuses])))
    .limit(1);

  if (!paymentMethod || !canArchivePaymentMethod({ status: paymentMethod.status, activeSubscriptionCount: activeSubscription ? 1 : 0 })) {
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

  if (!subscription || !canCancelSubscription(subscription.status)) {
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

export async function updateSubscriptionPaymentMethodAction(formData: FormData) {
  const user = await requireUser("/dashboard/donations");
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "");
  const now = new Date();

  const [subscription] = await db
    .select({
      id: donationSubscriptions.id,
      amount: donationSubscriptions.amount,
      currency: donationSubscriptions.currency,
      status: donationSubscriptions.status,
      paymentMethodId: donationSubscriptions.paymentMethodId,
      providerSubscriptionReference: donationSubscriptions.providerSubscriptionReference
    })
    .from(donationSubscriptions)
    .where(and(eq(donationSubscriptions.id, subscriptionId), eq(donationSubscriptions.userId, user.id)))
    .limit(1);

  const [paymentMethod] = await db
    .select({
      id: userPaymentMethods.id,
      status: userPaymentMethods.status,
      expMonth: userPaymentMethods.expMonth,
      expYear: userPaymentMethods.expYear
    })
    .from(userPaymentMethods)
    .where(and(eq(userPaymentMethods.id, paymentMethodId), eq(userPaymentMethods.userId, user.id)))
    .limit(1);

  if (!subscription || !canCancelSubscription(subscription.status) || !paymentMethod || !canUsePaymentMethodForSubscription(paymentMethod, now)) {
    redirect("/dashboard/donations?error=payment_method");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(donationSubscriptions)
      .set({
        paymentMethodId: paymentMethod.id,
        updatedAt: now
      })
      .where(eq(donationSubscriptions.id, subscription.id));

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "subscription_payment_method_updated",
      entityType: "subscription",
      subscriptionId: subscription.id,
      requestedByUserId: user.id,
      processedByUserId: user.id,
      status: "completed",
      amount: subscription.amount,
      currency: subscription.currency,
      providerReference: subscription.providerSubscriptionReference,
      metadata: {
        previousPaymentMethodId: subscription.paymentMethodId,
        paymentMethodId: paymentMethod.id,
        subscriptionStatus: subscription.status
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
  const providerReference = randomReference("MANUAL-RECHECK-DONATION");
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

  if (!donation || donation.status === "paid" || donation.status === "refunded") {
    redirect("/dashboard/donations?error=retry");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(paymentTransactions)
      .set({
        providerReference,
        status: "pending",
        updatedAt: now
      })
      .where(eq(paymentTransactions.donationId, donation.id));

    await tx
      .update(donations)
      .set({ status: "pending" })
      .where(eq(donations.id, donation.id));

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "payment_recheck_requested",
      entityType: "donation",
      donationId: donation.id,
      requestedByUserId: user.id,
      status: "pending",
      amount: donation.amount,
      currency: donation.currency,
      provider: "manual_external",
      providerReference,
      reason: "User requested manual payment recheck.",
      metadata: {
        previousStatus: donation.status,
        nextStatus: "pending",
        source: "dashboard"
      },
      now
    });
  });

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
  const providerReference = randomReference("MANUAL-RECHECK-EXPEDITION");
  const now = new Date();

  const [booking] = await db
    .select({
      id: expeditionBookings.id,
      totalAmount: expeditionBookings.totalAmount,
      currency: expeditionBookings.currency,
      paymentStatus: expeditionBookings.paymentStatus,
      participantsCount: expeditionBookings.participantsCount,
      departureStatus: expeditionDepartures.status,
      capacity: expeditionDepartures.capacity,
      seatsBooked: expeditionDepartures.seatsBooked,
      departureMetadata: expeditionDepartures.metadata
    })
    .from(expeditionBookings)
    .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
    .where(and(eq(expeditionBookings.id, bookingId), eq(expeditionBookings.userId, user.id)))
    .limit(1);

  if (!booking || booking.paymentStatus === "paid" || booking.paymentStatus === "refunded") {
    redirect("/dashboard/expeditions?error=retry");
  }

  const availability = expeditionDepartureAvailability(
    {
      status: booking.departureStatus,
      capacity: booking.capacity,
      seatsBooked: booking.seatsBooked,
      minParticipants: Number((booking.departureMetadata as Record<string, unknown> | null)?.minParticipants ?? 6)
    },
    booking.participantsCount
  );

  if (!availability.canBook) {
    redirect("/dashboard/expeditions?error=availability");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(expeditionBookingPayments)
      .set({
        provider: "manual_external",
        providerReference,
        status: "pending",
        payload: {
          method: "manual_recheck",
          requestedAt: now.toISOString()
        },
        updatedAt: now
      })
      .where(eq(expeditionBookingPayments.bookingId, booking.id));

    await tx
      .update(expeditionBookings)
      .set({
        paymentStatus: "pending",
        status: "pending_payment",
        confirmedAt: null
      })
      .where(eq(expeditionBookings.id, booking.id));

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "payment_recheck_requested",
      entityType: "expedition_booking",
      bookingId: booking.id,
      requestedByUserId: user.id,
      status: "pending",
      amount: booking.totalAmount,
      currency: booking.currency,
      provider: "manual_external",
      providerReference,
      reason: "User requested manual booking payment recheck.",
      metadata: {
        previousStatus: booking.paymentStatus,
        nextStatus: "pending",
        source: "dashboard"
      },
      now
    });
  });

  redirect("/dashboard/expeditions?saved=payment-recheck");
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
