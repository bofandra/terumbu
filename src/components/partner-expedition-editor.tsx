import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarPlus, Plus, Save } from "lucide-react";

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
type Destination = PartnerPortalData["destinations"][number];

const departureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"];
const categoryLabelOptions = ["Coral Restoration Expedition", "Reef Monitoring Expedition", "Marine Conservation Expedition", "Community Conservation Expedition"];
const difficultyOptions = ["Light", "Moderate", "Challenging", "Advanced"];
const swimmingAbilityOptions = ["Not specified", "No swimming required", "Basic swimming required", "Comfortable swimming required", "Snorkeling required", "Diving certification required"];
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

export function PartnerExpeditionCreateForm({
  campaigns,
  destinations,
  canManageExpeditions
}: {
  campaigns: Campaign[];
  destinations: Destination[];
  canManageExpeditions: boolean;
}) {
  const hasCampaigns = campaigns.length > 0;
  const hasDestinations = destinations.length > 0;
  const canSubmit = hasCampaigns && hasDestinations && canManageExpeditions;

  return (
    <details open className="rounded-lg border border-ocean-900/10 bg-white shadow-soft">
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-bold text-ocean-900">
        <Plus className="size-4" aria-hidden="true" />
        Expedition basics
      </summary>
      <form action={createPartnerExpeditionAction} encType="multipart/form-data" className="grid gap-4 border-t border-ocean-900/10 bg-sand-50 p-5">
        <input type="hidden" name="redirectTo" value="/partner/expeditions/new" />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <input name="title" placeholder="Raja Ampat Coral Restoration Expedition" className={inputClassName} required />
          </Field>
          <Field label="Slug">
            <input name="slug" placeholder="raja-ampat-coral-restoration" className={inputClassName} required />
            <span className="text-xs font-semibold text-ocean-900/48">Use a stable URL slug. Public facts are never inferred from this field.</span>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Destination" required>
            <select name="destinationId" defaultValue="" className={inputClassName} required disabled={!hasDestinations}>
              <option value="">Choose managed destination</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name} / {destination.province}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Local area / region" help="Optional. Leave blank to use the destination name.">
            <input name="region" placeholder="Misool, South Raja Ampat" className={inputClassName} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
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
  const currentSwimmingAbility = detail.quickFacts.find((fact) => fact.label === "Swimming ability")?.value ?? "Not specified";
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
          <h3 className="text-lg font-bold text-ocean-900">International traveler readiness</h3>
          <p className="mt-1 text-sm font-semibold text-ocean-900/54">
            Give overseas travelers enough practical information to decide, plan arrival, and understand what they must arrange themselves.
          </p>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Meeting point">
                <input name="travelMeetingPoint" defaultValue={detail.travelInfo.meetingPoint} className={inputClassName} />
              </Field>
              <Field label="Nearest airport / arrival hub">
                <input name="travelNearestAirport" defaultValue={detail.travelInfo.nearestAirport} className={inputClassName} />
              </Field>
              <Field label="Local time zone">
                <select name="travelLocalTimeZone" defaultValue={detail.travelInfo.localTimeZone} className={inputClassName}>
                  <option value="">Not specified</option><option value="WIB (UTC+7)">WIB (UTC+7)</option><option value="WITA (UTC+8)">WITA (UTC+8)</option><option value="WIT (UTC+9)">WIT (UTC+9)</option>
                </select>
              </Field>
              <Field label="Connectivity">
                <input name="travelConnectivity" defaultValue={detail.travelInfo.connectivity} className={inputClassName} />
              </Field>
            </div>
            <Field label="Airport / arrival transfer">
              <textarea name="travelAirportTransfer" defaultValue={detail.travelInfo.airportTransfer} className={textareaClassName} />
            </Field>
            <Field label="Arrival guidance">
              <textarea name="travelArrivalGuidance" defaultValue={detail.travelInfo.arrivalGuidance} className={textareaClassName} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Visa & entry guidance">
                <textarea name="travelVisaGuidance" defaultValue={detail.travelInfo.visaGuidance} className={textareaClassName} />
              </Field>
              <Field label="Travel insurance guidance">
                <textarea name="travelInsuranceGuidance" defaultValue={detail.travelInfo.insuranceGuidance} className={textareaClassName} />
              </Field>
            </div>
            <Field label="Traveler support contact">
              <textarea name="travelSupportContact" defaultValue={detail.travelInfo.supportContact} className={textareaClassName} />
            </Field>
            <ExpeditionListField
              label="Packing highlights"
              name="travelPackingHighlights"
              items={detail.travelInfo.packingHighlights}
              addLabel="Add packing item"
              placeholder="Packing item"
            />
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

function ExpeditionDetailForm({
  expedition,
  campaigns,
  destinations,
  returnTo
}: {
  expedition: Expedition;
  campaigns: Campaign[];
  destinations: Destination[];
  returnTo: string;
}) {
  const detail = expedition.detailMetadata;

  if (!detail) {
    return (
      <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5 text-sm font-semibold text-ocean-900/58">
        Public expedition metadata is not available yet.
      </div>
    );
  }

  return (
    <form action={updatePartnerExpeditionAction} encType="multipart/form-data" className="grid gap-5">
      <input type="hidden" name="redirectTo" value={returnTo} />
      <input type="hidden" name="expeditionId" value={expedition.id} />

      <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div>
          <h2 className="text-xl font-bold text-ocean-900">Core trip details</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/54">
            Basic information used across the public page, booking flow, and departure planning.
          </p>
        </div>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title">
              <input name="title" defaultValue={expedition.title} className={inputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" defaultValue={expedition.slug} className={inputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Destination" required>
              <select name="destinationId" defaultValue={expedition.destinationId ?? ""} className={inputClassName} required>
                <option value="">Choose managed destination</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name} / {destination.province}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Local area / region" help="Optional. Leave blank to use the destination name.">
              <input name="region" defaultValue={expedition.region} className={inputClassName} />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
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
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Publication status">
              {expedition.status === "published" ? (
                <p className="mb-2 rounded-lg bg-sand-50 px-3 py-2 text-xs font-bold leading-5 text-ocean-900/64">
                  Saving core expedition changes sends this published trip back to review and temporarily removes it from public booking until Platform Admin approves it again.
                </p>
              ) : null}
              <select name="status" defaultValue={expedition.status} className={inputClassName}>
                {!["draft", "review"].includes(expedition.status) ? <option value={expedition.status}>{labelize(expedition.status)}</option> : null}
                <option value="draft">Draft</option>
                <option value="review">Submit for review</option>
              </select>
            </Field>
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
            <Field label="Hero image">
              {expedition.imageUrl ? (
                <Image src={expedition.imageUrl} alt="" width={480} height={160} unoptimized className="mb-2 h-24 w-full rounded-lg object-cover" />
              ) : null}
              <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={fileInputClassName} />
            </Field>
          </div>
          <Field label="Summary">
            <textarea name="summary" defaultValue={expedition.summary} className={textareaClassName} required />
          </Field>
        </div>
      </section>

      <DetailFields detail={detail} marketplace={expedition.marketplaceMetadata!} />

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" className="shadow-soft">
          <Save className="size-4" aria-hidden="true" />
          Save expedition
        </Button>
      </div>
    </form>
  );
}

function DepartureForms({ expedition, returnTo }: { expedition: Expedition; returnTo: string }) {
  return (
    <div className="grid gap-4">
      {expedition.departures.length > 0 ? (
        expedition.departures.map((departure) => (
          <form key={departure.id} action={updatePartnerExpeditionDepartureAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <input type="hidden" name="redirectTo" value={returnTo} />
            <input type="hidden" name="departureId" value={departure.id} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-ocean-900">
                  {departure.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} - {departure.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
                <p className="mt-1 text-xs font-semibold text-ocean-900/48">
                  {departure.seatsBooked.toLocaleString("id-ID")} / {departure.capacity.toLocaleString("id-ID")} seats booked
                </p>
              </div>
              <StatusBadge value={departure.status} />
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
                    <option key={status} value={status}>{labelize(status)}</option>
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
              Save departure
            </Button>
          </form>
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5">
          <p className="font-bold text-ocean-900">No departures yet.</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/54">Add the first bookable date for this expedition.</p>
        </div>
      )}

      <details className="rounded-lg border border-ocean-900/10 bg-white shadow-soft">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-coral-700">
          <Plus className="size-4" aria-hidden="true" />
          Add departure
        </summary>
        <form action={createPartnerExpeditionDepartureAction} className="grid gap-3 border-t border-ocean-900/10 p-4">
          <input type="hidden" name="redirectTo" value={returnTo} />
          <input type="hidden" name="expeditionId" value={expedition.id} />
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
                  <option key={status} value={status}>{labelize(status)}</option>
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
            Add departure
          </Button>
        </form>
      </details>
    </div>
  );
}

function RequestList({ expedition, returnTo }: { expedition: Expedition; returnTo: string }) {
  return (
    <div className="grid gap-3">
      {expedition.interestRequests.map((request) => (
        <article key={request.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
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
              {request.message ? <p className="mt-3 rounded-lg bg-sand-50 p-3 text-sm font-semibold leading-6 text-ocean-900/68">{request.message}</p> : null}
            </div>
            {request.processedAt ? (
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                Processed {request.processedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                {request.processedByEmail ? ` by ${request.processedByEmail}` : ""}
              </p>
            ) : null}
          </div>
          <form action={processPartnerExpeditionInterestRequestAction} className="mt-4 grid gap-2 lg:grid-cols-[180px_1fr_auto]">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="requestId" value={request.id} />
            <select name="status" defaultValue={request.status === "pending" ? "contacted" : request.status} className={inputClassName} aria-label="Expedition request status">
              {requestStatuses.map((status) => (
                <option key={status} value={status}>{labelize(status)}</option>
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
        <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5">
          <p className="font-bold text-ocean-900">No requests yet.</p>
          <p className="mt-1 text-sm font-semibold text-ocean-900/54">Questions, waitlist entries, and private group requests will appear here.</p>
        </div>
      ) : null}
    </div>
  );
}

export function PartnerExpeditionWorkspace({
  expeditions,
  canManageExpeditions
}: {
  expeditions: Expedition[];
  canManageExpeditions: boolean;
}) {
  return (
    <section className="grid gap-4">
      {!canManageExpeditions ? (
        <div className="rounded-lg border border-ocean-900/10 bg-white p-5 text-sm font-semibold text-ocean-900/62 shadow-soft">
          Your partner role can view expedition records, but cannot change trip details or departures.
        </div>
      ) : null}

      <div className="grid gap-4">
        {expeditions.map((expedition) => (
          <article key={expedition.id} className="grid overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft md:grid-cols-[220px_1fr]">
            <div className="relative min-h-44 bg-ocean-900">
              {expedition.imageUrl ? (
                <Image src={expedition.imageUrl} alt="" fill unoptimized className="object-cover" />
              ) : (
                <div className="grid h-full min-h-44 place-items-center text-sm font-bold text-white/60">Expedition</div>
              )}
            </div>
            <div className="p-5">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold tracking-normal text-ocean-900">{expedition.title}</h2>
                    <StatusBadge value={expedition.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {expedition.partner ?? "Partner"} · {expedition.region} · {expedition.durationDays} days
                  </p>
                </div>
                {expedition.status === "published" ? (
                  <Link href={`/expeditions/${expedition.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                    Public page
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="text-sm font-bold text-ocean-900/42">Public page available after approval</span>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Price</p>
                  <p className="mt-1 font-bold text-ocean-900">{formatCurrency(expedition.basePrice, expedition.currency)}</p>
                </div>
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Departures</p>
                  <p className="mt-1 font-bold text-ocean-900">{expedition.departures.length.toLocaleString("id-ID")}</p>
                </div>
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Bookings</p>
                  <p className="mt-1 font-bold text-ocean-900">{expedition.bookingCount.toLocaleString("id-ID")}</p>
                </div>
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Requests</p>
                  <p className="mt-1 font-bold text-ocean-900">{expedition.interestRequests.length.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/partner/expeditions/${expedition.id}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ocean-900 px-4 text-sm font-bold text-white hover:bg-ocean-700"
                >
                  Manage expedition
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {expeditions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">
          No expeditions are linked to your campaigns yet.
        </div>
      ) : null}
    </section>
  );
}

export function PartnerExpeditionDetailWorkspace({
  campaigns,
  destinations,
  expedition,
  canManageExpeditions,
  defaultTabId
}: {
  campaigns: Campaign[];
  destinations: Destination[];
  expedition: Expedition;
  canManageExpeditions: boolean;
  defaultTabId?: string;
}) {
  const basePath = `/partner/expeditions/${expedition.id}`;
  const contentReturnTo = `${basePath}?tab=content`;
  const departuresReturnTo = `${basePath}?tab=departures`;
  const requestsReturnTo = `${basePath}?tab=requests`;
  const nextDeparture = [...expedition.departures].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  return (
    <div className="space-y-6">
      <Link href="/partner/expeditions" className="inline-flex text-sm font-bold text-ocean-900/62 hover:text-coral-700">
        ← Expeditions
      </Link>

      <section className="overflow-hidden rounded-xl border border-ocean-900/10 bg-white shadow-soft">
        <div className="relative min-h-48 bg-ocean-900">
          {expedition.imageUrl ? <Image src={expedition.imageUrl} alt="" fill unoptimized className="object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-r from-ocean-900/90 via-ocean-900/55 to-ocean-900/20" />
          <div className="relative z-10 flex min-h-48 flex-col justify-between p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <StatusBadge value={expedition.status} />
              {expedition.status === "published" ? (
                <Link href={`/expeditions/${expedition.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-ocean-900">
                  View public page
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="inline-flex min-h-10 items-center rounded-lg bg-white/15 px-3 text-sm font-bold text-white/80">
                  Awaiting publication
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal">{expedition.title}</h1>
              <p className="mt-2 text-sm font-semibold text-white/78">
                {expedition.partner ?? "Partner"} · {expedition.region} · {expedition.durationDays} days
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Base price</p>
            <p className="mt-2 text-xl font-bold text-ocean-900">{formatCurrency(expedition.basePrice, expedition.currency)}</p>
          </article>
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Departures</p>
            <p className="mt-2 text-xl font-bold text-ocean-900">{expedition.departures.length.toLocaleString("id-ID")}</p>
            <p className="mt-1 text-xs font-semibold text-ocean-900/54">
              {nextDeparture ? `Next ${nextDeparture.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}` : "No upcoming date"}
            </p>
          </article>
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Bookings</p>
            <p className="mt-2 text-xl font-bold text-ocean-900">{expedition.bookingCount.toLocaleString("id-ID")}</p>
          </article>
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Requests</p>
            <p className="mt-2 text-xl font-bold text-ocean-900">{expedition.interestRequests.length.toLocaleString("id-ID")}</p>
          </article>
        </div>
      </section>

      <FormTabs
        ariaLabel={`${expedition.title} expedition workspace`}
        defaultTabId={defaultTabId}
        syncQueryParam="tab"
        tabs={[
          { id: "overview", label: "Overview", description: "Trip health" },
          { id: "content", label: "Trip content", description: "Public page and itinerary" },
          { id: "departures", label: "Departures", description: "Dates and capacity", badge: expedition.departures.length.toLocaleString("id-ID") },
          { id: "requests", label: "Requests", description: "Questions and private groups", badge: expedition.interestRequests.length.toLocaleString("id-ID") }
        ]}
      >
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5">
            <h2 className="text-xl font-bold text-ocean-900">Expedition summary</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-ocean-900/64">{expedition.summary}</p>
            <div className="mt-5 grid gap-2 text-sm">
              <p><span className="font-bold text-ocean-900">Related campaign:</span> <span className="font-semibold text-ocean-900/60">{expedition.relatedCampaignTitle ?? "Not linked"}</span></p>
              <p><span className="font-bold text-ocean-900">Duration:</span> <span className="font-semibold text-ocean-900/60">{expedition.durationDays} days</span></p>
              <p><span className="font-bold text-ocean-900">Region:</span> <span className="font-semibold text-ocean-900/60">{expedition.region}</span></p>
            </div>
          </section>
          <section className="rounded-lg border border-ocean-900/10 bg-sand-50 p-5">
            <h2 className="text-lg font-bold text-ocean-900">Operational snapshot</h2>
            <div className="mt-4 grid gap-3">
              <div className="flex justify-between gap-3 border-b border-ocean-900/10 pb-3 text-sm">
                <span className="font-semibold text-ocean-900/54">Upcoming departure</span>
                <span className="font-bold text-ocean-900">{nextDeparture ? nextDeparture.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "None"}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-ocean-900/10 pb-3 text-sm">
                <span className="font-semibold text-ocean-900/54">Bookings</span>
                <span className="font-bold text-ocean-900">{expedition.bookingCount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-semibold text-ocean-900/54">Open requests</span>
                <span className="font-bold text-ocean-900">{expedition.interestRequests.filter((request) => request.status === "pending").length.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </section>
        </div>

        {canManageExpeditions ? (
          <ExpeditionDetailForm expedition={expedition} campaigns={campaigns} destinations={destinations} returnTo={contentReturnTo} />
        ) : (
          <div className="rounded-lg border border-ocean-900/10 bg-white p-5 text-sm font-semibold text-ocean-900/62">
            Your partner role can view this expedition but cannot edit its public content.
          </div>
        )}

        {canManageExpeditions ? (
          <DepartureForms expedition={expedition} returnTo={departuresReturnTo} />
        ) : (
          <div className="rounded-lg border border-ocean-900/10 bg-white p-5 text-sm font-semibold text-ocean-900/62">
            Your partner role can view departure data but cannot update it.
          </div>
        )}

        <RequestList expedition={expedition} returnTo={requestsReturnTo} />
      </FormTabs>
    </div>
  );
}
