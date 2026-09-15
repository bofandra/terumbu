import { Clock, Filter, Leaf, MapPin, Search, SlidersHorizontal, Wifi } from "lucide-react";
import Link from "next/link";

import {
  activeExpeditionFilterCount,
  expeditionSearchParams,
  type ExpeditionMarketplaceFacets,
  type ExpeditionMarketplaceOption,
  type ExpeditionSearchFilters
} from "@/lib/expedition-marketplace";
import { cn } from "@/lib/utils";

type ExpeditionMarketplaceFiltersProps = {
  filters: ExpeditionSearchFilters;
  facets: ExpeditionMarketplaceFacets;
  compact?: boolean;
};

const sortOptions = [
  { value: "", label: "Recommended" },
  { value: "soonest", label: "Soonest departure" },
  { value: "price_asc", label: "Lowest price" },
  { value: "hours_asc", label: "Fewest hours" }
];

function removeFilterHref(filters: ExpeditionSearchFilters, key: keyof ExpeditionSearchFilters) {
  const query = expeditionSearchParams(filters, { [key]: null });

  return query ? `/expeditions?${query}` : "/expeditions";
}

function activeEntries(filters: ExpeditionSearchFilters) {
  const labels: Partial<Record<keyof ExpeditionSearchFilters, string>> = {
    q: "Keyword",
    destination: "Destination",
    programType: "Program",
    highlight: "Highlight",
    purpose: "Purpose",
    availability: "Availability",
    help: "Help",
    style: "Style",
    hoursMax: "Hours",
    travelLength: "Length",
    meals: "Meals",
    accommodation: "Stay",
    digitalNomad: "Nomad",
    benefits: "Benefit"
  };

  return Object.entries(filters)
    .filter(([key, value]) => key !== "sort" && value !== undefined && value !== null && String(value).trim())
    .map(([key, value]) => ({
      key: key as keyof ExpeditionSearchFilters,
      label: `${labels[key as keyof ExpeditionSearchFilters] ?? key}: ${key === "hoursMax" ? `Up to ${value}h/week` : value}`
    }));
}

