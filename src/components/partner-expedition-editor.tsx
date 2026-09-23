import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarPlus, Edit3, MessageSquareText, Plus, Save } from "lucide-react";

import { Field, StatusBadge, inputClassName, labelize, textareaClassName, type PartnerPortalData } from "@/components/partner-portal-ui";
import { RepeatableFields } from "@/components/partner-expedition-repeatable-fields";
import { ExpeditionItineraryBuilder, ExpeditionListField } from "@/components/partner-expedition-structured-fields";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { ExpeditionMarketplaceFields } from "@/components/expedition-marketplace-fields";
import { processPartnerExpeditionInterestRequestAction } from "@/lib/expedition-interest-actions";
import {
  createPartnerExpeditionAction,
  createPartnerExpeditionDepartureAction,
  updatePartnerExpeditionAction,
  updatePartnerExpeditionDepartureAction
} from "@/lib/portal-actions";
import type { ExpeditionDetailMetadata } from "@/lib/expedition-metadata";
import type { ExpeditionMarketplaceMetadata } from "@/lib/expedition-marketplace";
import { formatCurrency } from "@/lib/utils";

type Expedition = PartnerPortalData["expeditions"][number];
type Campaign = PartnerPortalData["campaigns"][number];

const departureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"];
const categoryLabelOptions = ["Coral Restoration Expedition", "Reef Monitoring Expedition", "Marine Conservation Expedition", "Community Conservation Expedition"];
const difficultyOptions = ["Light", "Moderate", "Challenging", "Advanced"];
const swimmingAbilityOptions = ["No swimming required", "Basic swimming required", "Comfortable swimming required", "Snorkeling required", "Diving certification required"];
const highlightStatusOptions = ["Included", "Guaranteed", "Weather-dependent", "Optional", "Add-on", "Not included"];
const physicalLevelOptions = ["Light", "Moderate", "Active", "Challenging"];
const accommodationTypeOptions = ["Shared twin room included", "Private room upgrade", "Homestay", "Eco-lodge", "Liveaboard", "Hotel partner stay"];
const requestStatuses = ["contacted", "resolved", "converted", "declined", "cancelled"];
const fileInputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-2 text-sm font-semibold text-ocean-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-ocean-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ocean-700 focus:border-coral-500";

function formatDateTimeInput(date: Date) {
  return date.toISOString().slice(0, 16);
}

