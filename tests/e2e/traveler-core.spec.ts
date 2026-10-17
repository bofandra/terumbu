import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { createPasswordHash } from "../../src/lib/password";
import { acceptTravelDeparture, confirmTravelBriefing, decideTravelBookingChange, getBookingWorkspace, getPendingTravelChanges,
  getRequestWorkspace, postTravelMessage, proposeTravelDeparture, requestTravelBookingChange, saveTravelPreparation } from "../../src/lib/expedition-journeys";
import { TravelError } from "../../src/lib/expedition-travel";
import { getExpeditionMarketplaceResults } from "../../src/lib/queries";
import { parseExpeditionSearchFilters } from "../../src/lib/expedition-marketplace";
import { rolePassword } from "./support";

test.describe.configure({ mode: "serial" });
const sql = postgres(process.env.DATABASE_URL!, { max: 2 });
test.afterAll(async () => { await sql.end(); });

async function fixture(targetCapacity = 3) {
  const tag = randomUUID();
  const password = createPasswordHash(rolePassword);
  const people = await sql<{ id: string; email: string; name: string }[]>`
    insert into users (email, name, password_hash, email_verified_at)
    values (${`traveler-${tag}@example.org`}, 'Journey Traveler', ${password}, now()),
      (${`host-${tag}@example.org`}, 'Journey Host', ${password}, now()),
      (${`other-${tag}@example.org`}, 'Other Host', ${password}, now()),
      (${`admin-${tag}@example.org`}, 'Journey Admin', ${password}, now()) returning id, email, name`;
  const [traveler, host, other, admin] = people;
  for (const [person, role] of [[traveler, "user"], [host, "partner"], [other, "partner"], [admin, "admin"]] as const) {
    await sql`insert into user_roles (user_id, role_id) select ${person.id}, id from roles where key = ${role}`;
  }
  const [org] = await sql`insert into organizations (name, slug, type) values ('Journey Host', ${`journey-${tag}`}, 'ngo') returning id`;
  await sql`insert into organization_users (organization_id, user_id, role, status) values (${org.id}, ${host.id}, 'manager', 'active')`;
  const [campaign] = await sql`insert into campaigns (organization_id, title, slug, summary, category, region, goal_amount, impact_unit, impact_target, status)
    values (${org.id}, 'Journey Campaign', ${`journey-${tag}`}, 'Test field work', 'coral', 'Bali', 1000, 'corals', 10, 'published') returning id`;
  const [trip] = await sql`insert into expeditions (title, slug, region, duration_days, base_price, currency, summary, related_campaign_id, status)
    values (${`Journey ${tag}`}, ${`journey-${tag}`}, 'Bali', 2, 100, 'USD', 'Test conservation experience', ${campaign.id}, 'published') returning id, slug, title`;
  const startsAt = new Date(Date.now() + 120 * 86400000);
  const targetStartsAt = new Date(startsAt.getTime() + 10 * 86400000);
  const [source] = await sql`insert into expedition_departures (expedition_id, starts_at, ends_at, capacity, seats_booked, status)
    values (${trip.id}, ${startsAt}, ${new Date(startsAt.getTime() + 86400000)}, 5, 1, 'open') returning id`;
  const [target] = await sql`insert into expedition_departures (expedition_id, starts_at, ends_at, capacity, seats_booked, status)
    values (${trip.id}, ${targetStartsAt}, ${new Date(targetStartsAt.getTime() + 86400000)}, ${targetCapacity}, 0, 'open') returning id`;
  const [booking] = await sql`insert into expedition_bookings (expedition_id, departure_id, user_id, booking_code, contact_name, contact_email, participants_count, total_amount, currency, status, payment_status)
    values (${trip.id}, ${source.id}, ${traveler.id}, ${`JOURNEY-${tag}`}, 'Journey Traveler', ${traveler.email}, 1, 100, 'USD', 'confirmed', 'paid') returning id`;
  const [participant] = await sql`insert into expedition_participants (booking_id, full_name) values (${booking.id}, 'Journey Traveler') returning id`;
  const [request] = await sql`insert into expedition_interest_requests (expedition_id, user_id, request_code, request_type, contact_name, contact_email, participants_count, message)
    values (${trip.id}, ${traveler.id}, ${`REQUEST-${tag}`}, 'question', 'Journey Traveler', ${traveler.email}, 1, 'Can I join the next departure?') returning id`;
  const actors = { traveler: { id: traveler.id, roles: ["user"] }, host: { id: host.id, roles: ["partner"] },
    other: { id: other.id, roles: ["partner"] }, admin: { id: admin.id, roles: ["admin"] } };
  async function cleanup() {
    const ids = people.map(person => person.id);
    await sql`delete from user_notifications where user_id in ${sql(ids)}`;
    await sql`delete from admin_audit_logs where actor_user_id in ${sql(ids)}`;
    await sql`delete from payment_operations where booking_id in (select id from expedition_bookings where expedition_id = ${trip.id})`;
    await sql`delete from expedition_interest_requests where expedition_id = ${trip.id}`;
    await sql`delete from expedition_booking_payments where booking_id in (select id from expedition_bookings where expedition_id = ${trip.id})`;
    await sql`delete from expedition_bookings where expedition_id = ${trip.id}`;
    await sql`delete from expedition_departures where expedition_id = ${trip.id}`;
    await sql`delete from expeditions where id = ${trip.id}`;
    await sql`delete from campaigns where id = ${campaign.id}`;
    await sql`delete from organizations where id = ${org.id}`;
    await sql`delete from sessions where user_id in ${sql(ids)}`;
    await sql`delete from user_roles where user_id in ${sql(ids)}`;
    await sql`delete from users where id in ${sql(ids)}`;
  }
  const changeForm = (count = 1, names = "Journey Traveler") => {
    const form = new FormData();
    form.set("departureId", target.id); form.set("participantsCount", String(count));
    form.set("participantNames", names); form.set("reason", "My travel dates have changed.");
    return form;
  };
  return { traveler, host, other, admin, actors, trip, source, target, booking, participant, request, changeForm, cleanup };
}

