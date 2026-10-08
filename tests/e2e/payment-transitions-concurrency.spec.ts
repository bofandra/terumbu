import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { campaignFixture, donationState, enableDonationPaymentInstructions, loginAs, tinyPng } from "./support";

test("parallel donation verifications count a single payment once", async ({ browser }) => {
  test.setTimeout(120_000);
  await enableDonationPaymentInstructions();
  const fixture = await campaignFixture();
  const donor = `Concurrent E2E ${randomUUID()}`;
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const userContext = await browser.newContext();
  const adminOne = await browser.newContext();
  const adminTwo = await browser.newContext();

  try {
    const userPage = await userContext.newPage();
    await loginAs(userPage, "user.demo@terumbu.eco", "/checkout/donation?campaign=restore-raja-ampat-reefs&amount=25");
    await userPage.locator('input[name="donorName"]').fill(donor);
    await userPage.locator('input[name="donorEmail"]').fill("user.demo@terumbu.eco");
    await userPage.locator('input[name="paymentReference"]').fill(`E2E-${randomUUID()}`);
    await userPage.locator('input[name="paymentProofFile"]').setInputFiles(tinyPng);
    await Promise.all([
      userPage.waitForURL(/\/checkout\/success\?status=pending&type=donation&id=/),
      userPage.getByRole("button", { name: "Submit payment proof" }).click()
    ]);

    const donationId = new URL(userPage.url()).searchParams.get("id")!;
    const [before] = await sql<{ raised_amount: string; donor_count: number }[]>`
      select raised_amount::text, donor_count from campaigns where id = ${fixture.campaign_id}
    `;
    const q = `/admin/campaigns/payments?donationQ=${encodeURIComponent(donor)}`;
    const pageOne = await adminOne.newPage();
    const pageTwo = await adminTwo.newPage();
    await Promise.all([
      loginAs(pageOne, "admin.demo@terumbu.eco", q),
      loginAs(pageTwo, "admin.demo@terumbu.eco", q)
    ]);
    const first = pageOne.locator("article").filter({ hasText: donor });
    const second = pageTwo.locator("article").filter({ hasText: donor });
    await expect(first.getByRole("button", { name: "Verify payment" })).toBeVisible();
    await expect(second.getByRole("button", { name: "Verify payment" })).toBeVisible();
    await Promise.all([
      first.getByRole("button", { name: "Verify payment" }).click(),
      second.getByRole("button", { name: "Verify payment" }).click()
    ]);

    await expect.poll(async () => (await donationState(donationId))?.status).toBe("paid");
    const [after] = await sql<{ raised_amount: string; donor_count: number }[]>`
      select raised_amount::text, donor_count from campaigns where id = ${fixture.campaign_id}
    `;
    expect(Number(after.raised_amount) - Number(before.raised_amount)).toBeCloseTo(25, 2);
    expect(after.donor_count - before.donor_count).toBe(1);
  } finally {
    await Promise.all([userContext.close(), adminOne.close(), adminTwo.close()]);
    await sql.end();
  }
});

test("parallel expedition verifications claim seats once", async ({ browser }) => {
  test.setTimeout(120_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const adminOne = await browser.newContext();
  const adminTwo = await browser.newContext();
  let bookingId: string | null = null;
  let departureId: string | null = null;

  try {
    const [expedition] = await sql<{ id: string }[]>`
      select id from expeditions where slug = 'raja-ampat-coral-restoration' and status = 'published' limit 1
    `;
    expect(expedition?.id).toBeTruthy();
    const code = `E2E-CONCURRENT-${randomUUID()}`;
    const starts = new Date(Date.now() + 90 * 86400_000);
    const ends = new Date(starts.getTime() + 3 * 86400_000);
    const [departure] = await sql<{ id: string }[]>`
      insert into expedition_departures (expedition_id, starts_at, ends_at, capacity, seats_booked, status)
      values (${expedition.id}, ${starts}, ${ends}, 5, 0, 'open') returning id
    `;
    departureId = departure.id;
    const [booking] = await sql<{ id: string }[]>`
      insert into expedition_bookings (expedition_id, departure_id, booking_code, contact_name, contact_email,
        participants_count, total_amount, currency, status, payment_status, booked_at)
      values (${expedition.id}, ${departureId}, ${code}, 'Concurrent E2E', 'user.demo@terumbu.eco',
        2, '100.00', 'USD', 'pending_payment', 'pending', now()) returning id
    `;
    bookingId = booking.id;
    await sql`
      insert into expedition_booking_payments (booking_id, provider, provider_reference, status, payload)
      values (${bookingId}, 'manual_external', ${code}, 'pending', ${sql.json({ method: "manual_external" })})
    `;

    const q = `/admin/expeditions/payments?q=${encodeURIComponent(code)}&queue=payment`;
    const pageOne = await adminOne.newPage();
    const pageTwo = await adminTwo.newPage();
    await Promise.all([
      loginAs(pageOne, "admin.demo@terumbu.eco", q),
      loginAs(pageTwo, "admin.demo@terumbu.eco", q)
    ]);
    const first = pageOne.locator("article").filter({ hasText: code });
    const second = pageTwo.locator("article").filter({ hasText: code });
    await expect(first.getByRole("button", { name: "Confirm paid" })).toBeVisible();
    await expect(second.getByRole("button", { name: "Confirm paid" })).toBeVisible();
    await Promise.all([
      first.getByRole("button", { name: "Confirm paid" }).click(),
      second.getByRole("button", { name: "Confirm paid" }).click()
    ]);

    await expect.poll(async () => {
      const [row] = await sql<{ payment_status: string; seats_booked: number }[]>`
        select b.payment_status, d.seats_booked from expedition_bookings b
        join expedition_departures d on d.id = b.departure_id where b.id = ${bookingId}
      `;
      return row.payment_status;
    }).toBe("paid");
    const [result] = await sql<{ seats_booked: number }[]>`
      select seats_booked from expedition_departures where id = ${departureId}
    `;
    expect(result.seats_booked).toBe(2);
  } finally {
    await Promise.all([adminOne.close(), adminTwo.close()]);
    if (bookingId) await sql`delete from expedition_bookings where id = ${bookingId}`;
    if (departureId) await sql`delete from expedition_departures where id = ${departureId}`;
    await sql.end();
  }
});
