import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import {
  campaigns, checkoutStatusAccessTokens, checkoutStatusRequestLimits,
  donations, emailLogs, paymentTransactions
} from "../../src/db/schema";
import { checkoutRecoveryThrottleKey, requestGuestCheckoutRecovery } from "../../src/lib/checkout-status-recovery";

test("verified email on a new device provides scoped, one-time guest payment access", async ({ page, request }) => {
  test.setTimeout(120_000);
  const email = "guest-" + randomUUID() + "@example.org";
  const client = "e2e-" + randomUUID();
  const providerReference = "TRB-DON-" + randomUUID();
  let donationId: string | null = null;
  const originalFetch = globalThis.fetch;
  const originalResendKey = process.env.RESEND_API_KEY;
  const originalResendFrom = process.env.RESEND_FROM_EMAIL;
  let emailBody = "";

  try {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).limit(1);
    expect(campaign).toBeTruthy();
    const [donation] = await db.insert(donations).values({
      campaignId: campaign.id, currency: "IDR",
      amount: "100000.00", status: "pending",
      donorName: "Guest traveler", donorEmail: email
    }).returning({ id: donations.id });
    donationId = donation.id;
    await db.insert(paymentTransactions).values({
      donationId, provider: "midtrans", providerReference, status: "pending",
      payload: { method: "midtrans_snap" }
    });

    process.env.RESEND_API_KEY = "re_test_placeholder";
    process.env.RESEND_FROM_EMAIL = "Terumbu <noreply@example.org>";
    globalThis.fetch = (async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) !== "https://api.resend.com/emails") {
        throw new Error("Unexpected request during guest recovery test.");
      }
      const body = JSON.parse(String(options?.body)) as { text: string; to: string };
      expect(body.to).toBe(email);
      emailBody = body.text;
      return new Response(JSON.stringify({ id: "e2e-mail" }), { status: 200 });
    }) as typeof fetch;

    await requestGuestCheckoutRecovery(email, client);
    globalThis.fetch = originalFetch;
    const match = emailBody.match(/checkout\/access\?token=([0-9a-f]{64})/);
    expect(match).toBeTruthy();
    const token = match![1];

    const [emailLog] = await db.select({ payload: emailLogs.payload }).from(emailLogs)
      .where(eq(emailLogs.recipientEmail, email)).limit(1);
    expect(emailLog).toBeTruthy();
    expect(JSON.stringify(emailLog.payload)).not.toContain(token);
    expect(JSON.stringify(emailLog.payload)).toContain("recoveryLinksRedacted");

    const endpoint = "/api/checkout/midtrans-status?type=donation&id=" + donationId;
    expect((await request.get(endpoint)).status()).toBe(404);

    await page.goto("/checkout/access?token=" + token);
    await expect(page.getByRole("button", { name: "Confirm and open payment status" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm and open payment status" }).click();
    await expect(page).toHaveURL(/\/checkout\/success\?/);

    const allowed = await page.context().request.get(endpoint);
    expect(allowed.status()).toBe(200);
    expect(await allowed.json()).toMatchObject({ stage: "pending", final: false });

    const [recoveryRow] = await db.select({
      usedAt: checkoutStatusAccessTokens.usedAt
    }).from(checkoutStatusAccessTokens)
      .where(eq(checkoutStatusAccessTokens.tokenHash,
        // Hash recovery token before reading database.
        (await import("../../src/lib/checkout-status-access")).checkoutStatusTokenHash(token)))
      .limit(1);
    expect(recoveryRow.usedAt).not.toBeNull();

    await page.goto("/checkout/access?token=" + token);
    await page.getByRole("button", { name: "Confirm and open payment status" }).click();
    await expect(page).toHaveURL(/\/checkout\/recover\?error=expired/);

    const deviceGrants = await db.select({ hash: checkoutStatusAccessTokens.tokenHash })
      .from(checkoutStatusAccessTokens)
      .where(and(eq(checkoutStatusAccessTokens.checkoutId, donationId),
        eq(checkoutStatusAccessTokens.purpose, "device_access")));
    expect(deviceGrants).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendKey;
    if (originalResendFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalResendFrom;

    if (donationId) {
      await db.delete(checkoutStatusAccessTokens).where(eq(checkoutStatusAccessTokens.checkoutId, donationId));
      await db.delete(paymentTransactions).where(eq(paymentTransactions.providerReference, providerReference));
      await db.delete(donations).where(eq(donations.id, donationId));
    }
    await db.delete(emailLogs).where(eq(emailLogs.recipientEmail, email));
    await db.delete(checkoutStatusRequestLimits).where(inArray(checkoutStatusRequestLimits.keyHash, [
      checkoutRecoveryThrottleKey("checkout-email", email),
      checkoutRecoveryThrottleKey("checkout-client", client)
    ]));
  }
});
