import { and, asc, eq, inArray, lte } from "drizzle-orm";

import { db } from "@/db/client";
import {
  campaigns,
  donationSubscriptions,
  donations,
  paymentTransactions,
  userPaymentMethods
} from "@/db/schema";
import {
  activeSubscriptionStatuses,
  isSubscriptionDue,
  monthlySubscriptionCycleKey,
  nextFailedSubscriptionRetryDate
} from "@/lib/billing-lifecycle";
import { sendTransactionalEmail } from "@/lib/email";
import { demoGatewayChargeSubscription } from "@/lib/payment-provider";
import { transitionDonationPayment } from "@/lib/payment-workflows";

type DatabaseLike = typeof db;

export type MonthlyBillingRunSummary = {
  scanned: number;
  charged: number;
  failed: number;
  skipped: number;
  receiptsQueued: number;
  failureEmailsQueued: number;
};

export function emptyMonthlyBillingRunSummary(): MonthlyBillingRunSummary {
  return {
    scanned: 0,
    charged: 0,
    failed: 0,
    skipped: 0,
    receiptsQueued: 0,
    failureEmailsQueued: 0
  };
}

export async function processDueDonationSubscriptions(input: {
  database?: DatabaseLike;
  now?: Date;
  limit?: number;
  processedByUserId?: string | null;
} = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const limit = Math.max(1, Math.min(100, input.limit ?? 25));
  const summary = emptyMonthlyBillingRunSummary();

  const subscriptionRows = await database
    .select({
      id: donationSubscriptions.id,
      campaignId: donationSubscriptions.campaignId,
      userId: donationSubscriptions.userId,
      paymentMethodId: donationSubscriptions.paymentMethodId,
      donorName: donationSubscriptions.donorName,
      donorEmail: donationSubscriptions.donorEmail,
      amount: donationSubscriptions.amount,
      currency: donationSubscriptions.currency,
      status: donationSubscriptions.status,
      providerSubscriptionReference: donationSubscriptions.providerSubscriptionReference,
      nextBillingAt: donationSubscriptions.nextBillingAt,
      campaignTitle: campaigns.title,
      paymentMethodStatus: userPaymentMethods.status,
      paymentMethodLast4: userPaymentMethods.last4
    })
    .from(donationSubscriptions)
    .innerJoin(campaigns, eq(donationSubscriptions.campaignId, campaigns.id))
    .leftJoin(userPaymentMethods, eq(donationSubscriptions.paymentMethodId, userPaymentMethods.id))
    .where(and(inArray(donationSubscriptions.status, [...activeSubscriptionStatuses]), lte(donationSubscriptions.nextBillingAt, now)))
    .orderBy(asc(donationSubscriptions.nextBillingAt))
    .limit(limit);

  summary.scanned = subscriptionRows.length;

  for (const subscription of subscriptionRows) {
    if (!isSubscriptionDue(subscription, now) || !subscription.nextBillingAt) {
      summary.skipped += 1;
      continue;
    }

    const idempotencyKey = monthlySubscriptionCycleKey(subscription.id, subscription.nextBillingAt);
    const [existingDonation] = await database
      .select({
        id: donations.id,
        status: donations.status
      })
      .from(donations)
      .where(eq(donations.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingDonation) {
      summary.skipped += 1;
      continue;
    }

    const amount = Number(subscription.amount);
    const providerResult = demoGatewayChargeSubscription({
      idempotencyKey,
      amount,
      currency: subscription.currency,
      paymentMethod: {
        status: subscription.paymentMethodStatus,
        last4: subscription.paymentMethodLast4
      },
      now
    });

    const [donation] = await database
      .insert(donations)
      .values({
        campaignId: subscription.campaignId,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        idempotencyKey,
        donorName: subscription.donorName,
        donorEmail: subscription.donorEmail,
        amount: subscription.amount,
        currency: subscription.currency,
        status: "created",
        message: `Monthly contribution for ${subscription.campaignTitle}`,
        createdAt: now
      })
      .returning({ id: donations.id });

    await database.insert(paymentTransactions).values({
      donationId: donation.id,
      paymentMethodId: subscription.paymentMethodId,
      provider: providerResult.provider,
      providerReference: providerResult.providerReference,
      status: "created",
      payload: {
        method: "recurring_subscription",
        contributionIntent: "monthly",
        interval: "month",
        subscriptionId: subscription.id,
        providerSubscriptionReference: subscription.providerSubscriptionReference,
        subscriptionCycleAt: subscription.nextBillingAt.toISOString(),
        providerStatus: providerResult.rawStatus,
        idempotencyKey,
        ...providerResult.metadata
      },
      updatedAt: now
    });

    const result = await transitionDonationPayment(database, {
      donationId: donation.id,
      nextStatus: providerResult.status,
      providerReference: providerResult.providerReference,
      paymentMethodId: subscription.paymentMethodId,
      providerPayload: {
        method: "recurring_subscription",
        contributionIntent: "monthly",
        interval: "month",
        subscriptionId: subscription.id,
        providerSubscriptionReference: subscription.providerSubscriptionReference,
        subscriptionCycleAt: subscription.nextBillingAt.toISOString(),
        providerStatus: providerResult.rawStatus,
        providerProcessedAt: providerResult.processedAt.toISOString(),
        idempotencyKey,
        ...providerResult.metadata
      },
      processedByUserId: input.processedByUserId ?? null,
      operationType: "subscription_charge",
      now
    });

    if (providerResult.status === "paid") {
      summary.charged += 1;

      if (result?.receiptCreated && result.receiptNumber) {
        await sendTransactionalEmail({
          userId: subscription.userId,
          recipientEmail: subscription.donorEmail,
          subject: "Your monthly Terumbu donation receipt",
          template: "monthly_donation_receipt",
          payload: {
            receiptNumber: result.receiptNumber,
            donationId: donation.id,
            campaign: subscription.campaignTitle,
            amount,
            currency: subscription.currency
          }
        });
        summary.receiptsQueued += 1;
      }
    } else {
      summary.failed += 1;

      await database
        .update(donationSubscriptions)
        .set({
          status: "past_due",
          nextBillingAt: nextFailedSubscriptionRetryDate(now),
          updatedAt: now
        })
        .where(eq(donationSubscriptions.id, subscription.id));

      await sendTransactionalEmail({
        userId: subscription.userId,
        recipientEmail: subscription.donorEmail,
        subject: "Monthly Terumbu donation payment failed",
        template: "monthly_donation_failed",
        payload: {
          subscriptionId: subscription.id,
          donationId: donation.id,
          campaign: subscription.campaignTitle,
          amount,
          currency: subscription.currency,
          retryAt: nextFailedSubscriptionRetryDate(now).toISOString()
        }
      });
      summary.failureEmailsQueued += 1;
    }
  }

  return summary;
}
