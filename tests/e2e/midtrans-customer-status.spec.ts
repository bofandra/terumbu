import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import { campaigns, donations, paymentTransactions } from "../../src/db/schema";
import { checkoutStatusTokenHash, newCheckoutStatusToken } from "../../src/lib/checkout-status-access";

test("private status API rejects guessed URLs and allows only the guest checkout cookie", async ({ browser, request }) => {
  let donationId: string | null = null;
  let providerReference: string | null = null;
  const context = await browser.newContext();
  try {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).limit(1);
    expect(campaign?.id).toBeTruthy();
    const token = newCheckoutStatusToken();
    const [donation] = await db.insert(donations).values({
      campaignId: campaign.id,
      idempotencyKey: "donation-" + randomUUID().replaceAll("-", "").slice(0, 24),
      amount: "100000.00",
      currency: "IDR",
      donorName: "Guest tester",
      donorEmail: "guest@example.org",
      status: "pending"
    }).returning({ id: donations.id });
    donationId = donation.id;
    providerReference = "TRB-DON-" + randomUUID();
    await db.insert(paymentTransactions).values({
      donationId,
      provider: "midtrans",
      providerReference,
      status: "pending",
      payload: { method: "midtrans_snap", checkoutAccessHash: checkoutStatusTokenHash(token) }
    });

    const url = "/api/checkout/midtrans-status?type=donation&id=" + donationId;
    const anonymous = await request.get(url + "&status=paid");
    expect(anonymous.status()).toBe(404);
    expect(anonymous.headers()["cache-control"]).toContain("no-store");

    await context.addCookies([{
      name: "trb_midtrans_access_" + donationId,
      value: newCheckoutStatusToken(),
      domain: "127.0.0.1",
      path: "/api/checkout/midtrans-status",
      httpOnly: true, sameSite: "Lax"
    }]);
    expect((await context.request.get(url)).status()).toBe(404);

    await context.addCookies([{
      name: "trb_midtrans_access_" + donationId,
      value: token,
      domain: "127.0.0.1",
      path: "/api/checkout/midtrans-status",
      httpOnly: true, sameSite: "Lax"
    }]);
    const pending = await context.request.get(url + "&status=paid");
    expect(pending.status()).toBe(200);
    expect(await pending.json()).toMatchObject({ type: "donation", stage: "pending", final: false });
    const text = await pending.text();
    expect(text).not.toContain("guest@example.org");
    expect(text).not.toContain("TRB-DON-");

    await db.update(donations).set({ status: "paid" }).where(eq(donations.id, donationId));
    const settled = await context.request.get(url);
    expect(settled.status()).toBe(200);
    expect(await settled.json()).toMatchObject({ stage: "confirmed", final: true });
    expect((await request.get(url)).status()).toBe(404);
  } finally {
    await context.close();
    if (providerReference) await db.delete(paymentTransactions).where(eq(paymentTransactions.providerReference, providerReference));
    if (donationId) await db.delete(donations).where(eq(donations.id, donationId));
  }
});
