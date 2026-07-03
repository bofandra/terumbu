import { randomBytes } from "node:crypto";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { bookExpeditionAction } from "@/lib/checkout-actions";
import { getExpeditionCheckoutOptions } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Expedition Checkout"
};

export const dynamic = "force-dynamic";

type ExpeditionCheckoutPageProps = {
  searchParams?: Promise<{
    departure?: string;
    expedition?: string;
    participants?: string;
    error?: string;
  }>;
};

export default async function ExpeditionCheckoutPage({ searchParams }: ExpeditionCheckoutPageProps) {
  const params = await searchParams;
  const [options, user] = await Promise.all([getExpeditionCheckoutOptions(), getSessionUser()]);
  const filteredOptions = params?.expedition ? options.filter((option) => option.expeditionSlug === params.expedition) : options;
  const visibleOptions = filteredOptions.length > 0 ? filteredOptions : options;
  const selectedDeparture = params?.departure ?? visibleOptions[0]?.departureId;
  const selectedParticipants = Math.max(1, Math.min(12, Number(params?.participants ?? 1) || 1));
  const idempotencyKey = `expedition-${randomBytes(12).toString("hex")}`;

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Booking</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Reserve expedition seats</h1>
        <p className="mt-3 text-ocean-900/68">
          Availability, participant details, demo payment, booking records, and confirmation emails are recorded in PostgreSQL.
        </p>
        {params?.error ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            Check departure availability and contact details.
          </p>
        ) : null}
        <form action={bookExpeditionAction} className="mt-6 grid gap-4">
          <input type="hidden" name="next" value="/checkout/expedition" />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Departure
            <select name="departureId" defaultValue={selectedDeparture} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
              {visibleOptions.map((option) => (
                <option key={option.departureId} value={option.departureId}>
                  {option.expeditionTitle} · {option.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} · {option.availableSeats} seats · {formatCurrency(option.basePrice)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Contact name
            <input name="contactName" defaultValue={user?.displayName ?? user?.name ?? ""} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Contact email
            <input name="contactEmail" type="email" defaultValue={user?.email ?? ""} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Participants
            <input name="participantsCount" type="number" min={1} max={12} defaultValue={selectedParticipants} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Participant names
            <textarea name="participantNames" defaultValue={user?.displayName ?? user?.name ?? ""} className="min-h-24 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Demo payment result
            <select name="paymentState" defaultValue="paid" className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <Button type="submit">Continue Booking</Button>
        </form>
      </section>
    </main>
  );
}
