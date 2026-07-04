import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Edit3, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, PartnerPageHeader, StatusBadge, inputClassName, labelize, textareaClassName } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import {
  createPartnerExpeditionDepartureAction,
  updatePartnerExpeditionAction,
  updatePartnerExpeditionDepartureAction
} from "@/lib/portal-actions";
import { getPartnerPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Partner Expeditions"
};

export const dynamic = "force-dynamic";

const departureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"];

const statusMessages: Record<string, string> = {
  "departure-created": "Departure created.",
  "departure-updated": "Departure updated.",
  "expedition-updated": "Expedition updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign.",
  "departure-capacity": "Capacity cannot be lower than seats already booked.",
  "departure-duplicate": "That expedition already has a departure with the same start time.",
  "departure-invalid": "Enter valid departure dates and capacity.",
  "departure-missing": "Departure record was not found.",
  "expedition-campaign-required": "This expedition must be linked to one of your campaigns before partner editing is available.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, summary, and related campaign.",
  "expedition-metadata-json": "Trip detail content must be valid JSON object data.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-slug": "That expedition slug is already in use.",
  "organization-access": "You do not have access to that partner organization."
};

type PartnerExpeditionsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function formatDateTimeInput(date: Date) {
  return date.toISOString().slice(0, 16);
}

