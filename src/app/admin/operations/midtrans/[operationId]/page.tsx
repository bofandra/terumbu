import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  expeditionBookings, midtransCompensationCaseEvents,
  midtransRefundBankConfirmations, paymentOperations
} from "@/db/schema";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { recordMidtransCompensationEventAction } from "@/lib/midtrans-case-actions";
import {
  CASE_EVENT_LABELS, MIDTRANS_COMPENSATION_CASE_EVENTS,
  MIDTRANS_COMPENSATION_EVIDENCE_CHANNELS, type CompensationCaseEventType
} from "@/lib/midtrans-case-events";

export const metadata = { title: "Midtrans compensation follow-up" };
export const dynamic = "force-dynamic";

function wib(date: Date | null) {
  return date ? new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short"
  }).format(date) + " WIB" : "Not recorded";
}

export default async function MidtransCompensationDetailPage({
  params, searchParams
}: {
  params: Promise<{ operationId: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  await requireRole(["admin"], "/admin/operations");
  const { operationId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) notFound();

  const [caseRow] = await db.select({
    id: paymentOperations.id,
    status: paymentOperations.status,
    amount: paymentOperations.amount,
    currency: paymentOperations.currency,
    createdAt: paymentOperations.createdAt,
    bookingCode: expeditionBookings.bookingCode,
    bankConfirmedAt: midtransRefundBankConfirmations.bankConfirmedAt
  }).from(paymentOperations)
    .innerJoin(expeditionBookings, eq(paymentOperations.bookingId, expeditionBookings.id))
    .leftJoin(midtransRefundBankConfirmations,
      eq(midtransRefundBankConfirmations.operationId, paymentOperations.id))
    .where(and(eq(paymentOperations.id, operationId),
      eq(paymentOperations.operationType, "midtrans_capacity_conflict"),
      eq(paymentOperations.provider, "midtrans")))
    .limit(1);
  if (!caseRow) notFound();

  const events = await db.select({
    id: midtransCompensationCaseEvents.id,
    eventType: midtransCompensationCaseEvents.eventType,
    evidenceChannel: midtransCompensationCaseEvents.evidenceChannel,
    ticketReference: midtransCompensationCaseEvents.ticketReference,
    recordedAt: midtransCompensationCaseEvents.recordedAt
  }).from(midtransCompensationCaseEvents)
    .where(eq(midtransCompensationCaseEvents.operationId, caseRow.id))
    .orderBy(asc(midtransCompensationCaseEvents.recordedAt))
    .limit(200);

  const query = await searchParams;
  return (
    <main className="space-y-6">
      <Link className="text-sm font-bold text-coral-700" href="/admin/operations">
        ← Back to operations
      </Link>
      <header className="rounded-xl border border-ocean-900/10 bg-white p-6">
        <h1 className="text-2xl font-bold text-ocean-900">Midtrans refund follow-up</h1>
        <p className="mt-2 text-sm text-ocean-900/70">
          Booking {caseRow.bookingCode} · IDR {Number(caseRow.amount ?? 0).toLocaleString("id-ID")}
        </p>
        <p className="mt-2 text-sm font-semibold text-ocean-900">
          Provider record: {caseRow.status.replaceAll("_", " ")} · Created {wib(caseRow.createdAt)}
        </p>
        <p className="mt-2 text-sm text-ocean-900/70">
          Acquiring-bank acknowledgement: {wib(caseRow.bankConfirmedAt)}
        </p>
        <p className="mt-3 rounded-lg bg-sand-50 p-3 text-sm text-ocean-900">
          This ledger records follow-up and what the customer <strong>reports</strong>.
          A customer report is not independent proof of bank credit. These actions
          never change a booking, a payment, or a refund.
        </p>
      </header>

      {query?.saved ? <p role="status" className="text-sm font-semibold text-kelp-700">Follow-up recorded.</p> : null}
      {query?.error ? <p role="alert" className="text-sm font-semibold text-coral-700">
        {query.error === "not_refunded"
          ? "A receipt report can be recorded only after Midtrans reports a full refund."
          : "The follow-up was not recorded. Check the form and case."}
      </p> : null}

      <section className="rounded-xl border border-ocean-900/10 bg-white p-6">
        <h2 className="text-lg font-bold text-ocean-900">Record an operator follow-up</h2>
        <form action={recordMidtransCompensationEventAction} className="mt-5 grid max-w-xl gap-4">
          <input type="hidden" name="eventId" value={randomUUID()} />
          <input type="hidden" name="operationId" value={caseRow.id} />
          <label className="grid gap-1 text-sm font-semibold text-ocean-900">
            Event
            <select name="eventType" required defaultValue="contact_attempted"
              className="min-h-11 rounded-lg border border-ocean-900/20 bg-white px-3">
              {MIDTRANS_COMPENSATION_CASE_EVENTS.map((kind) => (
                <option key={kind} value={kind}>{CASE_EVENT_LABELS[kind]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ocean-900">
            Verified communication channel
            <select name="channel" required defaultValue="support_ticket"
              className="min-h-11 rounded-lg border border-ocean-900/20 bg-white px-3">
              {MIDTRANS_COMPENSATION_EVIDENCE_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>{channel.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ocean-900">
            Internal ticket reference (letters, numbers, dash, underscore only)
            <input name="ticketReference" required minLength={3} maxLength={64}
              pattern="[A-Za-z0-9_-]{3,64}"
              placeholder="SUPPORT-12345"
              className="min-h-11 rounded-lg border border-ocean-900/20 bg-white px-3" />
          </label>
          <p className="text-xs text-ocean-900/65">
            Do not enter customer names, email addresses, account numbers, documents or bank details.
            Keep any sensitive evidence in the approved private support system.
          </p>
          <Button type="submit">Record follow-up</Button>
        </form>
      </section>

      <section aria-labelledby="midtrans-case-history" className="rounded-xl border border-ocean-900/10 bg-white p-6">
        <h2 id="midtrans-case-history" className="text-lg font-bold text-ocean-900">
          Case event history
        </h2>
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-ocean-900/70">No operator follow-up recorded yet.</p>
        ) : (
          <ol data-testid="midtrans-case-timeline" className="mt-4 space-y-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-lg border border-ocean-900/10 p-4">
                <p className="font-semibold text-ocean-900">
                  {CASE_EVENT_LABELS[event.eventType as CompensationCaseEventType] ?? "Case follow-up"}
                </p>
                <p className="mt-1 text-xs text-ocean-900/60">
                  {wib(event.recordedAt)} · {event.evidenceChannel.replaceAll("_", " ")} · Ticket {event.ticketReference}
                </p>
              </li>
            ))}
          </ol>
        )}
        {events.length >= 200 ? (
          <p className="mt-3 text-xs text-coral-700">Showing the first 200 events; check the internal audit export for the complete record.</p>
        ) : null}
      </section>
    </main>
  );
}
