import { randomBytes } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  campaigns,
  donationReceipts,
  donations,
  donationSubscriptions,
  expeditionBookingPayments,
  expeditionBookings,
  expeditionDepartures,
  expeditions,
  impactPassportItems,
  impactPassports,
  impactSites,
  paymentOperations,
  paymentTransactions,
  sponsoredEcosystems,
  userPaymentMethods
} from "@/db/schema";
import {
  buildPaymentMethodReference,
  buildPaymentOperationCode,
  buildReceiptNumber,
  buildSponsoredEcosystemCode,
  buildSubscriptionReference,
  nextMonthlyBillingDate,
  normalizeCardLast4
} from "@/lib/checkout";
import { getMetadataNumber, getMetadataString, toNumber } from "@/lib/domain";
import { departureStatusAfterSeatChange } from "@/lib/expedition-booking-lifecycle";
import { formatCurrency } from "@/lib/utils";

export type ManagedPaymentStatus = "created" | "pending" | "paid" | "failed" | "expired" | "refunded";

type DatabaseLike = typeof db;

function payloadObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function operationCode() {
  return buildPaymentOperationCode(randomBytes(5).toString("hex").toUpperCase());
}

export function paymentStatusFromValue(value: FormDataEntryValue | string | null | undefined, fallback: ManagedPaymentStatus = "paid") {
  const status = String(value ?? fallback);

  return ["created", "pending", "paid", "failed", "expired", "refunded"].includes(status)
    ? (status as ManagedPaymentStatus)
    : fallback;
}

export function subscriptionStatusForPayment(status: ManagedPaymentStatus) {
  if (status === "paid") {
    return "active";
  }

  if (status === "refunded") {
    return "cancelled";
  }

  return "past_due";
}

