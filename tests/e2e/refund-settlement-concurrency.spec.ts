import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("two admins can settle one donation refund only once", async ({ browser }) => {
  test.setTimeout(120_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const adminOne = await browser.newContext();
  const adminTwo = await browser.newContext();
  let donationId: string | null = null;
  let campaignId: string | null = null;
  let refundCompleted = false;

  try {
    const [campaign] = await sql<{ id: string; raised_amount: string; donor_count: number }[]>`
      select id, raised_amount::text, donor_count
      from campaigns where slug = 'restore-raja-ampat-reefs' limit 1
    `;
    expect(campaign?.id).toBeTruthy();
    campaignId = campaign.id;
    const donor = `E2E Refund ${randomUUID()}`;
    const [donation] = await sql<{ id: string }[]>`
      insert into donations (campaign_id, donor_name, donor_email, amount, currency, status)
      values (${campaignId}, ${donor}, 'user.demo@terumbu.eco', 25, 'USD', 'paid')
      returning id
    `;
    donationId = donation.id;
    await sql`
      insert into payment_transactions (donation_id, provider, provider_reference, status, payload)
      values (${donationId}, 'manual_external', ${`E2E-PAY-${randomUUID()}`}, 'paid', ${sql.json({ method: "manual_external" })})
    `;
    await sql`
      update campaigns
      set raised_amount = raised_amount + 25, donor_count = donor_count + 1
      where id = ${campaignId}
    `;
    await sql`
      insert into payment_operations (operation_code, operation_type, entity_type, donation_id, status, amount, currency, reason)
      values (${`E2E-REFUND-${randomUUID()}`}, 'refund', 'donation', ${donationId},
        'pending', 25, 'USD', 'E2E refund race')
    `;

    const path = `/admin/campaigns/payments?donationQ=${encodeURIComponent(donor)}&donationStatus=refund`;
    const pageOne = await adminOne.newPage();
    const pageTwo = await adminTwo.newPage();
    await Promise.all([
      loginAs(pageOne, "admin.demo@terumbu.eco", path),
      loginAs(pageTwo, "admin.demo@terumbu.eco", path)
    ]);
    const cardOne = pageOne.locator("article").filter({ hasText: donor });
    const cardTwo = pageTwo.locator("article").filter({ hasText: donor });
    await expect(cardOne.getByRole("button", { name: "Approve refund" })).toBeVisible();
    await expect(cardTwo.getByRole("button", { name: "Approve refund" })).toBeVisible();
    await Promise.all([
      cardOne.getByRole("button", { name: "Approve refund" }).click(),
      cardTwo.getByRole("button", { name: "Approve refund" }).click()
    ]);

    await expect.poll(async () => {
      const [row] = await sql<{ status: string }[]>`
        select status from donations where id = ${donationId}
      `;
      return row.status;
    }).toBe("refunded");

    const [result] = await sql<{ raised_amount: string; donor_count: number; operations: number; completed: number }[]>`
      select c.raised_amount::text, c.donor_count,
      (select count(*)::int from payment_operations po
        where po.donation_id = ${donationId} and po.operation_type = 'refund_settlement') as operations,
      (select count(*)::int from payment_operations po
        where po.donation_id = ${donationId} and po.operation_type = 'refund'
          and po.status = 'completed') as completed
      from campaigns c where c.id = ${campaignId}
    `;
    expect(Number(result.raised_amount)).toBeCloseTo(Number(campaign.raised_amount), 2);
    expect(result.donor_count).toBe(campaign.donor_count);
    expect(result.operations).toBe(1);
    expect(result.completed).toBe(1);
    refundCompleted = true;
  } finally {
    await Promise.all([adminOne.close(), adminTwo.close()]);
    if (donationId) {
      if (!refundCompleted && campaignId) {
        const [row] = await sql<{ status: string }[]>`select status from donations where id = ${donationId}`;
        if (row?.status === "paid") {
          await sql`update campaigns set raised_amount = greatest(raised_amount - 25, 0), donor_count = greatest(donor_count - 1, 0) where id = ${campaignId}`;
        }
      }
      await sql`delete from payment_operations where donation_id = ${donationId}`;
      await sql`delete from payment_transactions where donation_id = ${donationId}`;
      await sql`delete from donations where id = ${donationId}`;
    }
    await sql.end();
  }
});

test("two admins can settle one expedition refund without releasing seats twice", async ({ browser }) => {
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
    const starts = new Date(Date.now() + 100 * 86400_000);
    const ends = new Date(starts.getTime() + 4 * 86400_000);
    const [departure] = await sql<{ id: string }[]>`
      insert into expedition_departures (expedition_id, starts_at, ends_at, capacity, seats_booked, status)
      values (${expedition.id}, ${starts}, ${ends}, 8, 2, 'open') returning id
    `;
    departureId = departure.id;
    const bookingCode = `E2E-REFUND-${randomUUID()}`;
    const [booking] = await sql<{ id: string }[]>`
      insert into expedition_bookings
        (expedition_id, departure_id, booking_code, contact_name, contact_email,
        participants_count, total_amount, currency, status, payment_status, confirmed_at)
      values (${expedition.id}, ${departureId}, ${bookingCode}, 'Refund E2E', 'user.demo@terumbu.eco',
        2, 100, 'USD', 'confirmed', 'paid', now()) returning id
    `;
    bookingId = booking.id;
    await sql`
      insert into expedition_booking_payments (booking_id, provider, provider_reference, status, payload)
      values (${bookingId}, 'manual_external', ${`E2E-PAY-${randomUUID()}`}, 'paid', ${sql.json({ method: "manual_external" })})
    `;
    await sql`
      insert into payment_operations (operation_code, operation_type, entity_type, booking_id, status, amount, currency, reason)
      values (${`E2E-REFUND-${randomUUID()}`}, 'refund', 'expedition_booking', ${bookingId},
        'pending', 100, 'USD', 'E2E refund race')
    `;

    const path = `/admin/expeditions/payments?q=${encodeURIComponent(bookingCode)}&queue=refund`;
    const pageOne = await adminOne.newPage();
    const pageTwo = await adminTwo.newPage();
    await Promise.all([
      loginAs(pageOne, "admin.demo@terumbu.eco", path),
      loginAs(pageTwo, "admin.demo@terumbu.eco", path)
    ]);
    const cardOne = pageOne.locator("article").filter({ hasText: bookingCode });
    const cardTwo = pageTwo.locator("article").filter({ hasText: bookingCode });
    await expect(cardOne.getByRole("button", { name: "Approve refund" })).toBeVisible();
    await expect(cardTwo.getByRole("button", { name: "Approve refund" })).toBeVisible();
    await Promise.all([
      cardOne.getByRole("button", { name: "Approve refund" }).click(),
      cardTwo.getByRole("button", { name: "Approve refund" }).click()
    ]);

    await expect.poll(async () => {
      const [row] = await sql<{ payment_status: string }[]>`
        select payment_status from expedition_bookings where id = ${bookingId}
      `;
      return row.payment_status;
    }).toBe("refunded");

    const [result] = await sql<{ seats_booked: number; operations: number; completed: number }[]>`
      select d.seats_booked,
        (select count(*)::int from payment_operations po where po.booking_id = ${bookingId}
          and po.operation_type = 'refund_settlement') as operations,
        (select count(*)::int from payment_operations po where po.booking_id = ${bookingId}
          and po.operation_type = 'refund' and po.status = 'completed') as completed
      from expedition_departures d where d.id = ${departureId}
    `;
    expect(result.seats_booked).toBe(0);
    expect(result.operations).toBe(1);
    expect(result.completed).toBe(1);
  } finally {
    await Promise.all([adminOne.close(), adminTwo.close()]);
    if (bookingId) {
      await sql`delete from payment_operations where booking_id = ${bookingId}`;
      await sql`delete from expedition_booking_payments where booking_id = ${bookingId}`;
      await sql`delete from expedition_bookings where id = ${bookingId}`;
    }
    if (departureId) await sql`delete from expedition_departures where id = ${departureId}`;
    await sql.end();
  }
});
