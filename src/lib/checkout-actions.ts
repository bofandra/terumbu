"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  campaigns,
  donations,
  expeditionBookingPayments,
  expeditionBookings,
  expeditionDepartures,
  expeditionParticipants,
  expeditions,
  paymentTransactions
} from "@/db/schema";
import {
  buildBookingCode,
  calculateBookingTotal,
  parseDonationAmount,
  parseParticipantCount,
  splitParticipantNames
} from "@/lib/checkout";
import { getSessionUser, safeRedirectPath } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { sendTransactionalEmail } from "@/lib/email";
import {
  ensureUserPaymentMethod,
  paymentStatusFromValue,
  transitionDonationPayment,
  transitionExpeditionBookingPayment
} from "@/lib/payment-workflows";

function randomReference(prefix: string) {
  return `${prefix}-${new Date().getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function createDonationAction(formData: FormData) {
  const campaignSlug = String(formData.get("campaignSlug") ?? "");
  const customAmount = parseDonationAmount(formData.get("customAmount"));
  const amount = customAmount > 0 ? customAmount : parseDonationAmount(formData.get("amount"));
  const donorName = String(formData.get("donorName") ?? "").trim();
  const donorEmail = String(formData.get("donorEmail") ?? "")
    .trim()
    .toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const paymentState = paymentStatusFromValue(formData.get("paymentState"), "paid");
  const rawIntent = String(formData.get("intent") ?? "one-time");
  const contributionIntent = rawIntent === "monthly" || rawIntent === "coral" ? rawIntent : "one-time";
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;
  const savePaymentMethod = formData.get("savePaymentMethod") === "on" || contributionIntent === "monthly";
  const cardLast4 = String(formData.get("cardLast4") ?? "4242");
  const cardLabel = String(formData.get("cardLabel") ?? "").trim();
  const sessionUser = await getSessionUser();

  if (!campaignSlug || amount < 10_000 || !donorName || !donorEmail) {
    redirect("/checkout/donation?error=invalid");
  }

  const [campaign] = await db
    .select({
      id: campaigns.id,
      title: campaigns.title
    })
    .from(campaigns)
    .where(and(eq(campaigns.slug, campaignSlug), eq(campaigns.status, "published")))
    .limit(1);

  if (!campaign) {
    redirect("/checkout/donation?error=campaign");
  }

  if (idempotencyKey) {
    const [existingDonation] = await db
      .select({
        id: donations.id,
        status: donations.status
      })
      .from(donations)
      .where(eq(donations.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingDonation) {
      redirect(`/checkout/success?status=${existingDonation.status}&type=donation&id=${existingDonation.id}`);
    }
  }

  const providerReference = randomReference("DEMO-DONATION");
  const now = new Date();
  const sponsoredFragments = contributionIntent === "coral" ? Math.max(1, Math.round(amount / 50_000)) : 0;
  let donationId = "";
  let receiptEmailNumber: string | null = null;
  let receiptEmailUserId: string | null = null;

  await db.transaction(async (tx) => {
    const paymentMethodId = savePaymentMethod
      ? await ensureUserPaymentMethod(tx as unknown as typeof db, {
          userId: sessionUser?.id,
          label: cardLabel || null,
          brand: "Demo Card",
          last4: cardLast4,
          makeDefault: contributionIntent === "monthly",
          now
        })
      : null;
    const [donation] = await tx
      .insert(donations)
      .values({
        campaignId: campaign.id,
        userId: sessionUser?.id ?? null,
        idempotencyKey,
        donorName,
        donorEmail,
        amount: amount.toFixed(2),
        currency: "IDR",
        status: "created",
        message,
        createdAt: now
      })
      .returning({ id: donations.id });

    donationId = donation.id;

    await tx.insert(paymentTransactions).values({
      donationId: donation.id,
      paymentMethodId,
      provider: "demo_gateway",
      providerReference,
      status: "created",
      payload: {
        method: "demo_checkout",
        contributionIntent,
        interval: contributionIntent === "monthly" ? "month" : null,
        sponsoredFragments: sponsoredFragments || null,
        cancelFromDashboard: contributionIntent === "monthly",
        completedAt: paymentState === "paid" ? now.toISOString() : null,
        failedAt: paymentState === "failed" ? now.toISOString() : null
      },
      updatedAt: now
    });

    const result = await transitionDonationPayment(tx as unknown as typeof db, {
      donationId: donation.id,
      nextStatus: paymentState,
      providerReference,
      paymentMethodId,
      providerPayload: {
        method: "demo_checkout",
        contributionIntent,
        interval: contributionIntent === "monthly" ? "month" : null,
        sponsoredFragments: sponsoredFragments || null,
        cancelFromDashboard: contributionIntent === "monthly",
        completedAt: paymentState === "paid" ? now.toISOString() : null,
        failedAt: paymentState === "failed" ? now.toISOString() : null
      },
      operationType: "checkout",
      now
    });

    if (result?.receiptCreated) {
      receiptEmailNumber = result.receiptNumber;
      receiptEmailUserId = sessionUser?.id ?? null;
    }
  });

  if (receiptEmailNumber) {
    await sendTransactionalEmail({
      userId: receiptEmailUserId,
      recipientEmail: donorEmail,
      subject: "Your Terumbu donation receipt",
      template: "donation_receipt",
      payload: {
        receiptNumber: receiptEmailNumber,
        donationId,
        campaign: campaign.title,
        amount,
        currency: "IDR"
      }
    });
  }

  await trackEvent({
    distinctId: sessionUser?.id ?? donorEmail,
    event: "donation_checkout_completed",
    properties: {
      campaignSlug,
      amount,
      contributionIntent,
      sponsoredFragments: sponsoredFragments || undefined,
      status: paymentState
    }
  });

  if (paymentState === "failed") {
    redirect(`/checkout/success?status=failed&type=donation&id=${donationId}`);
  }

  redirect(`/checkout/success?status=paid&type=donation&id=${donationId}`);
}

export async function bookExpeditionAction(formData: FormData) {
  const departureId = String(formData.get("departureId") ?? "");
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "")
    .trim()
    .toLowerCase();
  const participantCount = parseParticipantCount(formData.get("participantsCount"));
  const participantNames = splitParticipantNames(formData.get("participantNames"), contactName || "Participant", participantCount);
  const paymentState = paymentStatusFromValue(formData.get("paymentState"), "paid");
  const nextPath = safeRedirectPath(formData.get("next"));
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;
  const sessionUser = await getSessionUser();

  if (!departureId || !contactName || !contactEmail) {
    redirect(`${nextPath}?error=invalid`);
  }

  const [departure] = await db
    .select({
      id: expeditionDepartures.id,
      expeditionId: expeditions.id,
      expeditionTitle: expeditions.title,
      basePrice: expeditions.basePrice,
      capacity: expeditionDepartures.capacity,
      seatsBooked: expeditionDepartures.seatsBooked,
      status: expeditionDepartures.status,
      startsAt: expeditionDepartures.startsAt
    })
    .from(expeditionDepartures)
    .innerJoin(expeditions, eq(expeditionDepartures.expeditionId, expeditions.id))
    .where(eq(expeditionDepartures.id, departureId))
    .limit(1);

  if (!departure || departure.status !== "open" || departure.capacity - departure.seatsBooked < participantCount) {
    redirect(`${nextPath}?error=availability`);
  }

  if (idempotencyKey) {
    const [existingBooking] = await db
      .select({
        id: expeditionBookings.id,
        paymentStatus: expeditionBookings.paymentStatus
      })
      .from(expeditionBookings)
      .where(eq(expeditionBookings.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingBooking) {
      redirect(`/checkout/success?status=${existingBooking.paymentStatus}&type=expedition&id=${existingBooking.id}`);
    }
  }

  const now = new Date();
  const providerReference = randomReference("DEMO-EXPEDITION");
  const bookingCode = buildBookingCode(providerReference, now);
  const totalAmount = calculateBookingTotal(departure.basePrice, participantCount);
  let bookingId = "";
  let shouldSendBookingEmail = false;
  let bookingEmailUserId: string | null = null;

  await db.transaction(async (tx) => {
    const [booking] = await tx
      .insert(expeditionBookings)
      .values({
        expeditionId: departure.expeditionId,
        departureId: departure.id,
        userId: sessionUser?.id ?? null,
        bookingCode,
        contactName,
        contactEmail,
        participantsCount: participantCount,
        idempotencyKey,
        totalAmount: totalAmount.toFixed(2),
        currency: "IDR",
        status: "pending_payment",
        paymentStatus: "created",
        bookedAt: now,
        confirmedAt: null,
        metadata: {
          providerReference,
          participantNames
        }
      })
      .returning({ id: expeditionBookings.id });

    bookingId = booking.id;

    await tx.insert(expeditionBookingPayments).values({
      bookingId: booking.id,
      provider: "demo_gateway",
      providerReference,
      status: "created",
      payload: {
        method: "demo_checkout",
        completedAt: paymentState === "paid" ? now.toISOString() : null,
        failedAt: paymentState === "failed" ? now.toISOString() : null
      },
      updatedAt: now
    });

    await tx.insert(expeditionParticipants).values(
      participantNames.map((fullName) => ({
        bookingId: booking.id,
        fullName,
        email: contactEmail
      }))
    );

    const result = await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
      bookingId: booking.id,
      nextStatus: paymentState,
      providerReference,
      providerPayload: {
        method: "demo_checkout",
        completedAt: paymentState === "paid" ? now.toISOString() : null,
        failedAt: paymentState === "failed" ? now.toISOString() : null
      },
      operationType: "checkout",
      now
    });

    if (result?.nextStatus === "paid") {
      shouldSendBookingEmail = true;
      bookingEmailUserId = sessionUser?.id ?? null;
    }
  });

  if (shouldSendBookingEmail) {
    await sendTransactionalEmail({
      userId: bookingEmailUserId,
      recipientEmail: contactEmail,
      subject: `Your ${departure.expeditionTitle} booking is confirmed`,
      template: "expedition_booking_confirmation",
      payload: {
        bookingCode,
        bookingId,
        departure: departure.startsAt.toISOString(),
        participantsCount: participantCount
      }
    });
  }

  await trackEvent({
    distinctId: sessionUser?.id ?? contactEmail,
    event: "expedition_booking_completed",
    properties: {
      departureId,
      participantsCount: participantCount,
      totalAmount,
      status: paymentState
    }
  });

  if (paymentState === "failed") {
    redirect(`/checkout/success?status=failed&type=expedition&id=${bookingId}`);
  }

  redirect(`/checkout/success?status=paid&type=expedition&id=${bookingId}`);
}
