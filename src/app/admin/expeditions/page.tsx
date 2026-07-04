import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarPlus, Plus, Save, ShipWheel, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import {
  createExpeditionAction,
  createExpeditionDepartureAction,
  deleteExpeditionAction,
  deleteExpeditionDepartureAction,
  updateExpeditionAction,
  updateExpeditionDepartureAction
} from "@/lib/portal-actions";
import { getAdminOperationsData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Expeditions"
};

export const dynamic = "force-dynamic";

const departureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"];

const statusMessages: Record<string, string> = {
  "departure-created": "Departure created.",
  "departure-deleted": "Departure deleted.",
  "departure-updated": "Departure updated.",
  "expedition-created": "Expedition created.",
  "expedition-deleted": "Expedition deleted.",
  "expedition-updated": "Expedition updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign or leave the field empty.",
  "departure-capacity": "Capacity cannot be lower than seats already booked.",
  "departure-delete": "Confirm departure deletion by checking the delete box.",
  "departure-duplicate": "That expedition already has a departure with the same start time.",
  "departure-has-bookings": "Departures with bookings cannot be deleted.",
  "departure-invalid": "Enter valid departure dates and capacity.",
  "departure-missing": "Departure record was not found.",
  "expedition-delete": "Confirm expedition deletion by checking the delete box.",
  "expedition-has-bookings": "Expeditions with bookings cannot be deleted.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, and summary.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-slug": "That expedition slug is already in use."
};

type AdminExpeditionsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTimeInput(date: Date) {
  return date.toISOString().slice(0, 16);
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function RelatedCampaignSelect({
  campaigns,
  defaultValue = ""
}: {
  campaigns: Awaited<ReturnType<typeof getAdminOperationsData>>["campaignOptions"];
  defaultValue?: string | null;
}) {
  return (
    <select name="relatedCampaignId" defaultValue={defaultValue ?? ""} className={adminSelectClassName}>
      <option value="">No related campaign</option>
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.title} / {campaign.organizationName} / {campaign.status}
        </option>
      ))}
    </select>
  );
}

