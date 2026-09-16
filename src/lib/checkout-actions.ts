"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  campaigns,
  corporateAccounts,
  corporateEmployees,
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
  normalizeDonationContributionIntent,
  parseDonationAmount,
  paymentProofUploadError,
  parseParticipantCount,
  splitParticipantNames
} from "@/lib/checkout";
import { getSessionUser, safeRedirectPath } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { sendTransactionalEmail } from "@/lib/email";
import { expeditionDepartureAvailability } from "@/lib/expedition-booking-lifecycle";
import { calculateDonationImpact, minimumDonationAmount, normalizeCurrency } from "@/lib/impact-calculations";
import { readUploadedImageAsDataUrl } from "@/lib/storage";
import {
  recordPaymentOperation,
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
  const contributionIntent = normalizeDonationContributionIntent(formData.get("intent"));
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;
  const paymentReference = String(formData.get("paymentReference") ?? "").trim();
  const sessionUser = await getSessionUser();

  const [campaign] = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      currency: campaigns.currency,
      goalAmount: campaigns.goalAmount,
      impactUnit: campaigns.impactUnit,
      impactTarget: campaigns.impactTarget,
      impactUnitCost: campaigns.impactUnitCost
    })
    .from(campaigns)
    .where(and(eq(campaigns.slug, campaignSlug), eq(campaigns.status, "published")))
    .limit(1);

  if (!campaign) {
    redirect("/checkout/donation?error=campaign");
  }

  const campaignCurrency = normalizeCurrency(campaign.currency);
  const minimumAmount = minimumDonationAmount(campaignCurrency);

  if (!campaignSlug || amount < minimumAmount || !donorName || !donorEmail) {
    redirect("/checkout/donation?error=invalid");
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

  const proofUpload = await readUploadedImageAsDataUrl(formData.get("paymentProofFile"));
  const proofError = paymentProofUploadError(proofUpload);

  if (proofError) {
    redirect("/checkout/donation?error=payment_proof");
  }

  const providerReference = randomReference("MANUAL-DONATION");
  const now = new Date();
  const impact = calculateDonationImpact({
    amount,
    currency: campaignCurrency,
    campaign
  });
  const sponsoredFragments = impact.coralFragments > 0 ? Math.max(1, Math.round(impact.coralFragments)) : 0;
  const submittedAt = now.toISOString();
  const manualPaymentMetadata = {
    method: "manual_external",
    contributionIntent,
    impactUnit: impact.impactUnit,
    impactUnitCost: impact.unitCost,
    impactUnitCount: Number(impact.impactUnitCount.toFixed(2)),
    paymentProofUrl: proofUpload.dataUrl,
    paymentReference: paymentReference || null,
    submittedAt,
    verificationStatus: "submitted",
    sponsoredFragments: sponsoredFragments || null
  };
  let donationId = "";

  await db.transaction(async (tx) => {
    const [donation] = await tx
      .insert(donations)
      .values({
        campaignId: campaign.id,
        userId: sessionUser?.id ?? null,
        idempotencyKey,
        donorName,
        donorEmail,
        amount: amount.toFixed(2),
        currency: campaignCurrency,
        status: "pending",
        message,
        createdAt: now
      })
      .returning({ id: donations.id });

    donationId = donation.id;

    await tx.insert(paymentTransactions).values({
      donationId: donation.id,
      paymentMethodId: null,
      provider: "manual_external",
      providerReference,
      status: "pending",
      payload: manualPaymentMetadata,
      updatedAt: now
    });

    await recordPaymentOperation(tx as unknown as typeof db, {
      operationType: "payment_proof_submitted",
      entityType: "donation",
      donationId: donation.id,
      requestedByUserId: sessionUser?.id ?? null,
      status: "pending",
      amount: amount.toFixed(2),
      currency: campaignCurrency,
      provider: "manual_external",
      providerReference,
      reason: paymentReference || "Payment proof submitted for manual verification.",
      metadata: manualPaymentMetadata,
      now
    });
  });

  await trackEvent({
    distinctId: sessionUser?.id ?? donorEmail,
    event: "donation_payment_proof_submitted",
    properties: {
      campaignSlug,
      amount,
      currency: campaignCurrency,
      contributionIntent,
      sponsoredFragments: sponsoredFragments || undefined,
      status: "pending"
    }
  });

  redirect(`/checkout/success?status=pending&type=donation&id=${donationId}`);
}

