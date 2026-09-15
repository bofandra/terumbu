import type { ExpeditionMarketplaceMetadata } from "@/lib/expedition-marketplace";
import { cn } from "@/lib/utils";

type ExpeditionMarketplaceFieldsProps = {
  marketplace: ExpeditionMarketplaceMetadata;
  inputClassName?: string;
  textareaClassName?: string;
  panelClassName?: string;
};

function listValue(items: string[]) {
  return items.join("\n");
}

export function ExpeditionMarketplaceFields({
  marketplace,
  inputClassName = "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-kelp-500",
  textareaClassName = "min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold leading-6 text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-kelp-500",
  panelClassName = "rounded-lg border border-ocean-900/10 bg-white"
}: ExpeditionMarketplaceFieldsProps) {
  return (
    <details open className={panelClassName}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">Marketplace search fields</summary>
      <div className="grid gap-4 border-t border-ocean-900/10 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Type label
            <input name="marketplaceTypeLabel" defaultValue={marketplace.typeLabel} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Hours per week
            <input name="marketplaceHoursPerWeek" type="number" min={0} max={60} defaultValue={marketplace.collaborationHoursPerWeek} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Travel length
            <select name="marketplaceTravelLength" defaultValue={marketplace.travelLengthLabel} className={inputClassName}>
              {["Short Term Stay", "Medium Term Stay", "Long Term Stay"].includes(marketplace.travelLengthLabel) ? null : (
                <option value={marketplace.travelLengthLabel}>{marketplace.travelLengthLabel}</option>
              )}
              <option value="Short Term Stay">Short Term Stay</option>
              <option value="Medium Term Stay">Medium Term Stay</option>
              <option value="Long Term Stay">Long Term Stay</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Program types
            <textarea name="marketplaceProgramTypes" defaultValue={listValue(marketplace.programTypes)} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Highlights
            <textarea name="marketplaceHighlights" defaultValue={listValue(marketplace.highlights)} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Purpose of the trip
            <textarea name="marketplacePurposes" defaultValue={listValue(marketplace.purposes)} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            How you help
            <textarea name="marketplaceHelpActivities" defaultValue={listValue(marketplace.helpActivities)} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Style
            <textarea name="marketplaceStyles" defaultValue={listValue(marketplace.styles)} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Badges
            <textarea name="marketplaceBadges" defaultValue={listValue(marketplace.badges)} className={textareaClassName} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Accommodations
            <textarea name="marketplaceAccommodations" defaultValue={listValue(marketplace.accommodations)} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Meals included
            <input name="marketplaceMealsIncluded" defaultValue={marketplace.mealsIncluded} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Digital nomad amenities
            <textarea name="marketplaceDigitalNomad" defaultValue={listValue(marketplace.digitalNomadAmenities)} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Additional benefits
            <textarea name="marketplaceBenefits" defaultValue={listValue(marketplace.benefits)} className={textareaClassName} />
          </label>
        </div>

        <div className={cn("grid gap-3 rounded-lg bg-sand-50 p-3 md:grid-cols-4")}>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Additional fee
            <input name="marketplaceAdditionalFeeAmount" type="number" min={0} step="0.01" defaultValue={marketplace.additionalFee?.amount ?? ""} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Fee currency
            <input name="marketplaceAdditionalFeeCurrency" defaultValue={marketplace.additionalFee?.currency ?? "USD"} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Fee period
            <input name="marketplaceAdditionalFeePeriod" defaultValue={marketplace.additionalFee?.period ?? "per day"} className={inputClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900 md:col-span-4">
            Fee description
            <textarea name="marketplaceAdditionalFeeDescription" defaultValue={marketplace.additionalFee?.description ?? ""} className={textareaClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900 md:col-span-4">
            Fee pays for
            <textarea name="marketplaceAdditionalFeePaysFor" defaultValue={listValue(marketplace.additionalFee?.paysFor ?? [])} className={textareaClassName} />
          </label>
        </div>
      </div>
    </details>
  );
}
