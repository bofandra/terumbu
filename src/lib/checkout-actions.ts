"use server";

import { randomBytes, randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  campaigns,
  campaignImpactTargets,
  courseCertificates,
  corporateAccounts,
  corporateEmployees,
  donations,
  expeditionBookingPayments,
  expeditionBookings,
  expeditionDepartures,
  expeditionInterestRequests,
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
  splitParticipantEmails,
  splitParticipantNames
} from "@/lib/checkout";
import { getSessionUser, safeRedirectPath } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { sendTransactionalEmail } from "@/lib/email";
import { createMidtransSnapPayment, midtransConfiguration, midtransSnapOrigin } from "@/lib/midtrans";
import { midtransExpeditionEnabled, validMidtransExpeditionTotal } from "@/lib/midtrans-expedition";
import { checkoutStatusTokenHash, newCheckoutStatusToken, setCheckoutStatusCookie } from "@/lib/checkout-status-access";
import { expeditionDepartureAvailability } from "@/lib/expedition-booking-lifecycle";
import { canAcquireExpeditionHold, expeditionHoldExpiresAt, midtransJakartaStartTime, MIDTRANS_EXPEDITION_PAYMENT_MINUTES } from "@/lib/expedition-seat-holds";
import { calculateDonationImpact, minimumDonationAmount, normalizeCurrency } from "@/lib/impact-calculations";
import { storeUploadedPrivateImage } from "@/lib/storage";
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
  const checkoutParams = new URLSearchParams();
  if (campaignSlug) checkoutParams.set("campaign", campaignSlug);
  if (amount > 0) checkoutParams.set("amount", String(amount));
  if (contributionIntent !== "one-time") checkoutParams.set("intent", contributionIntent);
  const checkoutPath = `/checkout/donation${checkoutParams.size > 0 ? `?${checkoutParams.toString()}` : ""}`;
  const checkoutErrorPath = (error: string) => `${checkoutPath}${checkoutPath.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;

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
    redirect(checkoutErrorPath("campaign"));
  }

  const impactTargetRows = await db
    .select({
      impactType: campaignImpactTargets.impactType,
      label: campaignImpactTargets.label,
      unit: campaignImpactTargets.unit,
      target: campaignImpactTargets.target,
      unitCost: campaignImpactTargets.unitCost,
      allocationPercent: campaignImpactTargets.allocationPercent,
      isPrimary: campaignImpactTargets.isPrimary,
      sortOrder: campaignImpactTargets.sortOrder
    })
    .from(campaignImpactTargets)
    .where(eq(campaignImpactTargets.campaignId, campaign.id));

  const campaignCurrency = normalizeCurrency(campaign.currency);
  const minimumAmount = minimumDonationAmount(campaignCurrency);

  if (!campaignSlug || amount < minimumAmount || !donorName || !donorEmail) {
    redirect(checkoutErrorPath("invalid"));
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

  const providerReference = randomReference("MANUAL-DONATION");
  const proofUpload = await storeUploadedPrivateImage(formData.get("paymentProofFile"), {
    namespace: "payment-proof",
    appUrl: `/private-media/payment-proof/donation/${providerReference}`
  });
  const proofError = paymentProofUploadError(proofUpload);

  if (proofError) {
    redirect(checkoutErrorPath("payment_proof"));
  }

  const now = new Date();
  const impact = calculateDonationImpact({
    amount,
    currency: campaignCurrency,
    campaign: {
      ...campaign,
      impactTargets: impactTargetRows
    }
  });
  const sponsoredFragments = impact.coralFragments > 0 ? Math.max(1, Math.round(impact.coralFragments)) : 0;
  const submittedAt = now.toISOString();
  const manualPaymentMetadata = {
    method: "manual_external",
    contributionIntent,
    impactUnit: impact.impactUnit,
    impactUnitCost: impact.unitCost,
    impactUnitCount: Number(impact.impactUnitCount.toFixed(2)),
    impactBreakdown: impact.impactBreakdown.map((line) => ({
      impactType: line.impactType,
      label: line.label,
      unit: line.unit,
      unitCount: Number(line.unitCount.toFixed(2)),
      allocatedAmount: Number(line.allocatedAmount.toFixed(2))
    })),
    paymentProofUrl: proofUpload.dataUrl,
    paymentProofObjectKey: proofUpload.objectKey ?? null,
    paymentProofContentType: proofUpload.contentType ?? null,
    paymentProofStorageProvider: proofUpload.storageProvider ?? null,
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
    distinctId: sessionUser?.id ? `user:${sessionUser.id}` : `donation:${donationId}`,
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
  return submitExpeditionCheckout(formData, "manual_external");
}

export async function bookMidtransExpeditionAction(formData: FormData) {
  return submitExpeditionCheckout(formData, "midtrans");
}

async function submitExpeditionCheckout(formData: FormData, paymentProvider: "manual_external" | "midtrans") {
  const isMidtrans = paymentProvider === "midtrans";
  const requestId = String(formData.get("requestId") ?? "");
  const departureId = String(formData.get("departureId") ?? "");
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "")
    .trim()
    .toLowerCase();
  const participantCount = parseParticipantCount(formData.get("participantsCount"));
  const additionalParticipantNames = splitParticipantNames(formData.get("additionalParticipantNames"), "Additional participant", Math.max(0, participantCount - 1));
  const additionalParticipantEmails = splitParticipantEmails(formData.get("additionalParticipantEmails"), Math.max(0, participantCount - 1));
  const participantNames = [contactName || "Participant", ...additionalParticipantNames].slice(0, participantCount);
  const participantEmails = [contactEmail, ...additionalParticipantEmails].slice(0, participantCount);
  const groupName = String(formData.get("groupName") ?? "").trim().slice(0, 160) || null;
  const contactRole = String(formData.get("contactRole") ?? "Lead traveler").trim().slice(0, 80) || "Lead traveler";
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim().slice(0, 220) || null;
  const dietaryNotes = String(formData.get("dietaryNotes") ?? "").trim().slice(0, 1000) || null;
  const accessibilityNotes = String(formData.get("accessibilityNotes") ?? "").trim().slice(0, 1000) || null;
  const paymentState = "pending";
  const paymentReference = String(formData.get("paymentReference") ?? "").trim();
  const nextPath = safeRedirectPath(formData.get("next"));
  const midtransConfig = isMidtrans ? midtransConfiguration() : null;
  if (isMidtrans && (!midtransConfig || !midtransExpeditionEnabled())) {
    redirect(`${nextPath}?error=gateway`);
  }
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;
  const joinAs = String(formData.get("joinAs") ?? "personal").trim();
  const referralCode = String(formData.get("referralCode") ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64) || null;
  const selectedCorporateAccountId = joinAs.startsWith("corporate:") ? joinAs.replace("corporate:", "").trim() : null;
  const sessionUser = await getSessionUser();

  if (!departureId || !contactName || contactName.length > 160 || !contactEmail || contactEmail.length > 255 ||
      (isMidtrans && (!/^expedition-[0-9a-f]{24}$/.test(idempotencyKey ?? "") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)))) {
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
      expeditionSlug: expeditions.slug,
      requiredAcademyCourseId: expeditions.requiredAcademyCourseId,
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
    .where(and(eq(expeditionDepartures.id, departureId), eq(expeditions.status, "published")))
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

  if (!departure || !availability?.canBook || departure.startsAt.getTime() <= Date.now()) {
    redirect(`${nextPath}?error=availability`);
  }

  const checkoutTotal = calculateBookingTotal(departure.basePrice, participantCount);
  if (isMidtrans && !validMidtransExpeditionTotal(departure.currency, checkoutTotal)) {
    redirect(`${nextPath}?error=gateway`);
  }

  if (departure.requiredAcademyCourseId) {
    if (!sessionUser) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}&reason=academy-prerequisite`);
    }
    const [certificate] = await db.select({ id: courseCertificates.id }).from(courseCertificates)
      .where(and(eq(courseCertificates.userId, sessionUser.id), eq(courseCertificates.courseId, departure.requiredAcademyCourseId))).limit(1);
    if (!certificate) redirect(`${nextPath}?error=learning_required`);
  }

  if (idempotencyKey) {
    const [existingBooking] = await db
      .select({
        id: expeditionBookings.id,
        paymentStatus: expeditionBookings.paymentStatus,
        departureId: expeditionBookings.departureId,
        contactEmail: expeditionBookings.contactEmail,
        totalAmount: expeditionBookings.totalAmount,
        participantsCount: expeditionBookings.participantsCount,
        provider: expeditionBookingPayments.provider,
        providerPayload: expeditionBookingPayments.payload,
        holdExpiresAt: expeditionBookings.holdExpiresAt
      })
      .from(expeditionBookings)
      .leftJoin(expeditionBookingPayments, eq(expeditionBookingPayments.bookingId, expeditionBookings.id))
      .where(eq(expeditionBookings.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingBooking) {
      if (isMidtrans) {
        if (existingBooking.provider !== "midtrans" || existingBooking.departureId !== departureId ||
            existingBooking.contactEmail !== contactEmail || existingBooking.participantsCount !== participantCount ||
            Number(existingBooking.totalAmount) !== checkoutTotal) redirect(`${nextPath}?error=invalid`);
        if (existingBooking.paymentStatus === "paid" || existingBooking.paymentStatus === "refunded") {
          redirect(`/checkout/success?status=${existingBooking.paymentStatus}&type=expedition&id=${existingBooking.id}`);
        }
        const payload = existingBooking.providerPayload;
        const savedUrl = payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as Record<string, unknown>).redirectUrl : null;
        if (existingBooking.holdExpiresAt && existingBooking.holdExpiresAt <= new Date()) {
          redirect(`${nextPath}?error=availability`);
        }
        if (typeof savedUrl === "string" && midtransConfig) {
          try {
            const url = new URL(savedUrl);
            if (url.protocol === "https:" && url.origin === midtransSnapOrigin(midtransConfig) && !url.username && !url.password) redirect(savedUrl);
          } catch (error) {
            // Next.js redirects throw; only ignore malformed URLs, not redirects.
            if (error && typeof error === "object" && "digest" in error) throw error;
          }
        }
        redirect(`${nextPath}?error=gateway`);
      }
      redirect(`/checkout/success?status=${existingBooking.paymentStatus}&type=expedition&id=${existingBooking.id}`);
    }
  }

  const providerReference = isMidtrans ? `TRB-EXP-${randomUUID()}` : randomReference("MANUAL-EXPEDITION");
  const statusToken = isMidtrans ? newCheckoutStatusToken() : null;
  const proofUpload = isMidtrans ? null : await storeUploadedPrivateImage(formData.get("paymentProofFile"), {
    namespace: "payment-proof",
    appUrl: `/private-media/payment-proof/expedition/${providerReference}`
  });
  const proofError = isMidtrans ? null : paymentProofUploadError(proofUpload!);

  if (proofError) {
    redirect(`${nextPath}?error=payment_proof`);
  }

  const now = new Date();
  const manualPaymentMetadata = {
    method: "manual_external",
    paymentProofUrl: proofUpload?.dataUrl ?? null,
    paymentProofObjectKey: proofUpload?.objectKey ?? null,
    paymentProofContentType: proofUpload?.contentType ?? null,
    paymentProofStorageProvider: proofUpload?.storageProvider ?? null,
    paymentReference: paymentReference || null,
    submittedAt: now.toISOString(),
    verificationStatus: "submitted"
  };
  const bookingCode = buildBookingCode(providerReference, now);
  const totalAmount = checkoutTotal;
  let bookingId = "";
  let shouldSendBookingEmail = false;
  let bookingEmailUserId: string | null = null;

  try {
    await db.transaction(async (tx) => {
    if (requestId) {
      if (!sessionUser || !/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("EXPEDITION_REQUEST_UNAVAILABLE");
      const [request] = await tx.select().from(expeditionInterestRequests).where(eq(expeditionInterestRequests.id, requestId)).for("update");
      if (!request || request.userId !== sessionUser.id || !request.acceptedAt || request.bookingId ||
          request.proposedDepartureId !== departure.id || request.participantsCount !== participantCount ||
          ["declined", "cancelled"].includes(request.status)) throw new Error("EXPEDITION_REQUEST_UNAVAILABLE");
    }
    if (isMidtrans) {
      const canHold = await canAcquireExpeditionHold(tx as unknown as typeof db, {
        departureId: departure.id, participantsCount: participantCount, now
      });
      if (!canHold) throw new Error("EXPEDITION_HOLD_UNAVAILABLE");
    }
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
        holdExpiresAt: isMidtrans ? expeditionHoldExpiresAt(now) : null,
        metadata: {
          providerReference,
          participantNames,
          bookingUnitPrice: Number(departure.basePrice),
          availabilityCode: availability.code,
          availabilityMessage: availability.message,
          attribution: corporateAttribution ?? { type: "personal" },
          referralCode,
          group: participantCount > 1 || groupName
            ? {
                name: groupName,
                contactRole,
                accessibilityNotes
              }
            : null
        }
      })
      .returning({ id: expeditionBookings.id });

    bookingId = booking.id;
    if (requestId) await tx.update(expeditionInterestRequests).set({ bookingId: booking.id, status: "converted", updatedAt: now })
      .where(eq(expeditionInterestRequests.id, requestId));

    await tx.insert(expeditionBookingPayments).values({
      bookingId: booking.id,
      provider: paymentProvider,
      providerReference,
      status: isMidtrans ? "created" : "pending",
      payload: isMidtrans ? { method: "midtrans_snap", initiatedAt: now.toISOString(),
        checkoutAccessHash: checkoutStatusTokenHash(statusToken!) } : manualPaymentMetadata,
      updatedAt: now
    });

    await tx.insert(expeditionParticipants).values(
      participantNames.map((fullName, index) => ({
        bookingId: booking.id,
        fullName,
        email: participantEmails[index] || (index === 0 ? contactEmail : null),
        emergencyContact: index === 0 ? emergencyContact : null,
        dietaryNotes: dietaryNotes || (accessibilityNotes ? `Accessibility: ${accessibilityNotes}` : null)
      }))
    );

    if (isMidtrans) {
      await recordPaymentOperation(tx as unknown as typeof db, {
        operationType: "midtrans_expedition_initiated", entityType: "expedition_booking",
        bookingId: booking.id, requestedByUserId: sessionUser?.id ?? null,
        status: "pending", provider: "midtrans", providerReference,
        amount: totalAmount.toFixed(2), currency: "IDR", now
      });
    } else {
      const result = await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
        bookingId: booking.id,
        nextStatus: paymentState,
        providerReference,
        providerPayload: manualPaymentMetadata,
        operationType: "payment_proof_submitted",
        now
      });

      if (result?.nextStatus === "paid") {
        shouldSendBookingEmail = true;
        bookingEmailUserId = sessionUser?.id ?? null;
      }
    }
    });
  } catch (error) {
    if (error instanceof Error && ["EXPEDITION_HOLD_UNAVAILABLE", "EXPEDITION_REQUEST_UNAVAILABLE"].includes(error.message)) {
      redirect(`${nextPath}?error=availability`);
    }
    throw error;
  }

  if (isMidtrans && statusToken) await setCheckoutStatusCookie(bookingId, statusToken);

  await sendTransactionalEmail({
    userId: bookingEmailUserId,
    recipientEmail: contactEmail,
    subject: shouldSendBookingEmail
      ? `Your ${departure.expeditionTitle} booking is confirmed`
      : `We received your ${departure.expeditionTitle} booking request`,
    template: shouldSendBookingEmail ? "expedition_booking_confirmation" : "expedition_booking_received",
    payload: {
      bookingCode,
      bookingId,
      departure: departure.startsAt.toISOString(),
      participantsCount: participantCount,
      paymentStatus: shouldSendBookingEmail ? "paid" : "pending_verification"
    }
  });

  await trackEvent({
    distinctId: sessionUser?.id ? `user:${sessionUser.id}` : `booking:${bookingId}`,
    event: "expedition_booking_submitted",
    properties: {
      expeditionId: departure.expeditionId,
      expeditionSlug: departure.expeditionSlug,
      departureId,
      participantsCount: participantCount,
      status: paymentState,
      authenticated: Boolean(sessionUser),
      hasReferral: Boolean(referralCode)
    }
  });

  if (isMidtrans && midtransConfig) {
    let snapUrl: string;
    try {
      const publicBase = process.env.NEXT_PUBLIC_APP_URL;
      const finishUrl = publicBase && URL.canParse(publicBase)
        ? new URL(`/checkout/success?status=pending&type=expedition&id=${bookingId}&method=midtrans`, publicBase).toString()
        : undefined;
      snapUrl = await createMidtransSnapPayment(midtransConfig, {
        orderId: providerReference, amount: totalAmount,
        donorName: contactName, donorEmail: contactEmail, finishUrl,
        expiry: { startTime: midtransJakartaStartTime(now), durationMinutes: MIDTRANS_EXPEDITION_PAYMENT_MINUTES }
      });
    } catch {
      console.error("Midtrans expedition checkout could not be initiated.");
      redirect(`${nextPath}?error=gateway`);
    }
    const updated = await db.update(expeditionBookingPayments).set({
      status: "pending",
      payload: { method: "midtrans_snap", initiatedAt: now.toISOString(), redirectUrl: snapUrl,
        checkoutAccessHash: checkoutStatusTokenHash(statusToken!) },
      updatedAt: new Date()
    }).where(and(eq(expeditionBookingPayments.provider, "midtrans"),
      eq(expeditionBookingPayments.providerReference, providerReference),
      eq(expeditionBookingPayments.status, "created"))).returning({ id: expeditionBookingPayments.id });
    if (!updated.length) {
      const [latest] = await db.select({ status: expeditionBookings.paymentStatus })
        .from(expeditionBookings).where(eq(expeditionBookings.id, bookingId)).limit(1);
      if (latest?.status === "paid") {
        redirect(`/checkout/success?status=paid&type=expedition&id=${bookingId}`);
      }
      redirect(`${nextPath}?error=gateway`);
    }
    redirect(snapUrl);
  }

  const successParams = new URLSearchParams({
    status: "pending",
    type: "expedition",
    id: bookingId,
    expedition: departure.expeditionSlug
  });
  if (referralCode) {
    successParams.set("ref", referralCode);
  }

  redirect(`/checkout/success?${successParams.toString()}`);
}