function formatRequestDate(date: Date) {
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function listValue(items: string[]) {
  return items.join("\n");
}

function paragraphValue(items: string[]) {
  return items.join("\n\n");
}

function withRows<T>(items: T[], minimum: number, empty: T) {
  return [...items, ...Array.from({ length: Math.max(0, minimum - items.length) }, () => empty)];
}

function optionsWithCurrent(options: string[], value: string) {
  return value && !options.includes(value) ? [value, ...options] : options;
}

function optionsWithCurrentValues(options: string[], values: string[]) {
  return values.reduce((choices, value) => optionsWithCurrent(choices, value), options);
}

function CreateExpeditionForm({ campaigns, canManageExpeditions }: { campaigns: Campaign[]; canManageExpeditions: boolean }) {
  const hasCampaigns = campaigns.length > 0;
  const canSubmit = hasCampaigns && canManageExpeditions;

  return (
    <details id="add-expedition" className="rounded-lg border border-ocean-900/10 bg-white shadow-soft">
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-bold text-ocean-900">
        <Plus className="size-4" aria-hidden="true" />
        Add expedition
      </summary>
      <form action={createPartnerExpeditionAction} encType="multipart/form-data" className="grid gap-4 border-t border-ocean-900/10 bg-sand-50 p-5">
        <input type="hidden" name="redirectTo" value="/partner/expeditions" />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <input name="title" placeholder="Raja Ampat Coral Restoration Expedition" className={inputClassName} required />
          </Field>
          <Field label="Slug">
            <input name="slug" placeholder="raja-ampat-coral-restoration" className={inputClassName} required />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Region">
            <input name="region" placeholder="Raja Ampat" className={inputClassName} required />
          </Field>
          <Field label="Duration days">
            <input name="durationDays" type="number" min={1} defaultValue={4} className={inputClassName} required />
          </Field>
          <Field label="Base price">
            <input name="basePrice" type="number" min={1} step={0.01} placeholder="250.00" className={inputClassName} required />
          </Field>
          <Field label="Currency">
            <select name="currency" defaultValue="USD" className={inputClassName} required>
              <option value="USD">USD</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Related campaign">
            <select name="relatedCampaignId" className={inputClassName} required disabled={!canSubmit}>
              <option value="">Choose campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title} / {campaign.status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Image upload">
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={fileInputClassName} />
          </Field>
        </div>
        <Field label="Summary">
          <textarea name="summary" placeholder="Short public trip summary." className={textareaClassName} required />
        </Field>
        <Button type="submit" className="w-fit" disabled={!canSubmit}>
          <Plus className="size-4" aria-hidden="true" />
          Create Expedition
        </Button>
      </form>
    </details>
  );
}

function DetailFields({ detail, marketplace }: { detail: ExpeditionDetailMetadata; marketplace: ExpeditionMarketplaceMetadata }) {
  const galleryRows = withRows(detail.galleryImages, 5, { src: "", label: "", caption: "", provenance: "" });
  const pillarRows = withRows(detail.overview.pillars, 3, { title: "", body: "" });
  const highlightRows = withRows(detail.highlights, 6, { title: "", status: "" });
  const targetRows = withRows(detail.impact.targets, 4, { value: "", label: "" });
  const itineraryRows = withRows(detail.itinerary, 4, { day: "", title: "", meals: "", physicalLevel: "", activities: [] });
  const teamRows = withRows(detail.team, 4, { name: "", role: "", detail: "" });
  const updateRows = withRows(detail.tripUpdates, 2, { title: "", date: "", body: "" });
  const cancellationRows = withRows(detail.cancellationPolicy, 4, { label: "", refund: "" });
  const faqRows = withRows(detail.faqs, 5, { question: "", answer: "" });
  const currentSwimmingAbility = detail.quickFacts.find((fact) => fact.label === "Swimming ability")?.value ?? "Snorkeling required";
  const highlightOptions = optionsWithCurrentValues(
    highlightStatusOptions,
    highlightRows.map((highlight) => highlight.status)
  );
  const physicalOptions = optionsWithCurrentValues(
    physicalLevelOptions,
    itineraryRows.map((day) => day.physicalLevel)
  );

  return (
    <FormTabs
      ariaLabel="Expedition public content editor"
      tabs={[
        { id: "public", label: "Public page", description: "Summary, gallery, marketplace" },
        { id: "impact", label: "Impact", description: "Conservation contribution" },
        { id: "itinerary", label: "Itinerary & logistics", description: "Days, route, stay, requirements" },
        { id: "team", label: "Team", description: "Expedition people" },
        { id: "policy", label: "Policy & FAQ", description: "Updates, cancellation, weather" }
      ]}
    >
      <div className="grid gap-4">
        <ExpeditionMarketplaceFields marketplace={marketplace} inputClassName={inputClassName} textareaClassName={textareaClassName} />

        <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h3 className="text-lg font-bold text-ocean-900">Public summary</h3>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Category label">
                <select name="categoryLabel" defaultValue={detail.categoryLabel} className={inputClassName}>
                  {optionsWithCurrent(categoryLabelOptions, detail.categoryLabel).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty">
                <select name="difficulty" defaultValue={detail.difficulty} className={inputClassName}>
                  {optionsWithCurrent(difficultyOptions, detail.difficulty).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Minimum age">
                <input name="minimumAge" type="number" min={0} defaultValue={detail.minimumAge} className={inputClassName} />
              </Field>
              <Field label="Swimming ability">
                <select name="swimmingAbility" defaultValue={currentSwimmingAbility} className={inputClassName}>
                  {optionsWithCurrent(swimmingAbilityOptions, currentSwimmingAbility).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Activity summary">
              <input name="activitySummary" defaultValue={detail.activitySummary} className={inputClassName} />
            </Field>
            <Field label="Documentation link">
              <input name="documentationUrl" type="url" defaultValue={detail.documentationUrl} placeholder="https://drive.google.com/..." className={inputClassName} />
            </Field>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Languages">
                <textarea name="languages" defaultValue={listValue(detail.languages)} className={textareaClassName} />
              </Field>
              <Field label="Skill requirements">
                <textarea name="skillRequirements" defaultValue={listValue(detail.skillRequirements)} className={textareaClassName} />
              </Field>
              <Field label="Tags">
                <textarea name="tags" defaultValue={listValue(detail.tags)} className={textareaClassName} />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h3 className="text-lg font-bold text-ocean-900">Gallery & overview</h3>
          <div className="mt-4 grid gap-4">
            <RepeatableFields
              rows={galleryRows}
              emptyRow={{ src: "", label: "", caption: "", provenance: "" }}
              addLabel="Add image"
              fields={[
                { name: "galleryLabel", valueKey: "label", placeholder: "Image label" },
                { name: "galleryImageFile", kind: "file", hiddenExistingName: "galleryExistingSrc", hiddenExistingKey: "src" },
                { name: "galleryCaption", valueKey: "caption", placeholder: "Caption" },
                { name: "galleryProvenance", valueKey: "provenance", placeholder: "Provenance" }
              ]}
            />
            <Field label="Overview title">
              <input name="overviewTitle" defaultValue={detail.overview.title} className={inputClassName} />
            </Field>
            <Field label="Overview paragraphs">
              <textarea name="overviewParagraphs" defaultValue={paragraphValue(detail.overview.paragraphs)} className={`${textareaClassName} min-h-40`} />
            </Field>
            <RepeatableFields
              rows={pillarRows}
              emptyRow={{ title: "", body: "" }}
              addLabel="Add pillar"
              gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3"
              fields={[
                { name: "pillarTitle", valueKey: "title", placeholder: "Pillar title" },
                { name: "pillarBody", valueKey: "body", kind: "textarea", placeholder: "Pillar body" }
              ]}
            />
            <Field label="Passport note">
              <input name="passportNote" defaultValue={detail.overview.passportNote} className={inputClassName} />
            </Field>
            <RepeatableFields
              rows={highlightRows}
              emptyRow={{ title: "", status: "Included" }}
              addLabel="Add highlight"
              gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[1fr_180px]"
              fields={[
                { name: "highlightTitle", valueKey: "title", placeholder: "Highlight" },
                { name: "highlightStatus", valueKey: "status", kind: "select", options: highlightOptions }
              ]}
            />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
        <h3 className="text-lg font-bold text-ocean-900">Conservation contribution</h3>
        <div className="mt-4 grid gap-4">
          <Field label="Impact summary">
            <input name="impactSummary" defaultValue={detail.impact.summary} className={inputClassName} />
          </Field>
          <Field label="Contribution percent" help="Public contribution amount is calculated from Base price x this percentage.">
            <input name="contributionPercent" type="number" min={0} max={100} defaultValue={detail.impact.contributionPercent} className={inputClassName} />
          </Field>
          <p className="text-xs font-semibold leading-5 text-ocean-900/54">
            Custom impact targets appear in the public impact section. Leave them blank to use campaign-backed impact targets when available.
          </p>
          <RepeatableFields
            rows={targetRows}
            emptyRow={{ value: "", label: "" }}
            addLabel="Add impact target"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[140px_1fr]"
            fields={[
              { name: "impactTargetValue", valueKey: "value", placeholder: "Value" },
              { name: "impactTargetLabel", valueKey: "label", placeholder: "Impact target" }
            ]}
          />
        </div>
      </section>

      <div className="grid gap-4">
        <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <div>
            <h3 className="text-lg font-bold text-ocean-900">Itinerary</h3>
            <p className="mt-1 text-sm font-semibold text-ocean-900/54">
              The itinerary is the day-by-day participant journey. Route and travel logistics are managed in the same workflow below.
            </p>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Itinerary title">
              <input name="itineraryTitle" defaultValue={detail.itineraryTitle} className={inputClassName} />
            </Field>
            <Field label="Itinerary disclaimer">
              <textarea name="itineraryDisclaimer" defaultValue={detail.itineraryDisclaimer} className={textareaClassName} />
            </Field>
            <ExpeditionItineraryBuilder rows={itineraryRows} physicalOptions={physicalOptions} />
          </div>
        </section>

        <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h3 className="text-lg font-bold text-ocean-900">Route & travel logistics</h3>
          <p className="mt-1 text-sm font-semibold text-ocean-900/54">
            Route describes how participants move between arrival points, the base, and conservation areas. It complements the itinerary rather than being a separate trip concept.
          </p>
          <div className="mt-4 grid gap-4">
            <Field label="Route title">
              <input name="routeTitle" defaultValue={detail.route.title} className={inputClassName} />
            </Field>
            <Field label="Map embed URL">
              <input name="mapEmbedUrl" defaultValue={detail.route.mapEmbedUrl} className={inputClassName} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <ExpeditionListField label="Route steps" name="routeSteps" items={detail.route.steps} addLabel="Add route step" placeholder="Route step" />
              <ExpeditionListField label="Travel times" name="routeTravelTimes" items={detail.route.travelTimes} addLabel="Add travel time" placeholder="Travel time" />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h3 className="text-lg font-bold text-ocean-900">Stay, inclusions & requirements</h3>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Accommodation name">
                <input name="accommodationName" defaultValue={detail.accommodation.name} className={inputClassName} />
              </Field>
              <Field label="Accommodation type">
                <select name="accommodationType" defaultValue={detail.accommodation.type} className={inputClassName}>
                  {optionsWithCurrent(accommodationTypeOptions, detail.accommodation.type).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
            </div>
            <ExpeditionListField label="Accommodation details" name="accommodationDetails" items={detail.accommodation.details} addLabel="Add accommodation detail" placeholder="Accommodation detail" />
            <Field label="Meal note">
              <textarea name="mealNote" defaultValue={detail.accommodation.mealNote} className={textareaClassName} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <ExpeditionListField label="Included" name="included" items={detail.included} addLabel="Add included item" placeholder="Included item" />
              <ExpeditionListField label="Not included" name="notIncluded" items={detail.notIncluded} addLabel="Add exclusion" placeholder="Not included item" />
              <ExpeditionListField label="Participant requirements" name="requirements" items={detail.requirements} addLabel="Add requirement" placeholder="Requirement" />
              <ExpeditionListField label="Safety standards" name="safety" items={detail.safety} addLabel="Add safety item" placeholder="Safety item" />
            </div>
            <Field label="Emergency plan summary">
              <textarea name="emergencyPlanSummary" defaultValue={detail.emergencyPlanSummary} className={textareaClassName} />
            </Field>
            <ExpeditionListField label="Sustainability standards" name="sustainability" items={detail.sustainability} addLabel="Add sustainability item" placeholder="Sustainability standard" />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
        <h3 className="text-lg font-bold text-ocean-900">Expedition team</h3>
        <p className="mt-1 text-sm font-semibold text-ocean-900/54">People shown on the public expedition page.</p>
        <div className="mt-4">
          <RepeatableFields
            rows={teamRows}
            emptyRow={{ name: "", role: "", detail: "" }}
            addLabel="Add team member"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-[1fr_1fr_2fr]"
            fields={[
              { name: "teamName", valueKey: "name", placeholder: "Name" },
              { name: "teamRole", valueKey: "role", placeholder: "Role" },
              { name: "teamDetail", valueKey: "detail", placeholder: "Detail" }
            ]}
          />
        </div>
      </section>

      <section className="rounded-lg border border-ocean-900/10 bg-white p-4">
        <h3 className="text-lg font-bold text-ocean-900">Activity, policy & FAQ</h3>
        <div className="mt-4 grid gap-4">
          <RepeatableFields
            rows={updateRows}
            emptyRow={{ title: "", date: "", body: "" }}
            addLabel="Add trip activity"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-[1fr_180px]"
            fields={[
              { name: "tripUpdateTitle", valueKey: "title", placeholder: "Activity title" },
              { name: "tripUpdateDate", valueKey: "date", placeholder: "Date" },
              { name: "tripUpdateBody", valueKey: "body", kind: "textarea", placeholder: "Activity body", className: "md:col-span-2" }
            ]}
          />
          <RepeatableFields
            rows={cancellationRows}
            emptyRow={{ label: "", refund: "" }}
            addLabel="Add policy row"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[1fr_160px]"
            fields={[
              { name: "cancellationLabel", valueKey: "label", placeholder: "Policy window" },
              { name: "cancellationRefund", valueKey: "refund", placeholder: "Refund" }
            ]}
          />
          <RepeatableFields
            rows={faqRows}
            emptyRow={{ question: "", answer: "" }}
            addLabel="Add FAQ"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3"
            fields={[
              { name: "faqQuestion", valueKey: "question", placeholder: "Question" },
              { name: "faqAnswer", valueKey: "answer", kind: "textarea", placeholder: "Answer" }
            ]}
          />
          <Field label="Weather advisory title">
            <input name="weatherAdvisoryTitle" defaultValue={detail.weatherAdvisory.title} className={inputClassName} />
          </Field>
          <Field label="Weather advisory body">
            <textarea name="weatherAdvisoryBody" defaultValue={detail.weatherAdvisory.body} className={textareaClassName} />
          </Field>
        </div>
      </section>
    </FormTabs>
  );
}

function ExpeditionDetailForm({ expedition, campaigns }: { expedition: Expedition; campaigns: Campaign[] }) {
  const detail = expedition.detailMetadata;

  if (!detail) {
    return null;
  }

  return (
    <form action={updatePartnerExpeditionAction} encType="multipart/form-data" className="grid gap-4 border-t border-ocean-900/10 bg-sand-50 p-5">
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
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Region">
          <input name="region" defaultValue={expedition.region} className={inputClassName} required />
        </Field>
        <Field label="Duration days">
          <input name="durationDays" type="number" min={1} defaultValue={expedition.durationDays} className={inputClassName} required />
        </Field>
        <Field label="Base price">
          <input name="basePrice" type="number" min={1} step={0.01} defaultValue={expedition.basePrice} className={inputClassName} required />
        </Field>
        <Field label="Currency">
          <select name="currency" defaultValue={expedition.currency} className={inputClassName} required>
            <option value="USD">USD</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Related campaign">
          <select name="relatedCampaignId" defaultValue={expedition.relatedCampaignId ?? ""} className={inputClassName} required>
            <option value="">Choose campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title} / {campaign.status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Image upload">
          {expedition.imageUrl ? <Image src={expedition.imageUrl} alt="" width={480} height={160} unoptimized className="mb-2 h-24 w-full rounded-lg object-cover" /> : null}
          <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={fileInputClassName} />
        </Field>
      </div>
      <Field label="Summary">
        <textarea name="summary" defaultValue={expedition.summary} className={textareaClassName} required />
      </Field>
      <DetailFields detail={detail} marketplace={expedition.marketplaceMetadata!} />
      <Button type="submit" className="w-fit">
        <Save className="size-4" aria-hidden="true" />
        Save Expedition
      </Button>
    </form>
  );
}

function DepartureForms({ expedition }: { expedition: Expedition }) {
  return (
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
  );
}

export function PartnerExpeditionWorkspace({
  campaigns,
  expeditions,
  canManageExpeditions
}: {
  campaigns: Campaign[];
  expeditions: Expedition[];
  canManageExpeditions: boolean;
}) {
  return (
    <section className="grid gap-4">
      {canManageExpeditions ? (
        <CreateExpeditionForm campaigns={campaigns} canManageExpeditions={canManageExpeditions} />
      ) : (
        <div className="rounded-lg border border-ocean-900/10 bg-white p-5 text-sm font-semibold text-ocean-900/62 shadow-soft">
          Your partner role can view expedition records, but cannot change trip details or departures.
        </div>
      )}

      {expeditions.map((expedition) => (
        <article key={expedition.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
          <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-5 md:flex-row md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-normal text-ocean-900">{expedition.title}</h2>
                <StatusBadge value={expedition.relatedCampaignTitle ? "published" : "draft"} />
              </div>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                {expedition.partner ?? "Partner"} / {expedition.region} / {expedition.durationDays} days / {formatCurrency(expedition.basePrice, expedition.currency)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                {expedition.departures.length.toLocaleString("id-ID")} departures / {expedition.bookingCount.toLocaleString("id-ID")} bookings / {expedition.interestRequests.length.toLocaleString("id-ID")} requests
              </p>
            </div>
            <Link href={`/expeditions/${expedition.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
              Public page
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {canManageExpeditions ? (
            <>
              <details className="border-b border-ocean-900/10">
                <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-bold text-ocean-900">
                  <Edit3 className="size-4" aria-hidden="true" />
                  Edit public trip detail
                </summary>
                <ExpeditionDetailForm expedition={expedition} campaigns={campaigns} />
              </details>

              <details>
                <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-bold text-ocean-900">
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Manage departures
                </summary>
                <DepartureForms expedition={expedition} />
              </details>

              <details>
                <summary className="flex cursor-pointer items-center gap-2 border-t border-ocean-900/10 px-5 py-4 text-sm font-bold text-ocean-900">
                  <MessageSquareText className="size-4" aria-hidden="true" />
                  Manage requests
                  {expedition.interestRequests.length > 0 ? (
                    <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-bold text-ocean-700">{expedition.interestRequests.length.toLocaleString("id-ID")}</span>
                  ) : null}
                </summary>
                <div className="divide-y divide-ocean-900/10 border-t border-ocean-900/10 bg-sand-50">
                  {expedition.interestRequests.map((request) => (
                    <article key={request.id} className="p-5">
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-ocean-900">{request.contactName}</h3>
                            <StatusBadge value={request.requestType} />
                            <StatusBadge value={request.status} />
                          </div>
                          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                            {request.contactEmail} / {request.requestType === "question" ? "Question" : `${request.participantsCount} participants`} / {request.requestCode}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                            Created {formatRequestDate(request.createdAt)}
                            {request.preferredStartAt ? ` / Preferred ${request.preferredStartAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}` : ""}
                          </p>
                          {request.message ? <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-ocean-900/68">{request.message}</p> : null}
                        </div>
                        {request.processedAt ? (
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                            Processed {request.processedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                            {request.processedByEmail ? ` by ${request.processedByEmail}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <form action={processPartnerExpeditionInterestRequestAction} className="mt-4 grid gap-2 lg:grid-cols-[180px_1fr_auto]">
                        <input type="hidden" name="returnTo" value="/partner/expeditions" />
                        <input type="hidden" name="requestId" value={request.id} />
                        <select name="status" defaultValue={request.status === "pending" ? "contacted" : request.status} className={inputClassName} aria-label="Expedition request status">
                          {requestStatuses.map((status) => (
                            <option key={status} value={status}>
                              {labelize(status)}
                            </option>
                          ))}
                        </select>
                        <input name="note" placeholder="Partner note" className={inputClassName} />
                        <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">
                          <Save className="size-4" aria-hidden="true" />
                          Update request
                        </Button>
                      </form>
                    </article>
                  ))}
                  {expedition.interestRequests.length === 0 ? (
                    <p className="p-5 text-sm font-semibold text-ocean-900/58">No questions, waitlist, or private departure requests yet.</p>
                  ) : null}
                </div>
              </details>
            </>
          ) : null}
        </article>
      ))}

      {expeditions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">
          No expeditions are linked to your campaigns yet.
        </div>
      ) : null}
    </section>
  );
}
