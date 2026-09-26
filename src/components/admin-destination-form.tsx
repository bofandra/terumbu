import Image from "next/image";
import { Save } from "lucide-react";

import { RepeatableFields } from "@/components/partner-expedition-repeatable-fields";
import {
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import {
  destinationArrivalHubTypes,
  destinationConservationFocusOptions,
  destinationIslandGroups,
  destinationMonthOptions,
  destinationProvinceOptions,
  destinationStatuses,
  type DestinationArrivalHub
} from "@/lib/destination-content";
import { createDestinationAction, updateDestinationAction } from "@/lib/portal-actions";

type DestinationFormValue = {
  id?: string;
  name: string;
  slug: string;
  province: string;
  islandGroup: string;
  eyebrow: string;
  headline: string;
  summary: string;
  heroImageUrl: string | null;
  conservationFocus: string[];
  arrivalHubs: DestinationArrivalHub[];
  bestMonths: number[];
  travelNotes: string[];
  responsibleTravelNotes: string[];
  status: string;
};

function Field({
  label,
  children,
  help
}: {
  label: string;
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
      {label}
      {children}
      {help ? <span className="text-xs font-semibold leading-5 text-ocean-900/52">{help}</span> : null}
    </label>
  );
}

export function AdminDestinationForm({
  destination,
  returnTo
}: {
  destination?: DestinationFormValue;
  returnTo: string;
}) {
  const editing = Boolean(destination?.id);
  const action = editing ? updateDestinationAction : createDestinationAction;
  const hubs = destination?.arrivalHubs.length
    ? destination.arrivalHubs
    : [{ type: "airport" as const, name: "", code: "" }];

  return (
    <form action={action} encType="multipart/form-data" className="grid gap-5">
      <input type="hidden" name="errorReturnTo" value={returnTo} />
      <input type="hidden" name="savedReturnTo" value={returnTo} />
      {destination?.id ? <input type="hidden" name="destinationId" value={destination.id} /> : null}

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Destination identity</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/56">Canonical destination fields reused by expeditions and impact sites.</p>
        </div>
        <div className="grid gap-4 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Destination name">
              <input name="name" defaultValue={destination?.name ?? ""} placeholder="Raja Ampat" className={adminInputClassName} required />
            </Field>
            <Field label="URL slug" help="Stable public URL identifier.">
              <input name="slug" defaultValue={destination?.slug ?? ""} placeholder="raja-ampat" className={adminInputClassName} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Province">
              <select name="province" defaultValue={destination?.province ?? ""} className={adminSelectClassName} required>
                <option value="">Choose province</option>
                {destinationProvinceOptions.map((province) => <option key={province} value={province}>{province}</option>)}
              </select>
            </Field>
            <Field label="Island group">
              <select name="islandGroup" defaultValue={destination?.islandGroup ?? ""} className={adminSelectClassName} required>
                <option value="">Choose island group</option>
                {destinationIslandGroups.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
            </Field>
            <Field label="Publication status">
              <select name="status" defaultValue={destination?.status ?? "draft"} className={adminSelectClassName}>
                {destinationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Short eyebrow" help="Editorial label, for example “Southwest Papua conservation travel”.">
            <input name="eyebrow" defaultValue={destination?.eyebrow ?? ""} className={adminInputClassName} />
          </Field>
          <Field label="Public headline">
            <input name="headline" defaultValue={destination?.headline ?? ""} placeholder="Conservation expeditions in Raja Ampat" className={adminInputClassName} required />
          </Field>
          <Field label="Public summary">
            <textarea name="summary" defaultValue={destination?.summary ?? ""} className={adminTextareaClassName} required />
          </Field>

          <Field label={destination?.heroImageUrl ? "Replace hero image" : "Hero image"}>
            {destination?.heroImageUrl ? (
              <Image src={destination.heroImageUrl} alt="" width={960} height={360} unoptimized className="mb-2 h-44 w-full rounded-lg object-cover" />
            ) : null}
            <input name="heroFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
          </Field>
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Conservation & seasonality</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/56">Bounded facts use checkboxes so public labels stay consistent.</p>
        </div>
        <div className="grid gap-6 p-4">
          <fieldset>
            <legend className="text-sm font-bold text-ocean-900">Conservation focus</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {destinationConservationFocusOptions.map((focus) => (
                <label key={focus} className="flex items-start gap-2 rounded-lg border border-ocean-900/10 bg-sand-50 px-3 py-2 text-sm font-semibold text-ocean-900">
                  <input
                    type="checkbox"
                    name="conservationFocus"
                    value={focus}
                    defaultChecked={destination?.conservationFocus.includes(focus) ?? false}
                    className="mt-0.5 size-4 accent-kelp-500"
                  />
                  {focus}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold text-ocean-900">Best months</legend>
            <p className="mt-1 text-xs font-semibold text-ocean-900/52">Leave all unchecked when seasonality has not been verified.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {destinationMonthOptions.map((month) => (
                <label key={month.value} className="flex items-center gap-2 rounded-lg border border-ocean-900/10 bg-sand-50 px-3 py-2 text-sm font-semibold text-ocean-900">
                  <input
                    type="checkbox"
                    name="bestMonths"
                    value={month.value}
                    defaultChecked={destination?.bestMonths.includes(month.value) ?? false}
                    className="size-4 accent-kelp-500"
                  />
                  {month.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Arrival hubs</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/56">Reuse structured airports, ports, cities, or stations instead of embedding logistics in prose.</p>
        </div>
        <div className="p-4">
          <RepeatableFields
            rows={hubs}
            emptyRow={{ type: "airport", name: "", code: "" }}
            addLabel="Add arrival hub"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-[160px_1fr_140px]"
            fields={[
              { name: "arrivalHubType", valueKey: "type", kind: "select", options: [...destinationArrivalHubTypes] },
              { name: "arrivalHubName", valueKey: "name", placeholder: "Airport, port, city, or station name" },
              { name: "arrivalHubCode", valueKey: "code", placeholder: "IATA / code" }
            ]}
          />
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Traveler guidance</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/56">Narrative fields are reserved for guidance that cannot be calculated or selected from a taxonomy.</p>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="Travel notes" help="One note per line. Only publish facts the platform can maintain.">
            <textarea name="travelNotes" defaultValue={(destination?.travelNotes ?? []).join("\n")} className={adminTextareaClassName} />
          </Field>
          <Field label="Responsible travel notes" help="One note per line.">
            <textarea name="responsibleTravelNotes" defaultValue={(destination?.responsibleTravelNotes ?? []).join("\n")} className={adminTextareaClassName} />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" className="rounded-lg shadow-soft">
          <Save className="size-4" aria-hidden="true" />
          {editing ? "Save destination" : "Create destination"}
        </Button>
      </div>
    </form>
  );
}
