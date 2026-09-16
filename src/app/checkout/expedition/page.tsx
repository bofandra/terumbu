import { randomBytes } from "node:crypto";

import { Button, ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { bookExpeditionAction } from "@/lib/checkout-actions";
import { getExpeditionCheckoutOptions, getUserCorporateAttributionOptions } from "@/lib/queries";
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
  const corporateOptions = user ? await getUserCorporateAttributionOptions(user.id) : [];
  const filteredOptions = params?.expedition ? options.filter((option) => option.expeditionSlug === params.expedition) : options;
  const visibleOptions = filteredOptions.length > 0 ? filteredOptions : options;
  const selectedDeparture = params?.departure ?? visibleOptions[0]?.departureId;
  const selectedParticipants = Math.max(1, Math.min(12, Number(params?.participants ?? 1) || 1));
  const idempotencyKey = `expedition-${randomBytes(12).toString("hex")}`;

  if (visibleOptions.length === 0) {
    return (
      <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Booking unavailable</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">No public departures are currently scheduled.</h1>
          <p className="mt-3 text-sm leading-6 text-ocean-900/62">
            New expedition dates will appear after operator availability, safety requirements, and conservation partner details are confirmed.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/expeditions">View expeditions</ButtonLink>
            <ButtonLink href="mailto:support@terumbu.eco?subject=Private expedition request" tone="secondary">
              Request private trip
            </ButtonLink>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Booking</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Reserve expedition seats</h1>
        <p className="mt-3 text-ocean-900/68">
          Book for yourself first, then add other participant names if you are bringing a group. Payment will remain pending until the gateway or admin confirmation is ready.
        </p>
        {params?.error ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            {params.error === "availability"
              ? "That departure is no longer available for the requested seats."
              : params.error === "attribution"
                ? "Choose Personal or a company you belong to."
                : "Check departure availability and contact details."}
          </p>
        ) : null}
        <form action={bookExpeditionAction} className="mt-6 grid min-w-0 gap-4">
          <input type="hidden" name="next" value="/checkout/expedition" />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Departure
            <select name="departureId" defaultValue={selectedDeparture} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
              {visibleOptions.map((option) => (
                <option key={option.departureId} value={option.departureId}>
                  {option.expeditionTitle} · {option.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} · {option.availabilityLabel} · {option.availableSeats} seats · {formatCurrency(option.basePrice, option.currency)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Contact name
            <input name="contactName" defaultValue={user?.displayName ?? user?.name ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Contact email
            <input name="contactEmail" type="email" defaultValue={user?.email ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Participants
            <input name="participantsCount" type="number" min={1} max={12} defaultValue={selectedParticipants} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          {corporateOptions.length > 0 ? (
            <fieldset className="grid gap-2 rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
              <legend className="text-sm font-bold text-ocean-900">Join as</legend>
              <label className="flex gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-ocean-900 ring-1 ring-ocean-900/10">
                <input type="radio" name="joinAs" value="personal" defaultChecked className="mt-1" />
                <span>
                  <span className="block font-bold">Personal</span>
                  <span className="block text-xs leading-5 text-ocean-900/58">Only shown in your personal passport.</span>
                </span>
              </label>
              {corporateOptions.map((option) => (
                <label key={option.accountId} className="flex gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-ocean-900 ring-1 ring-ocean-900/10">
                  <input type="radio" name="joinAs" value={`corporate:${option.accountId}`} className="mt-1" />
                  <span>
                    <span className="block font-bold">{option.accountName}</span>
                    <span className="block text-xs leading-5 text-ocean-900/58">Also counted in this company report.</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Additional participant names
            <textarea name="additionalParticipantNames" placeholder="One name per line, only if participants is more than 1" className="min-h-24 w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
          </label>
          <Button type="submit">Continue Booking</Button>
        </form>
      </section>
    </main>
  );
}
