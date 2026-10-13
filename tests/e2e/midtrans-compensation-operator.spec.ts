import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import {
  expeditionBookings, expeditionDepartures, expeditions,
  midtransCompensationCaseEvents, paymentOperations
} from "../../src/db/schema";
import { loginAs } from "./support";

test("only admin can record idempotent refund follow-up; reports cannot alter provider payment state", async ({ browser }) => {
  test.setTimeout(120_000);
  const [expedition] = await db.select({ id: expeditions.id }).from(expeditions)
    .where(eq(expeditions.slug, "raja-ampat-coral-restoration")).limit(1);
  expect(expedition).toBeTruthy();

  const adminContext = await browser.newContext();
  const outsiderContext = await browser.newContext();
  let bookingId: string | null = null;
  let departureId: string | null = null;
  let operationId: string | null = null;
  const pathPrefix = "/admin/operations/midtrans/";

  try {
    const startsAt = new Date(Date.now() + 70 * 86400_000);
    const [departure] = await db.insert(expeditionDepartures).values({
      expeditionId: expedition.id, startsAt, endsAt: new Date(startsAt.getTime() + 2 * 86400_000),
      capacity: 1, seatsBooked: 1, status: "full"
    }).returning({ id: expeditionDepartures.id });
    departureId = departure.id;

    const [booking] = await db.insert(expeditionBookings).values({
      expeditionId: expedition.id,
      departureId: departure.id,
      bookingCode: "E2E-CASE-" + randomUUID(),
      contactName: "Operator case",
      contactEmail: "internal-operator-case@example.invalid",
      participantsCount: 1,
      totalAmount: "100000.00",
      currency: "IDR",
      status: "cancelled",
      paymentStatus: "pending"
    }).returning({ id: expeditionBookings.id });
    bookingId = booking.id;

    const [operation] = await db.insert(paymentOperations).values({
      operationCode: "E2E-CASE-" + randomUUID(),
      operationType: "midtrans_capacity_conflict",
      entityType: "expedition_booking",
      bookingId,
      provider: "midtrans",
      providerReference: "TRB-EXP-" + randomUUID(),
      status: "pending",
      amount: "100000",
      currency: "IDR"
    }).returning({ id: paymentOperations.id });
    operationId = operation.id;

    const path = pathPrefix + operation.id;
    const outsider = await outsiderContext.newPage();
    await loginAs(outsider, "user.demo@terumbu.eco", "/dashboard");
    await outsider.goto(path);
    await expect(outsider).toHaveURL(/\/forbidden\?next=/);

    const admin = await adminContext.newPage();
    await loginAs(admin, "admin.demo@terumbu.eco", path);
    await expect(admin.getByRole("heading", { name: "Midtrans refund follow-up" })).toBeVisible();
    await expect(admin.getByText("No operator follow-up recorded yet.")).toBeVisible();

    await admin.locator('select[name="eventType"]').selectOption("customer_reports_received");
    await admin.locator('select[name="channel"]').selectOption("verified_email");
    await admin.locator('input[name="ticketReference"]').fill("SUPPORT-RECEIVED-1");
    await admin.getByRole("button", { name: "Record follow-up" }).click();
    await expect(admin).toHaveURL(/error=not_refunded/);
    const blocked = await db.select({ id: midtransCompensationCaseEvents.id })
      .from(midtransCompensationCaseEvents).where(eq(midtransCompensationCaseEvents.operationId, operation.id));
    expect(blocked).toHaveLength(0);

    await db.update(paymentOperations).set({ status: "provider_refunded" })
      .where(eq(paymentOperations.id, operation.id));
    await admin.goto(path);
    const eventId = await admin.locator('input[name="eventId"]').inputValue();
    await admin.locator('select[name="eventType"]').selectOption("customer_reports_received");
    await admin.locator('select[name="channel"]').selectOption("verified_email");
    await admin.locator('input[name="ticketReference"]').fill("SUPPORT-RECEIVED-1");
    await admin.getByRole("button", { name: "Record follow-up" }).click();

    await expect(admin.getByRole("status")).toContainText("Follow-up recorded.");
    await expect(admin.getByTestId("midtrans-case-timeline")).toContainText("Customer reports funds received (unverified)");
    expect((await db.select({ status: expeditionBookings.paymentStatus })
      .from(expeditionBookings).where(eq(expeditionBookings.id, booking.id)).limit(1))[0].status).toBe("pending");

    await admin.locator('input[name="eventId"]').evaluate((element, sameId) => {
      (element as HTMLInputElement).value = sameId;
    }, eventId);
    await admin.locator('select[name="eventType"]').selectOption("customer_reports_received");
    await admin.locator('select[name="channel"]').selectOption("verified_email");
    await admin.locator('input[name="ticketReference"]').fill("SUPPORT-RECEIVED-1");
    await admin.getByRole("button", { name: "Record follow-up" }).click();

    const rows = await db.select({
      ticket: midtransCompensationCaseEvents.ticketReference
    }).from(midtransCompensationCaseEvents)
      .where(and(eq(midtransCompensationCaseEvents.operationId, operation.id),
        eq(midtransCompensationCaseEvents.eventType, "customer_reports_received")));
    expect(rows).toHaveLength(1);
    expect(rows[0].ticket).toBe("SUPPORT-RECEIVED-1");
    await expect(admin.getByTestId("midtrans-case-timeline").locator("li")).toHaveCount(1);
  } finally {
    await adminContext.close();
    await outsiderContext.close();
    if (operationId) {
      await db.delete(midtransCompensationCaseEvents).where(eq(midtransCompensationCaseEvents.operationId, operationId));
      await db.delete(paymentOperations).where(eq(paymentOperations.id, operationId));
    }
    if (bookingId) await db.delete(expeditionBookings).where(eq(expeditionBookings.id, bookingId));
    if (departureId) await db.delete(expeditionDepartures).where(eq(expeditionDepartures.id, departureId));
  }
});
