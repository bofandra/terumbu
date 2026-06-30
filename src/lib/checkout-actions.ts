"use server";

import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  campaigns,
  donationReceipts,
  donations,
  impactSites,
  expeditionBookingPayments,
  expeditionBookings,
  expeditionDepartures,
  expeditionParticipants,
  expeditions,
  paymentTransactions,
  sponsoredEcosystems
} from "@/db/schema";
import {
  buildBookingCode,
  buildReceiptNumber,
  buildSponsoredEcosystemCode,
  calculateBookingTotal,
  parseDonationAmount,
  parseParticipantCount,
  splitParticipantNames
} from "@/lib/checkout";
import { getSessionUser, safeRedirectPath } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { sendTransactionalEmail } from "@/lib/email";

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
  const paymentState = formData.get("paymentState") === "failed" ? "failed" : "paid";
  const rawIntent = String(formData.get("intent") ?? "one-time");
  const contributionIntent = rawIntent === "monthly" || rawIntent === "coral" ? rawIntent : "one-time";
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

  const providerReference = randomReference("DEMO-DONATION");
  const now = new Date();
  const sponsoredFragments = contributionIntent === "coral" ? Math.max(1, Math.round(amount / 50_000)) : 0;
  let donationId = "";
  let receiptEmailNumber: string | null = null;
  let receiptEmailUserId: string | null = null;

  await db.transaction(async (tx) => {
    const [donation] = await tx
      .insert(donations)
      .values({
        campaignId: campaign.id,
        userId: sessionUser?.id ?? null,
        donorName,
        donorEmail,
        amount: amount.toFixed(2),
        currency: "IDR",
        status: paymentState,
        message,
        createdAt: now
      })
      .returning({ id: donations.id });

    donationId = donation.id;

    await tx.insert(paymentTransactions).values({
      donationId: donation.id,
      provider: "demo_gateway",
      providerReference,
      status: paymentState,
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

    if (paymentState === "paid") {
      await tx
        .update(campaigns)
        .set({
          raisedAmount: sql`${campaigns.raisedAmount} + ${amount}`,
          donorCount: sql`${campaigns.donorCount} + 1`,
          updatedAt: now
        })
        .where(eq(campaigns.id, campaign.id));

      const receiptNumber = buildReceiptNumber(providerReference, now);

      await tx.insert(donationReceipts).values({
        donationId: donation.id,
        receiptNumber,
        issuedAt: now,
        emailedAt: now,
        payload: {
          campaign: campaign.title,
          amount,
          currency: "IDR",
          contributionIntent,
          interval: contributionIntent === "monthly" ? "month" : null,
          sponsoredFragments: sponsoredFragments || null,
          providerReference
        }
      });

      if (contributionIntent === "coral") {
        const [site] = await tx
          .select({
            id: impactSites.id
          })
          .from(impactSites)
          .where(eq(impactSites.campaignId, campaign.id))
          .limit(1);
        const code = buildSponsoredEcosystemCode(providerReference, now);

        await tx.insert(sponsoredEcosystems).values({
          campaignId: campaign.id,
          impactSiteId: site?.id ?? null,
          userId: sessionUser?.id ?? null,
          code,
          label: `${donorName || "Anonymous"} coral sponsorship`,
          status: "sponsored",
          lastUpdatedAt: now,
          metadata: {
            donationId: donation.id,
            fragments: sponsoredFragments,
            amount,
            currency: "IDR",
            contributionIntent
          }
        });
      }

      receiptEmailNumber = receiptNumber;
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
  const paymentState = formData.get("paymentState") === "failed" ? "failed" : "paid";
  const nextPath = safeRedirectPath(formData.get("next"));
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
      startsAt: expeditionDepartures.startsAt
    })
    .from(expeditionDepartures)
    .innerJoin(expeditions, eq(expeditionDepartures.expeditionId, expeditions.id))
    .where(eq(expeditionDepartures.id, departureId))
    .limit(1);

  if (!departure || departure.capacity - departure.seatsBooked < participantCount) {
    redirect(`${nextPath}?error=availability`);
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
        totalAmount: totalAmount.toFixed(2),
        currency: "IDR",
        status: paymentState === "paid" ? "confirmed" : "pending_payment",
        paymentStatus: paymentState,
        bookedAt: now,
        confirmedAt: paymentState === "paid" ? now : null,
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
      status: paymentState,
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

    if (paymentState === "paid") {
      await tx
        .update(expeditionDepartures)
        .set({
          seatsBooked: sql`${expeditionDepartures.seatsBooked} + ${participantCount}`
        })
        .where(eq(expeditionDepartures.id, departure.id));

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