test("traveler and owning host exchange messages and agree a departure; other partners cannot read or reply", async () => {
  const f = await fixture();
  try {
    await assert.rejects(getRequestWorkspace(f.request.id, f.actors.other), (error: unknown) => error instanceof TravelError && error.code === "not-found");
    await assert.rejects(postTravelMessage(f.request.id, "Secret reply", f.actors.other));
    await postTravelMessage(f.request.id, "I can arrive ten days later.", f.actors.traveler);
    await postTravelMessage(f.request.id, "That works for our field team.", f.actors.host);
    await proposeTravelDeparture(f.request.id, f.target.id, f.actors.host);
    await assert.rejects(proposeTravelDeparture(f.request.id, f.target.id, f.actors.traveler));
    const destination = await acceptTravelDeparture(f.request.id, f.actors.traveler);
    expect(destination).toContain(`requestId=${f.request.id}`);
    expect(destination).toContain(`departure=${f.target.id}`);
    const workspace = await getRequestWorkspace(f.request.id, f.actors.traveler);
    expect(workspace.messages).toHaveLength(3);
    expect(workspace.request.acceptedAt).toBeTruthy();
  } finally { await f.cleanup(); }
});

test("preparation persists individual emergency contacts; only owning hosts confirm briefings", async () => {
  const f = await fixture();
  try {
    const form = new FormData(); form.set(`emergency:${f.participant.id}`, "Emergency Family +628123456789");
    form.set("requirementsAccepted", "on"); form.set("equipmentReviewed", "on");
    await assert.rejects(saveTravelPreparation(f.booking.id, form, f.actors.other));
    await saveTravelPreparation(f.booking.id, form, f.actors.traveler);
    await assert.rejects(confirmTravelBriefing(f.booking.id, f.actors.traveler));
    await assert.rejects(confirmTravelBriefing(f.booking.id, f.actors.other));
    await confirmTravelBriefing(f.booking.id, f.actors.host);
    const workspace = await getBookingWorkspace(f.booking.id, f.actors.traveler);
    expect(workspace.participants[0].emergencyContact).toContain("+628123456789");
    expect(workspace.booking.metadata).toMatchObject({ waiverAccepted: "true", briefingCompleted: "true" });
  } finally { await f.cleanup(); }
});