export async function bookExpeditionAction(formData: FormData) {
  const departureId = String(formData.get("departureId") ?? "");
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "")
    .trim()
    .toLowerCase();
  const participantCount = parseParticipantCount(formData.get("participantsCount"));
  const additionalParticipantNames = splitParticipantNames(formData.get("additionalParticipantNames"), "Additional participant", Math.max(0, participantCount - 1));
  const participantNames = [contactName || "Participant", ...additionalParticipantNames].slice(0, participantCount);
  const paymentState = "pending";
  const nextPath = safeRedirectPath(formData.get("next"));
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;
  const joinAs = String(formData.get("joinAs") ?? "personal").trim();
  const selectedCorporateAccountId = joinAs.startsWith("corporate:") ? joinAs.replace("corporate:", "").trim() : null;
  const sessionUser = await getSessionUser();

  if (!departureId || !contactName || !contactEmail) {
    redirect(`${nextPath}?error=invalid`);
  }

  let corporateAttribution: {
    type: "corporate";
    corporateAccountId: string;
    corporateAccountName: string;
    corporateEmployeeId: string;
  } | null = null;

  if (selectedCorporateAccountId) {
    if (!sessionUser) {
      redirect(`${nextPath}?error=attribution`);
    }

    const [employee] = await db
      .select({
        employeeId: corporateEmployees.id,
        accountId: corporateAccounts.id,
        accountName: corporateAccounts.name
      })
      .from(corporateEmployees)
      .innerJoin(corporateAccounts, eq(corporateEmployees.corporateAccountId, corporateAccounts.id))
      .where(and(eq(corporateEmployees.userId, sessionUser.id), eq(corporateEmployees.status, "active"), eq(corporateAccounts.id, selectedCorporateAccountId)))
      .limit(1);

    if (!employee) {
      redirect(`${nextPath}?error=attribution`);
    }

    corporateAttribution = {
      type: "corporate",
      corporateAccountId: employee.accountId,
      corporateAccountName: employee.accountName,
      corporateEmployeeId: employee.employeeId
    };
  }

  const [departure] = await db
    .select({
      id: expeditionDepartures.id,
      expeditionId: expeditions.id,
      expeditionTitle: expeditions.title,
      basePrice: expeditions.basePrice,
      currency: expeditions.currency,
      capacity: expeditionDepartures.capacity,
      seatsBooked: expeditionDepartures.seatsBooked,
      status: expeditionDepartures.status,
      metadata: expeditionDepartures.metadata,
      startsAt: expeditionDepartures.startsAt
    })
    .from(expeditionDepartures)
    .innerJoin(expeditions, eq(expeditionDepartures.expeditionId, expeditions.id))
    .where(eq(expeditionDepartures.id, departureId))
    .limit(1);

  const availability = departure
    ? expeditionDepartureAvailability(
        {
          status: departure.status,
          capacity: departure.capacity,
          seatsBooked: departure.seatsBooked,
          minParticipants: Number((departure.metadata as Record<string, unknown> | null)?.minParticipants ?? 6)
        },
        participantCount
      )
    : null;

  if (!departure || !availability?.canBook) {
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
        currency: normalizeCurrency(departure.currency),
        status: "pending_payment",
        paymentStatus: "created",
        bookedAt: now,
        confirmedAt: null,
        metadata: {
          providerReference,
          participantNames,
          availabilityCode: availability.code,
          availabilityMessage: availability.message,
          attribution: corporateAttribution ?? { type: "personal" }
        }
      })
      .returning({ id: expeditionBookings.id });

    bookingId = booking.id;

    await tx.insert(expeditionBookingPayments).values({
      bookingId: booking.id,
      provider: "demo_gateway",
      providerReference,
      status: "pending",
      payload: {
        method: "gateway_pending",
        submittedAt: now.toISOString()
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
        method: "gateway_pending",
        submittedAt: now.toISOString()
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
      currency: normalizeCurrency(departure.currency),
      status: paymentState,
      attributionType: corporateAttribution?.type ?? "personal",
      corporateAccountId: corporateAttribution?.corporateAccountId ?? null
    }
  });

  redirect(`/checkout/success?status=pending&type=expedition&id=${bookingId}`);
}
