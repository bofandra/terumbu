import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Edit3, Plus, Save } from "lucide-react";

import { Field, StatusBadge, inputClassName, labelize, textareaClassName, type PartnerPortalData } from "@/components/partner-portal-ui";
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

function CreateExpeditionForm({ campaigns }: { campaigns: Campaign[] }) {
  const hasCampaigns = campaigns.length > 0;

  return (
    <details id="add-expedition" className="rounded-lg border border-ocean-900/10 bg-white shadow-soft">
      <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-bold text-ocean-900">
        <Plus className="size-4" aria-hidden="true" />
        Add expedition
      </summary>
      <form action={createPartnerExpeditionAction} className="grid gap-4 border-t border-ocean-900/10 bg-sand-50 p-5">
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
            <select name="relatedCampaignId" className={inputClassName} required disabled={!hasCampaigns}>
              <option value="">Choose campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title} / {campaign.status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Image URL">
            <input name="imageUrl" type="url" placeholder="https://..." className={inputClassName} />
          </Field>
        </div>
        <Field label="Summary">
          <textarea name="summary" placeholder="Short public trip summary." className={textareaClassName} required />
        </Field>
        <Button type="submit" className="w-fit" disabled={!hasCampaigns}>
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
  const reviewCategoryRows = withRows(detail.reviewCategories, 5, { label: "", value: "" });
  const reviewRows = withRows(detail.reviews, 3, { name: "", joinedAs: "", rating: 5, date: "", body: "" });
  const updateRows = withRows(detail.tripUpdates, 2, { title: "", date: "", body: "" });
  const cancellationRows = withRows(detail.cancellationPolicy, 4, { label: "", refund: "" });
  const faqRows = withRows(detail.faqs, 5, { question: "", answer: "" });

  return (
    <div className="grid gap-4">
      <details open className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Public summary</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Category label">
              <input name="categoryLabel" defaultValue={detail.categoryLabel} className={inputClassName} />
            </Field>
            <Field label="Difficulty">
              <input name="difficulty" defaultValue={detail.difficulty} className={inputClassName} />
            </Field>
            <Field label="Minimum age">
              <input name="minimumAge" type="number" min={0} defaultValue={detail.minimumAge} className={inputClassName} />
            </Field>
          </div>
          <Field label="Activity summary">
            <input name="activitySummary" defaultValue={detail.activitySummary} className={inputClassName} />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Rating">
              <input name="rating" type="number" min={0} max={5} step="0.1" defaultValue={detail.rating} className={inputClassName} />
            </Field>
            <Field label="Review count">
              <input name="reviewCount" type="number" min={0} defaultValue={detail.reviewCount} className={inputClassName} />
            </Field>
            <Field label="Participant count">
              <input name="participantCount" type="number" min={0} defaultValue={detail.participantCount} className={inputClassName} />
            </Field>
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
            {withRows(detail.quickFacts, 6, { label: "", value: "" }).map((fact, index) => (
              <div key={`quick-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-2">
                <input name="quickFactLabel" defaultValue={fact.label} placeholder="Quick fact label" className={inputClassName} />
                <input name="quickFactValue" defaultValue={fact.value} placeholder="Quick fact value" className={inputClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Hosted by title">
              <input name="hostedByTitle" defaultValue={detail.hostedBy.title} className={inputClassName} />
            </Field>
            <Field label="Hosted by verification">
              <input name="hostedByVerificationLabel" defaultValue={detail.hostedBy.verificationLabel} className={inputClassName} />
            </Field>
            <Field label="Partner profile link">
              <input name="hostedByProfileHref" defaultValue={detail.hostedBy.profileHref} className={inputClassName} />
            </Field>
            <Field label="Partner profile label">
              <input name="hostedByProfileLabel" defaultValue={detail.hostedBy.profileLabel} className={inputClassName} />
            </Field>
          </div>
          <Field label="Booking trust indicators">
            <textarea name="bookingTrustIndicators" defaultValue={listValue(detail.bookingTrustIndicators)} className={textareaClassName} />
          </Field>
        </div>
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Gallery and overview</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <div className="grid gap-3">
            {galleryRows.map((image, index) => (
              <div key={`gallery-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-2">
                <input name="galleryLabel" defaultValue={image.label} placeholder="Image label" className={inputClassName} />
                <input name="gallerySrc" type="url" defaultValue={image.src} placeholder="Image URL" className={inputClassName} />
                <input name="galleryCaption" defaultValue={image.caption} placeholder="Caption" className={inputClassName} />
                <input name="galleryProvenance" defaultValue={image.provenance} placeholder="Provenance" className={inputClassName} />
              </div>
            ))}
          </div>
          <Field label="Overview title">
            <input name="overviewTitle" defaultValue={detail.overview.title} className={inputClassName} />
          </Field>
          <Field label="Overview paragraphs">
            <textarea name="overviewParagraphs" defaultValue={paragraphValue(detail.overview.paragraphs)} className={`${textareaClassName} min-h-40`} />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            {pillarRows.map((pillar, index) => (
              <div key={`pillar-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3">
                <input name="pillarTitle" defaultValue={pillar.title} placeholder="Pillar title" className={inputClassName} />
                <textarea name="pillarBody" defaultValue={pillar.body} placeholder="Pillar body" className={textareaClassName} />
              </div>
            ))}
          </div>
          <Field label="Passport note">
            <input name="passportNote" defaultValue={detail.overview.passportNote} className={inputClassName} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            {highlightRows.map((highlight, index) => (
              <div key={`highlight-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[1fr_180px]">
                <input name="highlightTitle" defaultValue={highlight.title} placeholder="Highlight" className={inputClassName} />
                <input name="highlightStatus" defaultValue={highlight.status} placeholder="Status" className={inputClassName} />
              </div>
            ))}
          </div>
        </div>
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Impact and pricing</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Impact title">
              <input name="impactTitle" defaultValue={detail.impact.title} className={inputClassName} />
            </Field>
            <Field label="Methodology date">
              <input name="methodologyUpdatedAt" defaultValue={detail.impact.methodologyUpdatedAt} className={inputClassName} />
            </Field>
          </div>
          <Field label="Impact summary">
            <input name="impactSummary" defaultValue={detail.impact.summary} className={inputClassName} />
          </Field>
          <Field label="Methodology note">
            <textarea name="methodologyNote" defaultValue={detail.impact.methodologyNote} className={textareaClassName} />
          </Field>
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Contribution percent">
              <input name="contributionPercent" type="number" min={0} max={100} defaultValue={detail.impact.contributionPercent} className={inputClassName} />
            </Field>
            <Field label="Contribution amount">
              <input name="conservationContribution" type="number" min={0} defaultValue={detail.impact.conservationContribution ?? ""} className={inputClassName} />
            </Field>
            <Field label="Equipment rental">
              <input name="equipmentRental" type="number" min={0} defaultValue={detail.priceBreakdown.equipmentRental} className={inputClassName} />
            </Field>
            <Field label="Platform fee percent">
              <input name="platformFeePercent" type="number" min={0} max={100} defaultValue={detail.priceBreakdown.platformFeePercent} className={inputClassName} />
            </Field>
          </div>
          <Field label="Platform fee amount">
            <input name="platformFee" type="number" min={0} defaultValue={detail.priceBreakdown.platformFee ?? ""} className={inputClassName} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            {targetRows.map((target, index) => (
              <div key={`target-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[140px_1fr]">
                <input name="impactTargetValue" defaultValue={target.value} placeholder="Value" className={inputClassName} />
                <input name="impactTargetLabel" defaultValue={target.label} placeholder="Impact target" className={inputClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {allocationRows.map((allocation, index) => (
              <div key={`allocation-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[1fr_120px]">
                <input name="allocationLabel" defaultValue={allocation.label} placeholder="Allocation label" className={inputClassName} />
                <input name="allocationPercent" type="number" min={0} max={100} defaultValue={allocation.percent} placeholder="%" className={inputClassName} />
              </div>
            ))}
          </div>
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
          <div className="grid gap-3">
            {itineraryRows.map((day, index) => (
              <div key={`itinerary-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <input name="itineraryDay" defaultValue={day.day} placeholder="Day" className={inputClassName} />
                  <input name="itineraryDayTitle" defaultValue={day.title} placeholder="Title" className={inputClassName} />
                  <input name="itineraryMeals" defaultValue={day.meals} placeholder="Meals" className={inputClassName} />
                  <input name="itineraryPhysicalLevel" defaultValue={day.physicalLevel} placeholder="Physical level" className={inputClassName} />
                </div>
                <textarea name="itineraryActivities" defaultValue={listValue(day.activities)} placeholder="Activities" className={textareaClassName} />
              </div>
            ))}
          </div>
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
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Route, stay, team, and preparation</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Route title">
              <input name="routeTitle" defaultValue={detail.route.title} className={inputClassName} />
            </Field>
            <Field label="Map title">
              <input name="mapTitle" defaultValue={detail.route.mapTitle} className={inputClassName} />
            </Field>
          </div>
          <Field label="Map embed URL">
            <input name="mapEmbedUrl" defaultValue={detail.route.mapEmbedUrl} className={inputClassName} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Route privacy note">
              <textarea name="routePrivacyNote" defaultValue={detail.route.privacyNote} className={textareaClassName} />
            </Field>
            <Field label="Route sidebar note">
              <textarea name="routeSidebarNote" defaultValue={detail.route.sidebarNote} className={textareaClassName} />
            </Field>
            <Field label="Route sidebar title">
              <input name="routeSidebarTitle" defaultValue={detail.route.sidebarTitle} className={inputClassName} />
            </Field>
          </div>
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
              <input name="accommodationType" defaultValue={detail.accommodation.type} className={inputClassName} />
            </Field>
          </div>
          <Field label="Accommodation details">
            <textarea name="accommodationDetails" defaultValue={listValue(detail.accommodation.details)} className={textareaClassName} />
          </Field>
          <Field label="Meal note">
            <textarea name="mealNote" defaultValue={detail.accommodation.mealNote} className={textareaClassName} />
          </Field>
          <div className="grid gap-3">
            {teamRows.map((member, index) => (
              <div key={`team-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-[1fr_1fr_2fr]">
                <input name="teamName" defaultValue={member.name} placeholder="Name" className={inputClassName} />
                <input name="teamRole" defaultValue={member.role} placeholder="Role" className={inputClassName} />
                <input name="teamDetail" defaultValue={member.detail} placeholder="Detail" className={inputClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Preparation title">
              <input name="preparationCourseTitle" defaultValue={detail.preparationCourse.title} className={inputClassName} />
            </Field>
            <Field label="Preparation CTA label">
              <input name="preparationCourseCtaLabel" defaultValue={detail.preparationCourse.ctaLabel} className={inputClassName} />
            </Field>
            <Field label="Preparation image URL">
              <input name="preparationCourseImageUrl" defaultValue={detail.preparationCourse.imageUrl ?? ""} className={inputClassName} />
            </Field>
            <Field label="Preparation link">
              <input name="preparationCourseHref" defaultValue={detail.preparationCourse.href} className={inputClassName} />
            </Field>
          </div>
          <Field label="Preparation summary">
            <textarea name="preparationCourseSummary" defaultValue={detail.preparationCourse.summary} className={textareaClassName} />
          </Field>
        </div>
      </details>

      <details className="rounded-lg border border-ocean-900/10 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Reviews, updates, policy, and FAQ</summary>
        <div className="grid gap-4 border-t border-ocean-900/10 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            {reviewCategoryRows.map((category, index) => (
              <div key={`review-category-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-2">
                <input name="reviewCategoryLabel" defaultValue={category.label} placeholder="Category" className={inputClassName} />
                <input name="reviewCategoryValue" defaultValue={category.value} placeholder="Rating label" className={inputClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3">
            {reviewRows.map((review, index) => (
              <div key={`review-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_100px_140px]">
                  <input name="reviewName" defaultValue={review.name} placeholder="Name" className={inputClassName} />
                  <input name="reviewJoinedAs" defaultValue={review.joinedAs} placeholder="Participant type" className={inputClassName} />
                  <input name="reviewRating" type="number" min={0} max={5} defaultValue={review.rating} placeholder="Rating" className={inputClassName} />
                  <input name="reviewDate" defaultValue={review.date} placeholder="Date" className={inputClassName} />
                </div>
                <textarea name="reviewBody" defaultValue={review.body} placeholder="Review" className={textareaClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3">
            {updateRows.map((update, index) => (
              <div key={`update-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_180px]">
                  <input name="tripUpdateTitle" defaultValue={update.title} placeholder="Update title" className={inputClassName} />
                  <input name="tripUpdateDate" defaultValue={update.date} placeholder="Date" className={inputClassName} />
                </div>
                <textarea name="tripUpdateBody" defaultValue={update.body} placeholder="Update body" className={textareaClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {cancellationRows.map((policy, index) => (
              <div key={`cancel-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3 sm:grid-cols-[1fr_160px]">
                <input name="cancellationLabel" defaultValue={policy.label} placeholder="Policy window" className={inputClassName} />
                <input name="cancellationRefund" defaultValue={policy.refund} placeholder="Refund" className={inputClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3">
            {faqRows.map((faq, index) => (
              <div key={`faq-${index}`} className="grid gap-2 rounded-lg bg-sand-50 p-3">
                <input name="faqQuestion" defaultValue={faq.question} placeholder="Question" className={inputClassName} />
                <textarea name="faqAnswer" defaultValue={faq.answer} placeholder="Answer" className={textareaClassName} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Weather advisory title">
              <input name="weatherAdvisoryTitle" defaultValue={detail.weatherAdvisory.title} className={inputClassName} />
            </Field>
            <Field label="Final CTA eyebrow">
              <input name="finalCtaEyebrow" defaultValue={detail.finalCta.eyebrow} className={inputClassName} />
            </Field>
          </div>
          <Field label="Weather advisory body">
            <textarea name="weatherAdvisoryBody" defaultValue={detail.weatherAdvisory.body} className={textareaClassName} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Final CTA title">
              <input name="finalCtaTitle" defaultValue={detail.finalCta.title} className={inputClassName} />
            </Field>
            <Field label="Final CTA primary label">
              <input name="finalCtaPrimaryLabel" defaultValue={detail.finalCta.primaryLabel} className={inputClassName} />
            </Field>
            <Field label="Final CTA secondary label">
              <input name="finalCtaSecondaryLabel" defaultValue={detail.finalCta.secondaryLabel} className={inputClassName} />
            </Field>
          </div>
          <Field label="Final CTA body">
            <textarea name="finalCtaBody" defaultValue={detail.finalCta.body} className={textareaClassName} />
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
            {campaigns.map((campaign) => (
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

export function PartnerExpeditionWorkspace({ campaigns, expeditions }: { campaigns: Campaign[]; expeditions: Expedition[] }) {
  return (
    <section className="grid gap-4">
      <CreateExpeditionForm campaigns={campaigns} />

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