test("booking changes remain pending until approval and recheck active holds atomically", async () => {
  const f = await fixture(1);
  try {
    await requestTravelBookingChange(f.booking.id, f.changeForm(), f.actors.traveler);
    await assert.rejects(requestTravelBookingChange(f.booking.id, f.changeForm(), f.actors.traveler));
    let workspace = await getBookingWorkspace(f.booking.id, f.actors.host);
    expect(workspace.booking.departureId).toBe(f.source.id);
    const change = workspace.changes[0];
    const [hold] = await sql`insert into expedition_bookings (expedition_id, departure_id, booking_code, contact_name, contact_email, participants_count, total_amount, status, payment_status, hold_expires_at)
      values (${f.trip.id}, ${f.target.id}, ${randomUUID()}, 'Held seat', 'held@example.org', 1, 100, 'pending_payment', 'pending', now() + interval '10 minutes') returning id`;
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "approve", "", "", f.actors.host), (error: unknown) => error instanceof TravelError && error.code === "capacity");
    await sql`update expedition_bookings set hold_expires_at = now() - interval '1 minute' where id = ${hold.id}`;
    const results = await Promise.allSettled([1, 2].map(() => decideTravelBookingChange(f.booking.id, change.id, "approve", "Approved", "", f.actors.host)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    workspace = await getBookingWorkspace(f.booking.id, f.actors.traveler);
    expect(workspace.booking.departureId).toBe(f.target.id);
    expect(workspace.booking.metadata).toMatchObject({ briefingCompleted: "false", waiverAccepted: "false" });
    const rows = await sql`select id, seats_booked from expedition_departures where expedition_id = ${f.trip.id}`;
    expect(rows.find(row => row.id === f.source.id)?.seats_booked).toBe(0);
    expect(rows.find(row => row.id === f.target.id)?.seats_booked).toBe(1);
  } finally { await f.cleanup(); }
});

test("participant changes require traveler quote acceptance and finance reconciliation before approval", async () => {
  const f = await fixture();
  try {
    await requestTravelBookingChange(f.booking.id, f.changeForm(2, "Journey Traveler\nSecond Traveler"), f.actors.traveler);
    const workspace = await getBookingWorkspace(f.booking.id, f.actors.host);
    const change = workspace.changes[0];
    expect(change.quotedAmount).toBe("200.00");
    expect(await getPendingTravelChanges(f.trip.id, f.actors.host)).toHaveLength(1);
    await assert.rejects(getPendingTravelChanges(f.trip.id, f.actors.other));
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "approve", "", "", f.actors.host));
    await decideTravelBookingChange(f.booking.id, change.id, "accept-quote", "", "", f.actors.traveler);
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "settle", "", "RECON-TEST-001", f.actors.host));
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "approve", "", "", f.actors.host));
    await decideTravelBookingChange(f.booking.id, change.id, "settle", "", "RECON-TEST-001", f.actors.admin);
    await decideTravelBookingChange(f.booking.id, change.id, "approve", "Verified and approved", "", f.actors.host);
    const updated = await getBookingWorkspace(f.booking.id, f.actors.traveler);
    expect(updated.booking.totalAmount).toBe("200.00");
    expect(updated.participants.map(item => item.fullName).sort()).toEqual(["Journey Traveler", "Second Traveler"]);
    expect(updated.changes[0].status).toBe("approved");
    const operations = await sql`select id from payment_operations where booking_id = ${f.booking.id} and operation_type = 'booking_change_adjustment'`;
    expect(operations).toHaveLength(1);
  } finally { await f.cleanup(); }
});

test("finance can reconcile a reversal after capacity disappears, then close the change without stranding funds", async () => {
  const f = await fixture(3);
  try {
    await requestTravelBookingChange(f.booking.id, f.changeForm(2, "Journey Traveler\nSecond Traveler"), f.actors.traveler);
    const workspace = await getBookingWorkspace(f.booking.id, f.actors.host);
    const change = workspace.changes[0];
    await decideTravelBookingChange(f.booking.id, change.id, "accept-quote", "", "", f.actors.traveler);
    await decideTravelBookingChange(f.booking.id, change.id, "settle", "", "RECON-TEST-PAYMENT", f.actors.admin);
    await sql`insert into expedition_bookings (expedition_id, departure_id, booking_code, contact_name, contact_email, participants_count, total_amount, status, payment_status, hold_expires_at)
      values (${f.trip.id}, ${f.target.id}, ${randomUUID()}, 'Held seats', 'held@example.org', 2, 200, 'pending_payment', 'pending', now() + interval '10 minutes')`;
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "approve", "", "", f.actors.host));
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "cancel", "", "", f.actors.traveler));
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "reverse-adjustment", "", "RECON-TEST-REVERSAL", f.actors.host));
    await decideTravelBookingChange(f.booking.id, change.id, "reverse-adjustment", "", "RECON-TEST-REVERSAL", f.actors.admin);
    await assert.rejects(decideTravelBookingChange(f.booking.id, change.id, "reverse-adjustment", "", "RECON-TEST-REVERSAL", f.actors.admin));
    await decideTravelBookingChange(f.booking.id, change.id, "decline", "The requested seats are no longer available.", "", f.actors.host);
    const updated = await getBookingWorkspace(f.booking.id, f.actors.traveler);
    expect(updated.booking.departureId).toBe(f.source.id);
    expect(updated.booking.totalAmount).toBe("100.00");
    expect(updated.changes[0].status).toBe("declined");
    const [ledger] = await sql`select count(*)::int as count, sum((metadata->>'signedDifference')::numeric)::text as net
      from payment_operations where booking_id = ${f.booking.id} and operation_type in ('booking_change_adjustment', 'booking_change_adjustment_reversal')`;
    expect(ledger.count).toBe(2);
    expect(Number(ledger.net)).toBe(0);
  } finally { await f.cleanup(); }
});

