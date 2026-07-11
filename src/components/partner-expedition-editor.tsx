import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarPlus, Edit3, Plus, Save } from "lucide-react";

import { Field, StatusBadge, inputClassName, labelize, textareaClassName, type PartnerPortalData } from "@/components/partner-portal-ui";
import { RepeatableFields } from "@/components/partner-expedition-repeatable-fields";
import { Button } from "@/components/ui/button";
import {
  createPartnerExpeditionAction,
  createPartnerExpeditionDepartureAction,
  updatePartnerExpeditionAction,
  updatePartnerExpeditionDepartureAction
} from "@/lib/portal-actions";
import type { ExpeditionDetailMetadata } from "@/lib/expedition-metadata";
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
const quickFactLabels = ["Duration", "Small group", "Difficulty", "Min. age", "Swimming ability", "Per person"];
const fileInputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-2 text-sm font-semibold text-ocean-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-ocean-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ocean-700 focus:border-coral-500";

function formatDateTimeInput(date: Date) {
  return date.toISOString().slice(0, 16);
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
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Region">
            <input name="region" placeholder="Raja Ampat" className={inputClassName} required />
          </Field>
          <Field label="Duration days">
            <input name="durationDays" type="number" min={1} defaultValue={4} className={inputClassName} required />
          </Field>
          <Field label="Base price">
            <input name="basePrice" type="number" min={1} step={1000} placeholder="2500000" className={inputClassName} required />
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
        <details className="rounded-lg border border-ocean-900/10 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Public trip facts</summary>
          <div className="grid gap-3 border-t border-ocean-900/10 p-4 md:grid-cols-3">
            <Field label="Category">
              <select name="categoryLabel" defaultValue="Coral Restoration Expedition" className={inputClassName}>
                {categoryLabelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select name="difficulty" defaultValue="Moderate" className={inputClassName}>
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Min. age">
              <input name="minimumAge" type="number" min={0} defaultValue={16} className={inputClassName} />
            </Field>
            <Field label="Swimming ability">
              <select name="swimmingAbility" defaultValue="Snorkeling required" className={inputClassName}>
                {swimmingAbilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Languages">
              <textarea name="languages" defaultValue={"English\nBahasa Indonesia"} className={textareaClassName} />
            </Field>
            <Field label="Skill requirements">
              <textarea name="skillRequirements" defaultValue={"Snorkeling ability required\nDiving certification optional"} className={textareaClassName} />
            </Field>
          </div>
        </details>
        <Button type="submit" className="w-fit" disabled={!canSubmit}>
          <Plus className="size-4" aria-hidden="true" />
          Create Expedition
        </Button>
      </form>
    </details>
  );
}

function DetailFields({ detail }: { detail: ExpeditionDetailMetadata }) {
  const galleryRows = withRows(detail.galleryImages, 5, { src: "", label: "", caption: "", provenance: "" });
  const pillarRows = withRows(detail.overview.pillars, 3, { title: "", body: "" });
  const highlightRows = withRows(detail.highlights, 6, { title: "", status: "" });
  const targetRows = withRows(detail.impact.targets, 4, { value: "", label: "" });
  const allocationRows = withRows(detail.impact.allocation, 6, { label: "", percent: 0 });
  const itineraryRows = withRows(detail.itinerary, 4, { day: "", title: "", meals: "", physicalLevel: "", activities: [] });
  const teamRows = withRows(detail.team, 4, { name: "", role: "", detail: "" });
  const updateRows = withRows(detail.tripUpdates, 2, { title: "", date: "", body: "" });
  const cancellationRows = withRows(detail.cancellationPolicy, 4, { label: "", refund: "" });
  const faqRows = withRows(detail.faqs, 5, { question: "", answer: "" });
  const quickFactsByLabel = new Map(detail.quickFacts.map((fact) => [fact.label, fact.value]));
  const highlightOptions = optionsWithCurrentValues(
    highlightStatusOptions,
    highlightRows.map((highlight) => highlight.status)
  );
  const physicalOptions = optionsWithCurrentValues(
    physicalLevelOptions,
    itineraryRows.map((day) => day.physicalLevel)
  );

  return (
    <div className="grid gap-4">
      <details open className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Public summary</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Category label">
              <select name="categoryLabel" defaultValue={detail.categoryLabel} className={inputClassName}>
                {optionsWithCurrent(categoryLabelOptions, detail.categoryLabel).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select name="difficulty" defaultValue={detail.difficulty} className={inputClassName}>
                {optionsWithCurrent(difficultyOptions, detail.difficulty).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minimum age">
              <input name="minimumAge" type="number" min={0} defaultValue={detail.minimumAge} className={inputClassName} />
            </Field>
          </div>
          <Field label="Activity summary">
            <input name="activitySummary" defaultValue={detail.activitySummary} className={inputClassName} />
          </Field>
          <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
            <p className="text-sm font-bold text-ocean-900">Participant reviews</p>
            <p className="mt-2 text-sm font-semibold text-ocean-900/62">
              {detail.rating.toFixed(1)} rating / {detail.reviewCount.toLocaleString("id-ID")} reviews / {detail.participantCount.toLocaleString("id-ID")} participants
            </p>
          </div>
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
          <div className="grid gap-3 md:grid-cols-2">
            {quickFactLabels.map((label) => (
              <div key={label} className="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[150px_1fr]">
                <span className="flex min-h-11 items-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900/62">{label}</span>
                {label === "Swimming ability" ? (
                  <select name="swimmingAbility" defaultValue={quickFactsByLabel.get(label) ?? "Snorkeling required"} className={inputClassName}>
                    {optionsWithCurrent(swimmingAbilityOptions, quickFactsByLabel.get(label) ?? "").map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex min-h-11 items-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-semibold text-ocean-900">
                    {quickFactsByLabel.get(label) ?? "Generated from expedition data"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Gallery and overview</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
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
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Impact and pricing</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <Field label="Impact title">
            <input name="impactTitle" defaultValue={detail.impact.title} className={inputClassName} />
          </Field>
          <Field label="Impact summary">
            <input name="impactSummary" defaultValue={detail.impact.summary} className={inputClassName} />
          </Field>
          <Field label="Contribution percent">
            <input name="contributionPercent" type="number" min={0} max={100} defaultValue={detail.impact.contributionPercent} className={inputClassName} />
          </Field>
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
          <RepeatableFields
            rows={allocationRows}
            emptyRow={{ label: "", percent: 0 }}
            addLabel="Add allocation"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[1fr_120px]"
            fields={[
              { name: "allocationLabel", valueKey: "label", placeholder: "Allocation label" },
              { name: "allocationPercent", valueKey: "percent", type: "number", min: 0, max: 100, placeholder: "%" }
            ]}
          />
        </div>
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Itinerary and requirements</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <Field label="Itinerary title">
            <input name="itineraryTitle" defaultValue={detail.itineraryTitle} className={inputClassName} />
          </Field>
          <Field label="Itinerary disclaimer">
            <textarea name="itineraryDisclaimer" defaultValue={detail.itineraryDisclaimer} className={textareaClassName} />
          </Field>
          <RepeatableFields
            rows={itineraryRows.map((day) => ({ ...day, activities: listValue(day.activities) }))}
            emptyRow={{ day: "", title: "", meals: "", physicalLevel: "Light", activities: "" }}
            addLabel="Add itinerary day"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-4"
            fields={[
              { name: "itineraryDay", valueKey: "day", placeholder: "Day" },
              { name: "itineraryDayTitle", valueKey: "title", placeholder: "Title" },
              { name: "itineraryMeals", valueKey: "meals", placeholder: "Meals" },
              { name: "itineraryPhysicalLevel", valueKey: "physicalLevel", kind: "select", options: physicalOptions },
              { name: "itineraryActivities", valueKey: "activities", kind: "textarea", placeholder: "Activities", className: "md:col-span-4" }
            ]}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Included">
              <textarea name="included" defaultValue={listValue(detail.included)} className={textareaClassName} />
            </Field>
            <Field label="Not included">
              <textarea name="notIncluded" defaultValue={listValue(detail.notIncluded)} className={textareaClassName} />
            </Field>
            <Field label="Participant requirements">
              <textarea name="requirements" defaultValue={listValue(detail.requirements)} className={textareaClassName} />
            </Field>
            <Field label="Safety standards">
              <textarea name="safety" defaultValue={listValue(detail.safety)} className={textareaClassName} />
            </Field>
          </div>
          <Field label="Emergency plan summary">
            <textarea name="emergencyPlanSummary" defaultValue={detail.emergencyPlanSummary} className={textareaClassName} />
          </Field>
          <Field label="Sustainability standards">
            <textarea name="sustainability" defaultValue={listValue(detail.sustainability)} className={textareaClassName} />
          </Field>
        </div>
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Route, stay, and team</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <Field label="Route title">
            <input name="routeTitle" defaultValue={detail.route.title} className={inputClassName} />
          </Field>
          <Field label="Map embed URL">
            <input name="mapEmbedUrl" defaultValue={detail.route.mapEmbedUrl} className={inputClassName} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Route steps">
              <textarea name="routeSteps" defaultValue={listValue(detail.route.steps)} className={textareaClassName} />
            </Field>
            <Field label="Travel times">
              <textarea name="routeTravelTimes" defaultValue={listValue(detail.route.travelTimes)} className={textareaClassName} />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Accommodation name">
              <input name="accommodationName" defaultValue={detail.accommodation.name} className={inputClassName} />
            </Field>
            <Field label="Accommodation type">
              <select name="accommodationType" defaultValue={detail.accommodation.type} className={inputClassName}>
                {optionsWithCurrent(accommodationTypeOptions, detail.accommodation.type).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Accommodation details">
            <textarea name="accommodationDetails" defaultValue={listValue(detail.accommodation.details)} className={textareaClassName} />
          </Field>
          <Field label="Meal note">
            <textarea name="mealNote" defaultValue={detail.accommodation.mealNote} className={textareaClassName} />
          </Field>
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
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Updates, policy, and FAQ</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <RepeatableFields
            rows={updateRows}
            emptyRow={{ title: "", date: "", body: "" }}
            addLabel="Add trip update"
            gridClassName="grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-[1fr_180px]"
            fields={[
              { name: "tripUpdateTitle", valueKey: "title", placeholder: "Update title" },
              { name: "tripUpdateDate", valueKey: "date", placeholder: "Date" },
              { name: "tripUpdateBody", valueKey: "body", kind: "textarea", placeholder: "Update body", className: "md:col-span-2" }
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
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Weather advisory title">
              <input name="weatherAdvisoryTitle" defaultValue={detail.weatherAdvisory.title} className={inputClassName} />
            </Field>
          </div>
          <Field label="Weather advisory body">
            <textarea name="weatherAdvisoryBody" defaultValue={detail.weatherAdvisory.body} className={textareaClassName} />
          </Field>
        </div>
      </details>
    </div>
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
      <DetailFields detail={detail} />
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