export default async function PartnerExpeditionsPage({ searchParams }: PartnerExpeditionsPageProps) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const query = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = query?.saved ? statusMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Expeditions"
        description="Manage trip catalog details, public trip-detail content, and departure availability for expeditions linked to your campaigns."
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-4">
        {data.expeditions.map((expedition) => (
          <article key={expedition.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
            <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-5 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-normal text-ocean-900">{expedition.title}</h2>
                  <StatusBadge value={expedition.relatedCampaignTitle ? "published" : "draft"} />
                </div>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                  {expedition.partner ?? "Partner"} / {expedition.region} / {expedition.durationDays} days / {formatCurrency(expedition.basePrice)}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                  {expedition.departures.length.toLocaleString("id-ID")} departures / {expedition.bookingCount.toLocaleString("id-ID")} bookings
                </p>
              </div>
              <Link href={`/expeditions/${expedition.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                Public page
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <details className="border-b border-ocean-900/10">
              <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-bold text-ocean-900">
                <Edit3 className="size-4" aria-hidden="true" />
                Edit public trip detail
              </summary>
              <form action={updatePartnerExpeditionAction} className="grid gap-4 border-t border-ocean-900/10 bg-sand-50 p-5">
                <input type="hidden" name="redirectTo" value="/partner/expeditions" />
                <input type="hidden" name="expeditionId" value={expedition.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Title">
                    <input name="title" defaultValue={expedition.title} className={inputClassName} required />
                  </Field>
                  <Field label="Slug">
                    <input name="slug" defaultValue={expedition.slug} className={inputClassName} required />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Region">
                    <input name="region" defaultValue={expedition.region} className={inputClassName} required />
                  </Field>
                  <Field label="Duration days">
                    <input name="durationDays" type="number" min={1} defaultValue={expedition.durationDays} className={inputClassName} required />
                  </Field>
                  <Field label="Base price">
                    <input name="basePrice" type="number" min={1} step={1000} defaultValue={expedition.basePrice} className={inputClassName} required />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Related campaign">
                    <select name="relatedCampaignId" defaultValue={expedition.relatedCampaignId ?? ""} className={inputClassName} required>
                      <option value="">Choose campaign</option>
                      {data.campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.title} / {campaign.status}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Image URL">
                    <input name="imageUrl" type="url" defaultValue={expedition.imageUrl ?? ""} className={inputClassName} />
                  </Field>
                </div>
                <Field label="Summary">
                  <textarea name="summary" defaultValue={expedition.summary} className={textareaClassName} required />
                </Field>
                <Field label="Trip detail content JSON">
                  <textarea name="metadataJson" defaultValue={expedition.metadataJson} className={`${textareaClassName} min-h-96 font-mono text-xs`} spellCheck={false} />
                </Field>
                <Button type="submit" className="w-fit">
                  <Save className="size-4" aria-hidden="true" />
                  Save Expedition
                </Button>
              </form>
            </details>

            <details>
              <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-bold text-ocean-900">
                <CalendarPlus className="size-4" aria-hidden="true" />
                Manage departures
              </summary>
              <div className="grid gap-4 border-t border-ocean-900/10 bg-sand-50 p-5">
                {expedition.departures.map((departure) => (
                  <form key={departure.id} action={updatePartnerExpeditionDepartureAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-white p-4">
                    <input type="hidden" name="redirectTo" value="/partner/expeditions" />
                    <input type="hidden" name="departureId" value={departure.id} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-ocean-900">
                        {departure.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} - {departure.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </p>
                      <StatusBadge value={`${departure.bookingCount} bookings`} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Starts at">
                        <input name="startsAt" type="datetime-local" defaultValue={formatDateTimeInput(departure.startsAt)} className={inputClassName} required />
                      </Field>
                      <Field label="Ends at">
                        <input name="endsAt" type="datetime-local" defaultValue={formatDateTimeInput(departure.endsAt)} className={inputClassName} required />
                      </Field>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Capacity">
                        <input name="capacity" type="number" min={departure.seatsBooked} defaultValue={departure.capacity} className={inputClassName} required />
                      </Field>
                      <Field label="Status">
                        <select name="status" defaultValue={departure.status} className={inputClassName}>
                          {departureStatuses.map((status) => (
                            <option key={status} value={status}>
                              {labelize(status)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Meeting point">
                        <input name="meetingPoint" defaultValue={departure.meetingPoint ?? ""} className={inputClassName} />
                      </Field>
                      <Field label="Trip leader">
                        <input name="guide" defaultValue={departure.guide ?? ""} className={inputClassName} />
                      </Field>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                      <Field label="Minimum">
                        <input name="minParticipants" type="number" min={1} defaultValue={departure.minParticipants} className={inputClassName} />
                      </Field>
                      <Field label="Weather advisory">
                        <input name="weatherAdvisory" defaultValue={departure.weatherAdvisory ?? ""} className={inputClassName} />
                      </Field>
                    </div>
                    <Button type="submit" tone="secondary" className="w-fit">
                      <Save className="size-4" aria-hidden="true" />
                      Save Departure
                    </Button>
                  </form>
                ))}

                <form action={createPartnerExpeditionDepartureAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-white p-4">
                  <input type="hidden" name="redirectTo" value="/partner/expeditions" />
                  <input type="hidden" name="expeditionId" value={expedition.id} />
                  <h3 className="font-bold text-ocean-900">Add departure</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Starts at">
                      <input name="startsAt" type="datetime-local" className={inputClassName} required />
                    </Field>
                    <Field label="Ends at">
                      <input name="endsAt" type="datetime-local" className={inputClassName} required />
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Capacity">
                      <input name="capacity" type="number" min={1} defaultValue={12} className={inputClassName} required />
                    </Field>
                    <Field label="Booked seats">
                      <input name="seatsBooked" type="number" min={0} defaultValue={0} className={inputClassName} />
                    </Field>
                    <Field label="Status">
                      <select name="status" defaultValue="open" className={inputClassName}>
                        {departureStatuses.map((status) => (
                          <option key={status} value={status}>
                            {labelize(status)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Meeting point">
                      <input name="meetingPoint" placeholder={expedition.region} className={inputClassName} />
                    </Field>
                    <Field label="Trip leader">
                      <input name="guide" placeholder="Field team leader" className={inputClassName} />
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                    <Field label="Minimum">
                      <input name="minParticipants" type="number" min={1} defaultValue={6} className={inputClassName} />
                    </Field>
                    <Field label="Weather advisory">
                      <input name="weatherAdvisory" className={inputClassName} />
                    </Field>
                  </div>
                  <Button type="submit" className="w-fit">
                    <CalendarPlus className="size-4" aria-hidden="true" />
                    Add Departure
                  </Button>
                </form>
              </div>
            </details>
          </article>
        ))}

        {data.expeditions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">
            No expeditions are linked to your campaigns yet. An admin can create the trip catalog row and attach it to one of your campaigns.
          </div>
        ) : null}
      </section>
    </div>
  );
}
