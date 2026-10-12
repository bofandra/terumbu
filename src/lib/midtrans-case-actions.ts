"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { midtransCompensationCaseEvents, paymentOperations } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { parseCompensationCaseEvent } from "@/lib/midtrans-case-events";

export async function recordMidtransCompensationEventAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/operations");

  const parsed = parseCompensationCaseEvent({
    eventId: formData.get("eventId"),
    operationId: formData.get("operationId"),
    eventType: formData.get("eventType"),
    channel: formData.get("channel"),
    ticketReference: formData.get("ticketReference")
  });
  if (!parsed) redirect("/admin/operations?caseError=invalid");

  const path = "/admin/operations/midtrans/" + parsed.operationId;

  const outcome = await db.transaction(async (tx) => {
    const [incident] = await tx.select({
      id: paymentOperations.id,
      status: paymentOperations.status
    }).from(paymentOperations)
      .where(and(eq(paymentOperations.id, parsed.operationId),
        eq(paymentOperations.operationType, "midtrans_capacity_conflict"),
        eq(paymentOperations.provider, "midtrans")))
      .limit(1).for("update");

    if (!incident) return "not_found" as const;
    // The admin is recording what a customer reportedly said, not confirming
    // payout, charging a card, or changing provider settlement state.
    if (parsed.eventType === "customer_reports_received" &&
        incident.status !== "provider_refunded") {
      return "not_refunded" as const;
    }

    const [created] = await tx.insert(midtransCompensationCaseEvents).values({
      id: parsed.eventId,
      operationId: incident.id,
      actorUserId: user.id,
      eventType: parsed.eventType,
      evidenceChannel: parsed.channel,
      ticketReference: parsed.ticketReference
    }).onConflictDoNothing({ target: midtransCompensationCaseEvents.id })
      .returning({ id: midtransCompensationCaseEvents.id });

    if (created) return "saved" as const;

    // Only report an idempotent replay for the same actor/operation/payload.
    const [existing] = await tx.select({
      operationId: midtransCompensationCaseEvents.operationId,
      actorId: midtransCompensationCaseEvents.actorUserId,
      eventType: midtransCompensationCaseEvents.eventType,
      channel: midtransCompensationCaseEvents.evidenceChannel,
      reference: midtransCompensationCaseEvents.ticketReference
    }).from(midtransCompensationCaseEvents).where(eq(midtransCompensationCaseEvents.id, parsed.eventId)).limit(1);
    return existing?.operationId === incident.id &&
      existing.actorId === user.id &&
      existing.eventType === parsed.eventType &&
      existing.channel === parsed.channel &&
      existing.reference === parsed.ticketReference ? "saved" as const : "duplicate" as const;
  });

  if (outcome === "not_found") redirect("/admin/operations?caseError=missing");
  if (outcome === "not_refunded") redirect(path + "?error=not_refunded");
  if (outcome === "duplicate") redirect(path + "?error=duplicate");
  revalidatePath(path);
  revalidatePath("/admin/operations");
  redirect(path + "?saved=1");
}