function SelectFilter({
  label,
  name,
  value,
  options,
  placeholder
}: {
  label: string;
  name: keyof ExpeditionSearchFilters;
  value?: string | number;
  options: ExpeditionMarketplaceOption[];
  placeholder: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition focus:border-kelp-500"
      >
        <option value="">{placeholder}</option>
        {options.slice(0, 12).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterFields({ filters, facets }: { filters: ExpeditionSearchFilters; facets: ExpeditionMarketplaceFacets }) {
  return (
    <>
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
          Search
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Keywords, activity, host, place"
              className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/38 focus:border-kelp-500"
            />
          </span>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
          Destination
          <span className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
            <input
              name="destination"
              defaultValue={filters.destination ?? ""}
              placeholder="Raja Ampat, Wakatobi, Bali"
              className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/38 focus:border-kelp-500"
            />
          </span>
        </label>
      </div>

      <div className="mt-5 grid gap-4">
        <SelectFilter label="Program Types" name="programType" value={filters.programType} options={facets.programTypes} placeholder="Any program" />
        <SelectFilter label="Highlights" name="highlight" value={filters.highlight} options={facets.highlights} placeholder="Any highlight" />
        <SelectFilter label="Purpose of the trip" name="purpose" value={filters.purpose} options={facets.purposes} placeholder="Any purpose" />
        <SelectFilter label="Availability" name="availability" value={filters.availability} options={facets.availability} placeholder="Any availability" />
        <SelectFilter label="How you help" name="help" value={filters.help} options={facets.helpActivities} placeholder="Any help activity" />
        <SelectFilter label="Style" name="style" value={filters.style} options={facets.styles} placeholder="Any style" />
        <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
          Hours of collaboration per week
          <span className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
            <input
              name="hoursMax"
              type="number"
              min={1}
              max={60}
              defaultValue={filters.hoursMax ?? ""}
              placeholder="Up to 32"
              className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/38 focus:border-kelp-500"
            />
          </span>
        </label>
        <SelectFilter label="Travel Length" name="travelLength" value={filters.travelLength} options={facets.travelLengths} placeholder="Any length" />
        <SelectFilter label="Meals" name="meals" value={filters.meals} options={facets.meals} placeholder="Any meals" />
        <SelectFilter label="Accommodations" name="accommodation" value={filters.accommodation} options={facets.accommodations} placeholder="Any stay" />
        <SelectFilter label="Perfect for digital nomads" name="digitalNomad" value={filters.digitalNomad} options={facets.digitalNomadAmenities} placeholder="Any workspace" />
        <SelectFilter label="Additional Benefits" name="benefits" value={filters.benefits} options={facets.benefits} placeholder="Any benefit" />
      </div>
    </>
  );
}

export function ExpeditionMarketplaceFilters({ filters, facets, compact = false }: ExpeditionMarketplaceFiltersProps) {
  const activeCount = activeExpeditionFilterCount(filters);

  return (
    <form
      action="/expeditions"
      className={cn("rounded-xl border border-ocean-900/10 bg-white p-4 shadow-sm", compact ? "" : "lg:sticky lg:top-28")}
    >
      <input type="hidden" name="sort" value={filters.sort ?? ""} />
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-ocean-900/10 pb-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-ocean-900">
            <Filter className="size-4 text-kelp-500" aria-hidden="true" />
            Search filters
          </p>
          <p className="mt-1 text-xs font-semibold text-ocean-900/48">{activeCount > 0 ? `${activeCount} active filters` : "Find the right field opportunity"}</p>
        </div>
        {activeCount > 0 ? (
          <Link href="/expeditions" className="text-xs font-bold text-coral-700 hover:text-coral-500">
            Clear
          </Link>
        ) : null}
      </div>
      <FilterFields filters={filters} facets={facets} />
      <button type="submit" className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-kelp-500 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-kelp-700">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Search opportunities
      </button>
    </form>
  );
}

export function ExpeditionMarketplaceMobileFilters({ filters, facets }: ExpeditionMarketplaceFiltersProps) {
  const activeCount = activeExpeditionFilterCount(filters);

  return (
    <details className="rounded-xl border border-ocean-900/10 bg-white shadow-sm lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-ocean-900">
        <span className="inline-flex items-center gap-2">
          <Filter className="size-4 text-kelp-500" aria-hidden="true" />
          Filters
        </span>
        <span className="rounded-full bg-kelp-100 px-2.5 py-1 text-xs text-kelp-700">{activeCount} active</span>
      </summary>
      <div className="border-t border-ocean-900/10 p-3">
        <ExpeditionMarketplaceFilters filters={filters} facets={facets} compact />
      </div>
    </details>
  );
}

export function ExpeditionActiveFilterChips({ filters }: { filters: ExpeditionSearchFilters }) {
  const entries = activeEntries(filters);

  if (entries.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/58">
        <Leaf className="size-4 text-kelp-500" aria-hidden="true" />
        Showing every conservation opportunity
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => (
        <Link
          key={entry.key}
          href={removeFilterHref(filters, entry.key)}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-kelp-500/25 bg-kelp-100 px-3 text-xs font-bold text-kelp-700 hover:bg-white"
        >
          {entry.key === "digitalNomad" ? <Wifi className="size-3.5" aria-hidden="true" /> : null}
          {entry.label}
          <span aria-hidden="true">x</span>
        </Link>
      ))}
    </div>
  );
}

export function ExpeditionSortControl({ filters }: { filters: ExpeditionSearchFilters }) {
  return (
    <form action="/expeditions" className="flex items-center gap-2">
      {Object.entries(filters).map(([key, value]) =>
        key !== "sort" && value !== undefined && value !== null && String(value).trim() ? (
          <input key={key} type="hidden" name={key} value={String(value)} />
        ) : null
      )}
      <label className="sr-only" htmlFor="expedition-sort">
        Sort expeditions
      </label>
      <select
        id="expedition-sort"
        name="sort"
        defaultValue={filters.sort ?? ""}
        className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-bold text-ocean-900 outline-none focus:border-kelp-500"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="submit" className="flex min-h-10 items-center justify-center rounded-lg bg-ocean-900 px-3 text-sm font-bold text-white">
        Sort
      </button>
    </form>
  );
}