export async function recordPaymentOperation(
  database: DatabaseLike,
  input: {
    operationType: string;
    entityType: string;
    donationId?: string | null;
    bookingId?: string | null;
    subscriptionId?: string | null;
    requestedByUserId?: string | null;
    processedByUserId?: string | null;
    status?: string;
    amount?: number | string | null;
    currency?: string;
    provider?: string;
    providerReference?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    processedAt?: Date | null;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();

  await database.insert(paymentOperations).values({
    operationCode: operationCode(),
    operationType: input.operationType,
    entityType: input.entityType,
    donationId: input.donationId ?? null,
    bookingId: input.bookingId ?? null,
    subscriptionId: input.subscriptionId ?? null,
    requestedByUserId: input.requestedByUserId ?? null,
    processedByUserId: input.processedByUserId ?? null,
    status: input.status ?? "pending",
    amount: input.amount == null ? null : String(input.amount),
    currency: input.currency ?? "IDR",
    provider: input.provider ?? "demo_gateway",
    providerReference: input.providerReference ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? null,
    processedAt: input.processedAt ?? null,
    updatedAt: now
  });
}

export async function ensureUserPaymentMethod(
  database: DatabaseLike,
  input: {
    userId: string | null | undefined;
    label?: string | null;
    brand?: string | null;
    last4?: string | number | null;
    expMonth?: number | null;
    expYear?: number | null;
    makeDefault?: boolean;
    now?: Date;
  }
) {
  if (!input.userId) {
    return null;
  }

  const now = input.now ?? new Date();
  const last4 = normalizeCardLast4(input.last4 ?? "4242");
  const providerPaymentMethodId = buildPaymentMethodReference(`${input.userId.slice(0, 8)}-${last4}`);
  const [defaultMethod] = await database
    .select({ id: userPaymentMethods.id })
    .from(userPaymentMethods)
    .where(and(eq(userPaymentMethods.userId, input.userId), eq(userPaymentMethods.isDefault, true), eq(userPaymentMethods.status, "active")))
    .limit(1);
  const shouldDefault = input.makeDefault || !defaultMethod;

  if (shouldDefault) {
    await database
      .update(userPaymentMethods)
      .set({
        isDefault: false,
        updatedAt: now
      })
      .where(eq(userPaymentMethods.userId, input.userId));
  }

  const [paymentMethod] = await database
    .insert(userPaymentMethods)
    .values({
      userId: input.userId,
      provider: "demo_gateway",
      providerPaymentMethodId,
      label: input.label || `${input.brand || "Demo Card"} ending ${last4}`,
      brand: input.brand || "Demo Card",
      last4,
      expMonth: input.expMonth ?? 12,
      expYear: input.expYear ?? now.getUTCFullYear() + 3,
      isDefault: shouldDefault,
      status: "active",
      metadata: {
        source: "demo_payment_method"
      },
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [userPaymentMethods.provider, userPaymentMethods.providerPaymentMethodId],
      set: {
        label: input.label || `${input.brand || "Demo Card"} ending ${last4}`,
        brand: input.brand || "Demo Card",
        expMonth: input.expMonth ?? 12,
        expYear: input.expYear ?? now.getUTCFullYear() + 3,
        isDefault: shouldDefault ? true : sql`${userPaymentMethods.isDefault}`,
        status: "active",
        updatedAt: now
      }
    })
    .returning({ id: userPaymentMethods.id });

  return paymentMethod?.id ?? null;
}

async function ensureMonthlySubscription(
  database: DatabaseLike,
  input: {
    campaignId: string;
    userId: string | null;
    paymentMethodId: string | null;
    donorName: string;
    donorEmail: string;
    amount: string | number;
    currency: string;
    providerReference: string;
    status: ManagedPaymentStatus;
    now: Date;
  }
) {
  const providerSubscriptionReference = buildSubscriptionReference(input.providerReference, input.now);
  const subscriptionStatus = subscriptionStatusForPayment(input.status);
  const [subscription] = await database
    .insert(donationSubscriptions)
    .values({
      campaignId: input.campaignId,
      userId: input.userId,
      paymentMethodId: input.paymentMethodId,
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      amount: String(input.amount),
      currency: input.currency,
      interval: "month",
      status: subscriptionStatus,
      provider: "demo_gateway",
      providerSubscriptionReference,
      startedAt: input.status === "paid" ? input.now : null,
      nextBillingAt: input.status === "paid" ? nextMonthlyBillingDate(input.now) : null,
      cancelledAt: input.status === "refunded" ? input.now : null,
      metadata: {
        source: "monthly_checkout",
        initialProviderReference: input.providerReference
      },
      updatedAt: input.now
    })
    .onConflictDoUpdate({
      target: [donationSubscriptions.provider, donationSubscriptions.providerSubscriptionReference],
      set: {
        paymentMethodId: input.paymentMethodId,
        status: subscriptionStatus,
        startedAt: input.status === "paid" ? input.now : null,
        nextBillingAt: input.status === "paid" ? nextMonthlyBillingDate(input.now) : null,
        cancelledAt: input.status === "refunded" ? input.now : null,
        updatedAt: input.now
      }
    })
    .returning({ id: donationSubscriptions.id });

  return subscription.id;
}

async function receiptForDonation(
  database: DatabaseLike,
  donation: {
    id: string;
    campaignTitle: string;
    amount: string;
    currency: string;
  },
  providerReference: string,
  payload: Record<string, unknown>,
  now: Date
) {
  const [existingReceipt] = await database
    .select({ receiptNumber: donationReceipts.receiptNumber })
    .from(donationReceipts)
    .where(eq(donationReceipts.donationId, donation.id))
    .limit(1);

  if (existingReceipt) {
    return {
      receiptNumber: existingReceipt.receiptNumber,
      created: false
    };
  }

  const receiptNumber = buildReceiptNumber(providerReference, now);

  await database.insert(donationReceipts).values({
    donationId: donation.id,
    receiptNumber,
    issuedAt: now,
    emailedAt: now,
    payload: {
      campaign: donation.campaignTitle,
      amount: toNumber(donation.amount),
      currency: donation.currency,
      providerReference,
      ...payload
    }
  });

  return {
    receiptNumber,
    created: true
  };
}

async function ensureDonationPassportItem(
  database: DatabaseLike,
  donation: {
    id: string;
    userId: string | null;
    campaignTitle: string;
    campaignSlug: string;
    amount: string;
    currency: string;
    createdAt: Date;
  },
  metadata: Record<string, unknown>
) {
  if (!donation.userId) {
    return;
  }

  const [passport] = await database
    .select({ id: impactPassports.id })
    .from(impactPassports)
    .where(eq(impactPassports.userId, donation.userId))
    .limit(1);

  if (!passport) {
    return;
  }

  await database
    .insert(impactPassportItems)
    .values({
      passportId: passport.id,
      sourceType: "donation",
      sourceId: donation.id,
      itemType: "donation",
      title: `Supported ${donation.campaignTitle}`,
      description: `Donated ${formatCurrency(toNumber(donation.amount))} to ${donation.campaignTitle}.`,
      occurredAt: donation.createdAt,
      metadata: {
        campaignSlug: donation.campaignSlug,
        amount: toNumber(donation.amount),
        currency: donation.currency,
        ...metadata
      }
    })
    .onConflictDoNothing({
      target: [impactPassportItems.passportId, impactPassportItems.sourceType, impactPassportItems.sourceId]
    });
}

async function deleteDonationPassportItem(database: DatabaseLike, donationId: string) {
  await database.delete(impactPassportItems).where(and(eq(impactPassportItems.sourceType, "donation"), eq(impactPassportItems.sourceId, donationId)));
}

async function ensureSponsoredEcosystemForDonation(
  database: DatabaseLike,
  donation: {
    id: string;
    userId: string | null;
    campaignId: string;
    donorName: string | null;
    amount: string;
    currency: string;
  },
  providerReference: string,
  payload: Record<string, unknown>,
  now: Date
) {
  const [existing] = await database
    .select({ id: sponsoredEcosystems.id })
    .from(sponsoredEcosystems)
    .where(eq(sponsoredEcosystems.donationId, donation.id))
    .limit(1);

  if (existing) {
    await database
      .update(sponsoredEcosystems)
      .set({
        status: "sponsored",
        lastUpdatedAt: now
      })
      .where(eq(sponsoredEcosystems.id, existing.id));
    return;
  }

  const [site] = await database
    .select({ id: impactSites.id })
    .from(impactSites)
    .where(eq(impactSites.campaignId, donation.campaignId))
    .limit(1);
  const fragments = getMetadataNumber(payload, "sponsoredFragments", Math.max(1, Math.round(toNumber(donation.amount) / 50_000)));

  await database
    .insert(sponsoredEcosystems)
    .values({
      campaignId: donation.campaignId,
      donationId: donation.id,
      impactSiteId: site?.id ?? null,
      userId: donation.userId,
      code: buildSponsoredEcosystemCode(providerReference, now),
      label: `${donation.donorName || "Anonymous"} coral sponsorship`,
      status: "sponsored",
      lastUpdatedAt: now,
      metadata: {
        donationId: donation.id,
        fragments,
        amount: toNumber(donation.amount),
        currency: donation.currency,
        contributionIntent: "coral"
      }
    })
    .onConflictDoNothing({
      target: sponsoredEcosystems.donationId
    });
}

async function reverseSponsoredEcosystemForDonation(database: DatabaseLike, donationId: string, status: ManagedPaymentStatus, now: Date) {
  await database
    .update(sponsoredEcosystems)
    .set({
      status: status === "refunded" ? "refunded" : "payment_reversed",
      lastUpdatedAt: now
    })
    .where(eq(sponsoredEcosystems.donationId, donationId));
}

export async function transitionDonationPayment(
  database: DatabaseLike,
  input: {
    donationId: string;
    nextStatus: ManagedPaymentStatus;
    providerReference?: string | null;
    paymentMethodId?: string | null;
    providerPayload?: Record<string, unknown>;
    processedByUserId?: string | null;
    operationType?: string;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  const [donation] = await database
    .select({
      id: donations.id,
      campaignId: donations.campaignId,
      userId: donations.userId,
      subscriptionId: donations.subscriptionId,
      donorName: donations.donorName,
      donorEmail: donations.donorEmail,
      amount: donations.amount,
      currency: donations.currency,
      previousStatus: donations.status,
      createdAt: donations.createdAt,
      campaignTitle: campaigns.title,
      campaignSlug: campaigns.slug,
      paymentMethodId: paymentTransactions.paymentMethodId,
      providerReference: paymentTransactions.providerReference,
      transactionPayload: paymentTransactions.payload
    })
    .from(donations)
    .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
    .leftJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
    .where(eq(donations.id, input.donationId))
    .orderBy(desc(paymentTransactions.updatedAt))
    .limit(1);

  if (!donation) {
    return null;
  }

  const providerReference = input.providerReference ?? donation.providerReference ?? donation.id;
  const transactionPayload = {
    ...payloadObject(donation.transactionPayload),
    ...payloadObject(input.providerPayload),
    status: input.nextStatus,
    statusAppliedAt: now.toISOString()
  };
  const contributionIntent = getMetadataString(transactionPayload, "contributionIntent") ?? "one-time";
  const paymentMethodId = input.paymentMethodId ?? donation.paymentMethodId ?? null;
  let subscriptionId = donation.subscriptionId;

  if (contributionIntent === "monthly" && subscriptionId) {
    await database
      .update(donationSubscriptions)
      .set({
        paymentMethodId,
        status: subscriptionStatusForPayment(input.nextStatus),
        startedAt: input.nextStatus === "paid" ? now : null,
        nextBillingAt: input.nextStatus === "paid" ? nextMonthlyBillingDate(now) : null,
        cancelledAt: input.nextStatus === "refunded" ? now : null,
        updatedAt: now
      })
      .where(eq(donationSubscriptions.id, subscriptionId));
  } else if (contributionIntent === "monthly") {
    subscriptionId = await ensureMonthlySubscription(database, {
      campaignId: donation.campaignId,
      userId: donation.userId,
      paymentMethodId,
      donorName: donation.donorName ?? "Anonymous supporter",
      donorEmail: donation.donorEmail ?? "unknown@terumbu.eco",
      amount: donation.amount,
      currency: donation.currency,
      providerReference,
      status: input.nextStatus,
      now
    });
  } else if (subscriptionId && input.nextStatus === "refunded") {
    await database
      .update(donationSubscriptions)
      .set({
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now
      })
      .where(eq(donationSubscriptions.id, subscriptionId));
  }

  await database
    .update(paymentTransactions)
    .set({
      paymentMethodId,
      status: input.nextStatus,
      payload: transactionPayload,
      updatedAt: now
    })
    .where(eq(paymentTransactions.donationId, donation.id));

  await database
    .update(donations)
    .set({
      status: input.nextStatus,
      subscriptionId
    })
    .where(eq(donations.id, donation.id));

  const wasPaid = donation.previousStatus === "paid";
  const isPaid = input.nextStatus === "paid";

  if (!wasPaid && isPaid) {
    await database
      .update(campaigns)
      .set({
        raisedAmount: sql`greatest(${campaigns.raisedAmount} + ${toNumber(donation.amount)}, 0)`,
        donorCount: sql`greatest(${campaigns.donorCount} + 1, 0)`,
        updatedAt: now
      })
      .where(eq(campaigns.id, donation.campaignId));
  }

  if (wasPaid && !isPaid) {
    await database
      .update(campaigns)
      .set({
        raisedAmount: sql`greatest(${campaigns.raisedAmount} - ${toNumber(donation.amount)}, 0)`,
        donorCount: sql`greatest(${campaigns.donorCount} - 1, 0)`,
        updatedAt: now
      })
      .where(eq(campaigns.id, donation.campaignId));
  }

  let receiptNumber: string | null = null;
  let receiptCreated = false;

  if (isPaid) {
    const receipt = await receiptForDonation(database, donation, providerReference, transactionPayload, now);
    receiptNumber = receipt.receiptNumber;
    receiptCreated = receipt.created;

    await ensureDonationPassportItem(database, donation, {
      receiptNumber,
      contributionIntent,
      subscriptionId,
      providerReference
    });

    if (contributionIntent === "coral") {
      await ensureSponsoredEcosystemForDonation(database, donation, providerReference, transactionPayload, now);
    }
  }

  if (wasPaid && !isPaid) {
    await deleteDonationPassportItem(database, donation.id);

    if (contributionIntent === "coral") {
      await reverseSponsoredEcosystemForDonation(database, donation.id, input.nextStatus, now);
    }
  }

  if (input.operationType) {
    await recordPaymentOperation(database, {
      operationType: input.operationType,
      entityType: "donation",
      donationId: donation.id,
      subscriptionId,
      processedByUserId: input.processedByUserId,
      status: "completed",
      amount: donation.amount,
      currency: donation.currency,
      providerReference,
      metadata: {
        previousStatus: donation.previousStatus,
        nextStatus: input.nextStatus,
        contributionIntent
      },
      processedAt: now,
      now
    });
  }

  return {
    donationId: donation.id,
    donorEmail: donation.donorEmail,
    campaignTitle: donation.campaignTitle,
    amount: toNumber(donation.amount),
    currency: donation.currency,
    receiptNumber,
    receiptCreated,
    previousStatus: donation.previousStatus,
    nextStatus: input.nextStatus,
    subscriptionId
  };
}

async function ensureExpeditionPassportItem(
  database: DatabaseLike,
  booking: {
    id: string;
    userId: string | null;
    expeditionTitle: string;
    expeditionSlug: string;
    bookedAt: Date;
    participantsCount: number;
  }
) {
  if (!booking.userId) {
    return;
  }

  const [passport] = await database
    .select({ id: impactPassports.id })
    .from(impactPassports)
    .where(eq(impactPassports.userId, booking.userId))
    .limit(1);

  if (!passport) {
    return;
  }

  await database
    .insert(impactPassportItems)
    .values({
      passportId: passport.id,
      sourceType: "expedition_booking",
      sourceId: booking.id,
      itemType: "expedition",
      title: `Booked ${booking.expeditionTitle}`,
      description: `${booking.participantsCount.toLocaleString("id-ID")} participant booking confirmed.`,
      occurredAt: booking.bookedAt,
      metadata: {
        expeditionSlug: booking.expeditionSlug,
        participantsCount: booking.participantsCount
      }
    })
    .onConflictDoNothing({
      target: [impactPassportItems.passportId, impactPassportItems.sourceType, impactPassportItems.sourceId]
    });
}

async function deleteExpeditionPassportItem(database: DatabaseLike, bookingId: string) {
  await database.delete(impactPassportItems).where(and(eq(impactPassportItems.sourceType, "expedition_booking"), eq(impactPassportItems.sourceId, bookingId)));
}

export async function transitionExpeditionBookingPayment(
  database: DatabaseLike,
  input: {
    bookingId: string;
    nextStatus: ManagedPaymentStatus;
    providerReference?: string | null;
    providerPayload?: Record<string, unknown>;
    processedByUserId?: string | null;
    operationType?: string;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  const [booking] = await database
    .select({
      id: expeditionBookings.id,
      userId: expeditionBookings.userId,
      departureId: expeditionBookings.departureId,
      departureStatus: expeditionDepartures.status,
      departureCapacity: expeditionDepartures.capacity,
      departureSeatsBooked: expeditionDepartures.seatsBooked,
      previousStatus: expeditionBookings.paymentStatus,
      bookingStatus: expeditionBookings.status,
      confirmedAt: expeditionBookings.confirmedAt,
      participantsCount: expeditionBookings.participantsCount,
      totalAmount: expeditionBookings.totalAmount,
      currency: expeditionBookings.currency,
      bookedAt: expeditionBookings.bookedAt,
      contactEmail: expeditionBookings.contactEmail,
      expeditionTitle: expeditions.title,
      expeditionSlug: expeditions.slug,
      providerReference: expeditionBookingPayments.providerReference,
      transactionPayload: expeditionBookingPayments.payload
    })
    .from(expeditionBookings)
    .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
    .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
    .leftJoin(expeditionBookingPayments, eq(expeditionBookingPayments.bookingId, expeditionBookings.id))
    .where(eq(expeditionBookings.id, input.bookingId))
    .orderBy(desc(expeditionBookingPayments.updatedAt))
    .limit(1);

  if (!booking) {
    return null;
  }

  const providerReference = input.providerReference ?? booking.providerReference ?? booking.id;
  const transactionPayload = {
    ...payloadObject(booking.transactionPayload),
    ...payloadObject(input.providerPayload),
    status: input.nextStatus,
    statusAppliedAt: now.toISOString()
  };
  const wasPaid = booking.previousStatus === "paid";
  const isPaid = input.nextStatus === "paid";

  await database
    .update(expeditionBookingPayments)
    .set({
      status: input.nextStatus,
      payload: transactionPayload,
      updatedAt: now
    })
    .where(eq(expeditionBookingPayments.bookingId, booking.id));

  await database
    .update(expeditionBookings)
    .set({
      paymentStatus: input.nextStatus,
      status: isPaid ? "confirmed" : input.nextStatus === "refunded" ? "cancelled" : "pending_payment",
      confirmedAt: isPaid ? booking.confirmedAt ?? now : null
    })
    .where(eq(expeditionBookings.id, booking.id));

  if (!wasPaid && isPaid) {
    const nextSeatsBooked = Math.max(0, booking.departureSeatsBooked + booking.participantsCount);

    await database
      .update(expeditionDepartures)
      .set({
        seatsBooked: nextSeatsBooked,
        status: departureStatusAfterSeatChange(booking.departureStatus, booking.departureCapacity, nextSeatsBooked)
      })
      .where(eq(expeditionDepartures.id, booking.departureId));

    await ensureExpeditionPassportItem(database, booking);
  }

  if (wasPaid && !isPaid) {
    const nextSeatsBooked = Math.max(0, booking.departureSeatsBooked - booking.participantsCount);

    await database
      .update(expeditionDepartures)
      .set({
        seatsBooked: nextSeatsBooked,
        status: departureStatusAfterSeatChange(booking.departureStatus, booking.departureCapacity, nextSeatsBooked)
      })
      .where(eq(expeditionDepartures.id, booking.departureId));

    await deleteExpeditionPassportItem(database, booking.id);
  }

  if (input.operationType) {
    await recordPaymentOperation(database, {
      operationType: input.operationType,
      entityType: "expedition_booking",
      bookingId: booking.id,
      processedByUserId: input.processedByUserId,
      status: "completed",
      amount: booking.totalAmount,
      currency: booking.currency,
      providerReference,
      metadata: {
        previousStatus: booking.previousStatus,
        nextStatus: input.nextStatus
      },
      processedAt: now,
      now
    });
  }

  return {
    bookingId: booking.id,
    contactEmail: booking.contactEmail,
    expeditionTitle: booking.expeditionTitle,
    participantsCount: booking.participantsCount,
    amount: toNumber(booking.totalAmount),
    currency: booking.currency,
    previousStatus: booking.previousStatus,
    nextStatus: input.nextStatus
  };
}
