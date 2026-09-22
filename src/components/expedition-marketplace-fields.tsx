import type { ExpeditionMarketplaceMetadata } from "@/lib/expedition-marketplace";
import { cn } from "@/lib/utils";

type ExpeditionMarketplaceFieldsProps = {
  marketplace: ExpeditionMarketplaceMetadata;
  inputClassName?: string;
  textareaClassName?: string;
  panelClassName?: string;
  defaultOpen?: boolean;
  summaryLabel?: string;
};

const typeLabelOptions = ["Eco Program", "Coral Restoration", "Reef Monitoring", "Marine Conservation", "Community Conservation"];
const travelLengthOptions = ["Short Term Stay", "Medium Term Stay", "Long Term Stay"];
const programTypeOptions = ["Eco Program", "Coral Restoration", "Reef Monitoring", "Marine Conservation", "Community Conservation"];
const highlightOptions = ["Higher chance of approval", "Small group", "Impact-linked trip", "Verified partner", "Beginner friendly", "Seasonal departure"];
const helpActivityOptions = ["Coral Restoration", "Reef Monitoring", "Community Work", "Ocean Cleanup", "Mangrove Planting", "Documentation"];
const accommodationOptions = ["Shared Dorm", "Shared twin room included", "Homestay", "Eco-lodge", "Liveaboard", "Hotel partner stay"];
const mealsOptions = ["No meals included", "Breakfast included", "2 meals", "3 meals", "Meals listed in itinerary"];
const badgeOptions = ["Sustainable project", "Higher approval", "Verified trip", "Top host", "Small group", "Impact Passport"];
const benefitOptions = ["Impact Passport record", "Digital participation certificate", "Free Events", "Use our equipped kitchen", "Dedicated Workspace", "Local guide support"];
const feePeriodOptions = ["per day", "per week", "per person", "per trip"];
const feePaysForOptions = ["Local guides", "Meals", "Accommodation", "Boat transport", "Field equipment", "Community contribution"];

function uniqueOptions(options: string[], current: string[] = []) {
  return Array.from(new Set([...current.filter(Boolean), ...options]));
}

function selectedValues(values: string[]) {
  return new Set(values.map((value) => value.trim()).filter(Boolean));
}

function customValues(values: string[], options: string[]) {
  const optionsSet = selectedValues(options);

  return values.filter((value) => value && !optionsSet.has(value));
}

function SelectField({
  label,
  name,
  value,
  options,
  className
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  className: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
      {label}
      <select name={name} defaultValue={value} className={className}>
        {uniqueOptions(options, [value]).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGroup({
  label,
  name,
  values,
  options
}: {
  label: string;
  name: string;
  values: string[];
  options: string[];
}) {
  const selected = selectedValues(values);
  const custom = customValues(values, options);

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold text-ocean-900">{label}</legend>
      <input type="hidden" name={name} value="" />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/12 bg-white px-3 text-xs font-bold text-ocean-900/70">
            <input type="checkbox" name={name} value={option} defaultChecked={selected.has(option)} className="size-3.5 accent-kelp-500" />
            {option}
          </label>
        ))}
      </div>
      {custom.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {custom.length > 0 ? <p className="text-xs font-semibold leading-5 text-ocean-900/54">Existing custom values are preserved: {custom.join(", ")}</p> : null}
    </fieldset>
  );
}

export function ExpeditionMarketplaceFields({
  marketplace,
  inputClassName = "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-kelp-500",
  textareaClassName = "min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold leading-6 text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-kelp-500",
  panelClassName = "rounded-lg border border-ocean-900/10 bg-white",
  defaultOpen = false,
  summaryLabel = "Discovery fields"
}: ExpeditionMarketplaceFieldsProps) {
  return (
    <details open={defaultOpen} className={panelClassName}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">{summaryLabel}</summary>
      <div className="grid gap-4 border-t border-ocean-900/10 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Type label" name="marketplaceTypeLabel" value={marketplace.typeLabel} options={typeLabelOptions} className={inputClassName} />
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Hours per week
            <input name="marketplaceHoursPerWeek" type="number" min={0} max={60} defaultValue={marketplace.collaborationHoursPerWeek} className={inputClassName} />
          </label>
          <SelectField label="Travel length" name="marketplaceTravelLength" value={marketplace.travelLengthLabel} options={travelLengthOptions} className={inputClassName} />
        </div>

        <div className="grid gap-4 rounded-lg bg-ocean-50 p-3">
          <CheckboxGroup label="Program types" name="marketplaceProgramTypes" values={marketplace.programTypes} options={programTypeOptions} />
          <CheckboxGroup label="How participants help" name="marketplaceHelpActivities" values={marketplace.helpActivities} options={helpActivityOptions} />
          <CheckboxGroup label="Highlights" name="marketplaceHighlights" values={marketplace.highlights} options={highlightOptions} />
          <CheckboxGroup label="Badges" name="marketplaceBadges" values={marketplace.badges} options={badgeOptions} />
        </div>

        <div className="grid gap-4 rounded-lg bg-ocean-50 p-3">
          <CheckboxGroup label="Accommodations" name="marketplaceAccommodations" values={marketplace.accommodations} options={accommodationOptions} />
          <SelectField label="Meals included" name="marketplaceMealsIncluded" value={marketplace.mealsIncluded} options={mealsOptions} className={inputClassName} />
          <CheckboxGroup label="Additional benefits" name="marketplaceBenefits" values={marketplace.benefits} options={benefitOptions} />
        </div>

        <details open={Boolean(marketplace.additionalFee)} className={cn("rounded-lg bg-sand-50")}>
          <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-ocean-900">Additional local fee</summary>
          <div className="grid gap-3 border-t border-ocean-900/10 p-3 md:grid-cols-3">
            <input type="hidden" name="marketplaceAdditionalFeeCurrency" value={marketplace.additionalFee?.currency ?? "USD"} />
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              Amount
              <input name="marketplaceAdditionalFeeAmount" type="number" min={0} step="0.01" defaultValue={marketplace.additionalFee?.amount ?? ""} className={inputClassName} />
            </label>
            <SelectField label="Period" name="marketplaceAdditionalFeePeriod" value={marketplace.additionalFee?.period ?? "per day"} options={feePeriodOptions} className={inputClassName} />
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900 md:col-span-3">
              Description
              <textarea name="marketplaceAdditionalFeeDescription" defaultValue={marketplace.additionalFee?.description ?? ""} className={textareaClassName} />
            </label>
            <div className="md:col-span-3">
              <CheckboxGroup label="Fee pays for" name="marketplaceAdditionalFeePaysFor" values={marketplace.additionalFee?.paysFor ?? []} options={feePaysForOptions} />
            </div>
          </div>
        </details>
      </div>
    </details>
  );
}
