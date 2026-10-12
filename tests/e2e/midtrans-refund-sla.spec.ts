import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import {
  midtransCompensationCaseEvents, midtransRefundBankConfirmations,
  paymentOperations
} from "../../src/db/schema";
import { loginAs } from "./support";

test("overdue refund cases trip independent SLA health until operator, provider and bank stages complete", async ({ request, page }) => {
  test.setTimeout(120_000);
  const order = "TRB-EXP-" + randomUUID();
  const createdAt = new Date(Date.now() - 30 * 3600_000);
  const [operation] = await db.insert(paymentOperations).values({
    operationCode: "E2E-SLA-" + randomUUID(),
    operationType: "midtrans_capacity_conflict",
    entityType: "expedition_booking",
    provider: "midtrans",
    providerReference: order,
    status: "pending",
    amount: "100000.00",
    currency: "IDR",
    createdAt,
    updatedAt: createdAt
  }).returning({ id: paymentOperations.id });
  try {
    const breached = await request.get("/api/health/midtrans-refunds");
    expect(breached.status()).toBe(503);
    expect(await breached.json()).toEqual({ status: "unhealthy" });
    expect(breached.headers()["cache-control"]).toContain("no-store");
    expect(JSON.stringify(await breached.json())).not.toContain(order);

    await loginAs(page, "admin.demo@terumbu.eco", "/admin/operations");
    const dashboard = page.getByTestId("midtrans-refund-sla");
    await expect(dashboard).toContainText("No operator follow-up 1h+");
    await expect(dashboard).toContainText("Refund unresolved 24h+");
    await expect(dashboard).toContainText("Missing bank acknowledgment 72h+");

    // An operator contact resolves only the first-contact escalation; it
    // never changes payment status or the provider refund settlement.
    await db.insert(midtransCompensationCaseEvents).values({
      id: randomUUID(), operationId: operation.id,
      actorUserId: (await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, "admin.demo@terumbu.eco"),
        columns: { id: true }
      }))!.id,
      eventType: "contact_attempted",
      evidenceChannel: "support_ticket",
      ticketReference: "E2E-SLA-123"
    });
    expect((await request.get("/api/health/midtrans-refunds")).status()).toBe(503);

    // Provider only; a bank acknowledgement that is not yet present remains
    // an overdue operations case, but does not initiate another refund.
    await db.update(paymentOperations).set({
      status: "provider_refunded",
      processedAt: new Date(Date.now() - 4 * 24 * 3600_000)
    }).where(eq(paymentOperations.id, operation.id));
    expect((await request.get("/api/health/midtrans-refunds")).status()).toBe(503);

    await db.insert(midtransRefundBankConfirmations).values({
      operationId: operation.id,
      providerReference: order,
      refundKey: "TRB-COMP-" + randomUUID().replaceAll("-", ""),
      refundAmount: "100000.00",
      bankConfirmedAt: new Date(),
      source: "midtrans_get_status"
    });
    const resolved = await request.get("/api/health/midtrans-refunds");
    expect(resolved.status()).toBe(200);
    expect(await resolved.json()).toEqual({ status: "ok" });
  } finally {
    await db.delete(midtransRefundBankConfirmations)
      .where(eq(midtransRefundBankConfirmations.operationId, operation.id));
    await db.delete(midtransCompensationCaseEvents)
      .where(eq(midtransCompensationCaseEvents.operationId, operation.id));
    await db.delete(paymentOperations).where(eq(paymentOperations.id, operation.id));
  }
});