export default async function AdminExpeditionsPage({ searchParams }: AdminExpeditionsPageProps) {
  await requireRole(["admin"], "/admin/expeditions");
  const params = await searchParams;
  const data = await getAdminOperationsData();

  const scheduledDepartures = data.expeditionCatalog.reduce((total, expedition) => total + expedition.departures.length, 0);
  const totalSeats = data.expeditionCatalog.reduce(
    (total, expedition) => total + expedition.departures.reduce((departureTotal, departure) => departureTotal + departure.availableSeats, 0),
    0
  );
  const openDepartures = data.expeditionCatalog.reduce(
    (total, expedition) => total + expedition.departures.filter((departure) => departure.status === "open").length,
    0
  );
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions"
        title="Expedition management"
        description="Create trip catalog records, attach related campaigns, and manage departure timing, capacity, and booking status."
        actionHref="/admin"
        actionLabel="Overview"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Expedition summary">
        {[
          { label: "Catalog rows", value: data.expeditionCatalog.length.toLocaleString("id-ID"), icon: ShipWheel },
          { label: "Departures", value: scheduledDepartures.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Open departures", value: openDepartures.toLocaleString("id-ID"), icon: CalendarPlus },
          { label: "Available seats", value: totalSeats.toLocaleString("id-ID"), icon: Users }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create expedition</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">New catalog records can receive departures immediately after creation.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createExpeditionAction} className="grid gap-4 p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Title" className="lg:col-span-2">
              <input name="title" placeholder="Raja Ampat Coral Restoration Expedition" className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" placeholder="raja-ampat-coral-restoration" className={adminInputClassName} />
            </Field>
            <Field label="Region">
              <input name="region" placeholder="Raja Ampat" className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Duration days">
              <input name="durationDays" type="number" min={1} defaultValue={4} className={adminInputClassName} required />
            </Field>
            <Field label="Base price">
              <input name="basePrice" type="number" min={1} step={1000} placeholder="2500000" className={adminInputClassName} required />
            </Field>
            <Field label="Related campaign" className="lg:col-span-2">
              <RelatedCampaignSelect campaigns={data.campaignOptions} />
            </Field>
          </div>
          <Field label="Image URL">
            <input name="imageUrl" type="url" placeholder="https://..." className={adminInputClassName} />
          </Field>
          <Field label="Summary">
            <textarea name="summary" placeholder="Trip summary shown on public expedition cards and detail pages." className={adminTextareaClassName} required />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create Expedition
          </Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Trip catalog</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Edit public trip records and manage their departures.</p>
          </div>
          <ShipWheel className="size-5 text-coral-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.expeditionCatalog.map((expedition) => (
            <article key={expedition.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold tracking-normal text-ocean-900">{expedition.title}</h3>
                    {expedition.relatedCampaignTitle ? <AdminStatusBadge value="published" /> : <AdminStatusBadge value="draft" />}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {expedition.region} / {expedition.durationDays} days / {formatCurrency(expedition.basePrice)}
                  </p>
                  <Link href={`/expeditions/${expedition.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                    Public page
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge value={`${expedition.departures.length} departures`} />
                  <AdminStatusBadge value={`${expedition.bookingCount} bookings`} />
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                  <h4 className="font-bold text-ocean-900">Catalog details</h4>
                  <form action={updateExpeditionAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="expeditionId" value={expedition.id} />
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Field label="Title">
                        <input name="title" defaultValue={expedition.title} className={adminInputClassName} required />
                      </Field>
                      <Field label="Slug">
                        <input name="slug" defaultValue={expedition.slug} className={adminInputClassName} required />
                      </Field>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <Field label="Region">
                        <input name="region" defaultValue={expedition.region} className={adminInputClassName} required />
                      </Field>
                      <Field label="Duration days">
                        <input name="durationDays" type="number" min={1} defaultValue={expedition.durationDays} className={adminInputClassName} required />
                      </Field>
                      <Field label="Base price">
                        <input name="basePrice" type="number" min={1} step={1000} defaultValue={expedition.basePrice} className={adminInputClassName} required />
                      </Field>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Field label="Related campaign">
                        <RelatedCampaignSelect campaigns={data.campaignOptions} defaultValue={expedition.relatedCampaignId} />
                      </Field>
                      <Field label="Image URL">
                        <input name="imageUrl" type="url" defaultValue={expedition.imageUrl ?? ""} className={adminInputClassName} />
                      </Field>
                    </div>
                    <Field label="Summary">
                      <textarea name="summary" defaultValue={expedition.summary} className={adminTextareaClassName} required />
                    </Field>
                    <Button type="submit" tone="secondary" className="w-fit rounded-lg">
                      <Save className="size-4" aria-hidden="true" />
                      Save Expedition
                    </Button>
                  </form>

                  <form action={deleteExpeditionAction} className="mt-4 rounded-lg border border-coral-700/20 bg-white p-3">
                    <input type="hidden" name="expeditionId" value={expedition.id} />
                    <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                      <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" disabled={expedition.bookingCount > 0} required />
                      Delete this expedition and its departures. Expeditions with bookings cannot be deleted.
                    </label>
                    <Button
                      type="submit"
                      className="mt-3 w-fit rounded-lg bg-coral-500 hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={expedition.bookingCount > 0}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete Expedition
                    </Button>
                  </form>
                </div>

                <div className="rounded-lg border border-ocean-900/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-ocean-900">Departures</h4>
                      <p className="mt-1 text-sm font-semibold text-ocean-900/58">Only open departures can be booked from checkout.</p>
                    </div>
                    <CalendarDays className="size-5 text-kelp-700" aria-hidden="true" />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {expedition.departures.map((departure) => (
                      <div key={departure.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-ocean-900">
                              {departure.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} - {departure.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                              {departure.availableSeats} of {departure.capacity} seats available / {departure.seatsBooked} booked
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <AdminStatusBadge value={departure.status} />
                            <AdminStatusBadge value={`${departure.bookingCount} bookings`} />
                          </div>
                        </div>

                        <form action={updateExpeditionDepartureAction} className="mt-3 grid gap-2">
                          <input type="hidden" name="departureId" value={departure.id} />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Starts at">
                              <input name="startsAt" type="datetime-local" defaultValue={formatDateTimeInput(departure.startsAt)} className={adminInputClassName} required />
                            </Field>
                            <Field label="Ends at">
                              <input name="endsAt" type="datetime-local" defaultValue={formatDateTimeInput(departure.endsAt)} className={adminInputClassName} required />
                            </Field>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Capacity">
                              <input name="capacity" type="number" min={departure.seatsBooked} defaultValue={departure.capacity} className={adminInputClassName} required />
                            </Field>
                            <Field label="Status">
                              <select name="status" defaultValue={departure.status} className={adminSelectClassName}>
                                {departureStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {labelize(status)}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Field label="Meeting point">
                              <input name="meetingPoint" defaultValue={departure.meetingPoint ?? ""} className={adminInputClassName} />
                            </Field>
                            <Field label="Trip leader">
                              <input name="guide" defaultValue={departure.guide ?? ""} className={adminInputClassName} />
                            </Field>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                            <Field label="Minimum">
                              <input name="minParticipants" type="number" min={1} defaultValue={departure.minParticipants} className={adminInputClassName} />
                            </Field>
                            <Field label="Weather advisory">
                              <input name="weatherAdvisory" defaultValue={departure.weatherAdvisory ?? ""} className={adminInputClassName} />
                            </Field>
                          </div>
                          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
                            <Save className="size-4" aria-hidden="true" />
                            Save Departure
                          </Button>
                        </form>

                        <form action={deleteExpeditionDepartureAction} className="mt-3 rounded-lg border border-coral-700/20 bg-white p-3">
                          <input type="hidden" name="departureId" value={departure.id} />
                          <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                            <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" disabled={departure.bookingCount > 0} required />
                            Delete this departure. Departures with bookings cannot be deleted.
                          </label>
                          <Button
                            type="submit"
                            tone="ghost"
                            className="mt-3 w-fit rounded-lg text-coral-700 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-45"
                            disabled={departure.bookingCount > 0}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Delete Departure
                          </Button>
                        </form>
                      </div>
                    ))}
                    {expedition.departures.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No departures scheduled.</p> : null}
                  </div>

                  <div className="mt-4 rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                    <h5 className="font-bold text-ocean-900">Add departure</h5>
                    <form action={createExpeditionDepartureAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="expeditionId" value={expedition.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Starts at">
                          <input name="startsAt" type="datetime-local" className={adminInputClassName} required />
                        </Field>
                        <Field label="Ends at">
                          <input name="endsAt" type="datetime-local" className={adminInputClassName} required />
                        </Field>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Field label="Capacity">
                          <input name="capacity" type="number" min={1} defaultValue={12} className={adminInputClassName} required />
                        </Field>
                        <Field label="Booked seats">
                          <input name="seatsBooked" type="number" min={0} defaultValue={0} className={adminInputClassName} />
                        </Field>
                        <Field label="Status">
                          <select name="status" defaultValue="open" className={adminSelectClassName}>
                            {departureStatuses.map((status) => (
                              <option key={status} value={status}>
                                {labelize(status)}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Meeting point">
                          <input name="meetingPoint" placeholder={expedition.region} className={adminInputClassName} />
                        </Field>
                        <Field label="Trip leader">
                          <input name="guide" placeholder="Field team leader" className={adminInputClassName} />
                        </Field>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                        <Field label="Minimum">
                          <input name="minParticipants" type="number" min={1} defaultValue={6} className={adminInputClassName} />
                        </Field>
                        <Field label="Weather advisory">
                          <input name="weatherAdvisory" className={adminInputClassName} />
                        </Field>
                      </div>
                      <Button type="submit" className="w-fit rounded-lg">
                        <CalendarPlus className="size-4" aria-hidden="true" />
                        Add Departure
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {data.expeditionCatalog.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No expeditions found.</p> : null}
        </div>
      </section>
    </div>
  );
}