test("two different reschedules competing for the last seat approve exactly one booking", async () => {
  const f = await fixture(1);
  try {
    const [second] = await sql`insert into expedition_bookings (expedition_id, departure_id, user_id, booking_code, contact_name, contact_email, participants_count, total_amount, currency, status, payment_status)
      values (${f.trip.id}, ${f.source.id}, ${f.traveler.id}, ${randomUUID()}, 'Second Traveler', ${f.traveler.email}, 1, 100, 'USD', 'confirmed', 'paid') returning id`;
    await sql`insert into expedition_participants (booking_id, full_name) values (${second.id}, 'Second Traveler')`;
    await sql`update expedition_departures set seats_booked = 2 where id = ${f.source.id}`;
    await requestTravelBookingChange(f.booking.id, f.changeForm(), f.actors.traveler);
    await requestTravelBookingChange(second.id, f.changeForm(1, "Second Traveler"), f.actors.traveler);
    const changes = await sql`select id, booking_id from expedition_booking_changes where booking_id in (${f.booking.id}, ${second.id})`;
    const results = await Promise.allSettled(changes.map(change => decideTravelBookingChange(change.booking_id, change.id, "approve", "Approved", "", f.actors.host)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rows = await sql`select id, seats_booked from expedition_departures where expedition_id = ${f.trip.id}`;
    expect(rows.find(row => row.id === f.source.id)?.seats_booked).toBe(1);
    expect(rows.find(row => row.id === f.target.id)?.seats_booked).toBe(1);
    const approved = await sql`select id from expedition_booking_changes where booking_id in (${f.booking.id}, ${second.id}) and status = 'approved'`;
    expect(approved).toHaveLength(1);
  } finally { await f.cleanup(); }
});

test("mobile traveler can complete preparation and submit a reschedule through the browser", async ({ browser }) => {
  test.setTimeout(120000);
  const f = await fixture();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`/login?next=${encodeURIComponent(`/expedition-bookings/${f.booking.id}`)}`);
    await page.locator('input[name="email"]').fill(f.traveler.email);
    await page.locator('input[name="password"]').fill(rolePassword);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.waitForURL(`**/expedition-bookings/${f.booking.id}`);
    await page.locator(`input[name="emergency:${f.participant.id}"]`).fill("My Family +628123456789");
    await page.locator('input[name="requirementsAccepted"]').check();
    await page.locator('input[name="equipmentReviewed"]').check();
    await page.getByRole("button", { name: "Save preparation", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Changes saved" })).toBeVisible();
    const changeForm = page.locator('form').filter({ has: page.locator('textarea[name="participantNames"]') });
    await changeForm.locator('select[name="departureId"]').selectOption(f.target.id);
    await changeForm.locator('textarea[name="reason"]').fill("My travel dates have changed.");
    await page.getByRole("button", { name: "Request change", exact: true }).click();
    await expect(page.getByText("Waiting for host approval.", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("mobile-trip-preparation.png"), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    const hostContext = await browser.newContext();
    try {
      const hostPage = await hostContext.newPage();
      await hostPage.goto(`/login?next=${encodeURIComponent(`/partner/expeditions/${f.trip.id}?tab=bookings`)}`);
      await hostPage.locator('input[name="email"]').fill(f.host.email);
      await hostPage.locator('input[name="password"]').fill(rolePassword);
      await hostPage.getByRole("button", { name: "Login", exact: true }).click();
      await expect(hostPage.getByRole("heading", { name: "Booking changes awaiting review (1)", exact: true })).toBeVisible({ timeout: 30000 });
    } finally { await hostContext.close(); }
  } finally { await context.close(); await f.cleanup(); }
});

test("catalog search combines dates, party size, budget and live held seats on the same departure", async ({ page }) => {
  const f = await fixture(3);
  try {
    const [departure] = await sql`select starts_at, ends_at from expedition_departures where id = ${f.target.id}`;
    const params = new URLSearchParams({ q: f.trip.title, dateFrom: departure.starts_at.toISOString().slice(0, 10),
      dateTo: departure.ends_at.toISOString().slice(0, 10), participants: "2", maxPrice: "100", budgetCurrency: "USD" });
    await page.goto(`/expeditions?${params}`);
    const card = page.locator("article").filter({ hasText: f.trip.title });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link").first()).toHaveAttribute("href", new RegExp(`departure=${f.target.id}.*participants=2`));
    const [hold] = await sql`insert into expedition_bookings (expedition_id, departure_id, booking_code, contact_name, contact_email, participants_count, total_amount, status, payment_status, hold_expires_at)
      values (${f.trip.id}, ${f.target.id}, ${randomUUID()}, 'Held seats', 'held@example.org', 2, 200, 'pending_payment', 'pending', now() + interval '10 minutes') returning id`;
    await page.reload();
    const refreshed = await getExpeditionMarketplaceResults(parseExpeditionSearchFilters(Object.fromEntries(params)));
    expect(refreshed.expeditions.filter(item => item.slug === f.trip.slug)).toHaveLength(0);
    await expect(card).toHaveCount(0);
    await sql`update expedition_bookings set hold_expires_at = now() - interval '1 minute' where id = ${hold.id}`;
    params.set("maxPrice", "99");
    await page.goto(`/expeditions?${params}`);
    await expect(card).toHaveCount(0);
    params.set("maxPrice", "100");
    await page.goto(`/expeditions?${params}`);
    await expect(card).toBeVisible();
  } finally { await f.cleanup(); }
});

test("host offer, traveler acceptance and manual checkout create one linked booking", async ({ browser }) => {
  test.setTimeout(120000);
  const f = await fixture();
  const hostContext = await browser.newContext();
  const travelerContext = await browser.newContext();
  try {
    for (const [context, person] of [[hostContext, f.host], [travelerContext, f.traveler]] as const) {
      const page = await context.newPage();
      await page.goto(`/login?next=${encodeURIComponent(`/expedition-requests/${f.request.id}`)}`);
      await page.locator('input[name="email"]').fill(person.email);
      await page.locator('input[name="password"]').fill(rolePassword);
      await page.getByRole("button", { name: "Login", exact: true }).click();
      await page.waitForURL(`**/expedition-requests/${f.request.id}`);
    }
    const hostPage = hostContext.pages()[0];
    await hostPage.locator('textarea[name="body"]').fill("We can welcome you on this departure.");
    await hostPage.getByRole("button", { name: "Send message", exact: true }).click();
    await hostPage.locator('select[name="departureId"]').selectOption(f.target.id);
    await hostPage.getByRole("button", { name: "Send offer", exact: true }).click();
    await expect(hostPage.getByRole("heading", { name: "Proposed departure" })).toBeVisible();
    const travelerPage = travelerContext.pages()[0];
    await travelerPage.reload();
    await expect(travelerPage.getByText("We can welcome you on this departure.", { exact: true })).toBeVisible();
    await travelerPage.getByRole("button", { name: "Accept and continue", exact: true }).click();
    await travelerPage.waitForURL("**/checkout/expedition?**");
    await expect(travelerPage.locator('input[name="requestId"]')).toHaveValue(f.request.id);
    await expect(travelerPage.locator('select[name="departureId"]')).toHaveValue(f.target.id);
    await travelerPage.locator('input[name="paymentReference"]').fill("TEST-TRANSFER-001");
    await travelerPage.locator('input[name="paymentProofFile"]').setInputFiles({ name: "test-proof.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=", "base64") });
    await travelerPage.getByRole("button", { name: "Submit Booking for Verification", exact: true }).click();
    await travelerPage.waitForURL("**/checkout/success?**");
    const [request] = await sql`select booking_id, status from expedition_interest_requests where id = ${f.request.id}`;
    expect(request.status).toBe("converted");
    expect(request.booking_id).toBeTruthy();
    const [created] = await sql`select user_id, departure_id, payment_status from expedition_bookings where id = ${request.booking_id}`;
    expect(created.user_id).toBe(f.traveler.id);
    expect(created.departure_id).toBe(f.target.id);
    expect(created.payment_status).toBe("pending");
  } finally { await hostContext.close(); await travelerContext.close(); await f.cleanup(); }
});
