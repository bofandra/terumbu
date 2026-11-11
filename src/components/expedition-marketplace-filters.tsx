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
import { localizedSeoPath, publicLocaleHref } from "@/lib/public-locale-routing";
import { getDisplayFxSnapshot } from "@/lib/currency-display";

type ExpeditionMarketplaceFiltersProps = {
  filters: ExpeditionSearchFilters;
  facets: ExpeditionMarketplaceFacets;
  compact?: boolean;
  locale?: "en" | "id";
};

const sortOptions = [
  { value: "", label: "Recommended" },
  { value: "soonest", label: "Soonest departure" },
  { value: "price_asc", label: "Lowest price" },
  { value: "hours_asc", label: "Fewest hours" },
  { value: "duration_asc", label: "Shortest duration" }
];

function removeFilterHref(filters: ExpeditionSearchFilters, key: keyof ExpeditionSearchFilters, locale: "en" | "id") {
  const query = expeditionSearchParams(filters, { [key]: null });

  return publicLocaleHref(query ? `/expeditions?${query}` : "/expeditions", locale);
}

function activeEntries(filters: ExpeditionSearchFilters, locale: "en" | "id") {
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
    benefits: "Benefit",
    dateFrom: "Starts on/after", dateTo: "Ends on/before", participants: "Travelers", maxPrice: "Budget per person"
  };

  const idLabels: Partial<Record<keyof ExpeditionSearchFilters, string>> = {
    q: "Kata kunci", destination: "Destinasi", programType: "Program", highlight: "Sorotan",
    purpose: "Tujuan", availability: "Ketersediaan", help: "Aktivitas", style: "Gaya",
    hoursMax: "Jam", travelLength: "Durasi", meals: "Makanan", accommodation: "Akomodasi",
    digitalNomad: "Fasilitas kerja", benefits: "Manfaat", dateFrom: "Mulai pada/setelah",
    dateTo: "Selesai pada/sebelum", participants: "Peserta", maxPrice: "Anggaran per orang"
  };
  const effectiveLabels = locale === "id" ? idLabels : labels;
  return Object.entries(filters)
    .filter(([key, value]) => key !== "sort" && key !== "budgetCurrency" && value !== undefined && value !== null && String(value).trim())
    .map(([key, value]) => ({
      key: key as keyof ExpeditionSearchFilters,
      label: `${effectiveLabels[key as keyof ExpeditionSearchFilters] ?? key}: ${key === "hoursMax" ? (locale === "id" ? `Maks. ${value} jam/minggu` : `Up to ${value}h/week`) : value}`
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

function FilterFields({ filters, facets, locale = "en" }: { filters: ExpeditionSearchFilters; facets: ExpeditionMarketplaceFacets; locale?: "en" | "id" }) {
  const t = (en: string, id: string) => locale === "id" ? id : en;
  return (
    <>
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
          {t("Search", "Cari")}
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder={t("Keywords, activity, host, place", "Kata kunci, aktivitas, mitra, tempat")}
              className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/38 focus:border-kelp-500"
            />
          </span>
        </label>
        <SelectFilter label={t("Destination", "Destinasi")} name="destination" value={filters.destination} options={facets.destinations} placeholder={t("Any destination", "Semua destinasi")} />
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm font-bold">{t("Trip starts on/after", "Mulai pada/setelah")}<input className="min-h-11 rounded-lg border p-2" type="date" name="dateFrom" defaultValue={filters.dateFrom} /></label>
        <label className="grid gap-1 text-sm font-bold">{t("Trip ends on/before", "Selesai pada/sebelum")}<input className="min-h-11 rounded-lg border p-2" type="date" name="dateTo" min={filters.dateFrom} defaultValue={filters.dateTo} /></label>
        <label className="grid gap-1 text-sm font-bold">{t("Travelers", "Jumlah peserta")}<input className="min-h-11 rounded-lg border p-2" type="number" min="1" max="12" name="participants" defaultValue={filters.participants} placeholder={t("Any group size", "Semua ukuran grup")} /></label>
        <label className="grid gap-1 text-sm font-bold">{t("Maximum price per person", "Harga maksimum per orang")}<input className="min-h-11 rounded-lg border p-2" type="number" min="0" step="0.01" name="maxPrice" defaultValue={filters.maxPrice} placeholder={t("Any budget", "Semua anggaran")} /></label>
        <label className="grid gap-1 text-sm font-bold">{t("Budget currency", "Mata uang anggaran")}<select className="min-h-11 rounded-lg border p-2" name="budgetCurrency" defaultValue={filters.budgetCurrency ?? "USD"}>{["USD", "IDR", "EUR", "JPY"].map(value => <option key={value}>{value}</option>)}</select></label>
        <p className="text-xs text-ocean-900/60">{t("Trips must fit entirely within your dates. Currency conversions are approximate; the original listed currency remains authoritative.", "Perjalanan harus sepenuhnya berada dalam rentang tanggal. Estimasi konversi mata uang bersifat perkiraan; mata uang asli tetap menjadi acuan.")}</p>
        {filters.maxPrice !== undefined && !getDisplayFxSnapshot() ? (
          <p role="status" className="rounded-lg border border-coral-500/25 bg-sand-50 p-3 text-xs font-semibold leading-5 text-ocean-900">
            {t("Live exchange-rate estimates are unavailable. The budget filter only includes trips priced in the selected currency. Remove it to see all trips.", "Estimasi kurs belum tersedia. Filter anggaran hanya mencakup perjalanan dengan mata uang yang dipilih. Hapus filter untuk melihat semua perjalanan.")}
          </p>
        ) : null}
        <SelectFilter label={t("Program types", "Jenis program")} name="programType" value={filters.programType} options={facets.programTypes} placeholder={t("Any program", "Semua program")} />
        <SelectFilter label={t("Highlights", "Sorotan")} name="highlight" value={filters.highlight} options={facets.highlights} placeholder={t("Any highlight", "Semua sorotan")} />
        <SelectFilter label={t("Purpose of the trip", "Tujuan perjalanan")} name="purpose" value={filters.purpose} options={facets.purposes} placeholder={t("Any purpose", "Semua tujuan")} />
        <SelectFilter label={t("Availability", "Ketersediaan")} name="availability" value={filters.availability} options={facets.availability} placeholder={t("Any availability", "Semua ketersediaan")} />
        <SelectFilter label={t("How you help", "Aktivitas kontribusi")} name="help" value={filters.help} options={facets.helpActivities} placeholder={t("Any help activity", "Semua aktivitas")} />
        <SelectFilter label={t("Style", "Gaya")} name="style" value={filters.style} options={facets.styles} placeholder={t("Any style", "Semua gaya")} />
        <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
          {t("Hours of collaboration per week", "Jam kolaborasi per minggu")}
          <span className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
            <input
              name="hoursMax"
              type="number"
              min={1}
              max={60}
              defaultValue={filters.hoursMax ?? ""}
              placeholder={t("Up to 32", "Maks. 32")}
              className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/38 focus:border-kelp-500"
            />
          </span>
        </label>
        <SelectFilter label={t("Travel length", "Durasi perjalanan")} name="travelLength" value={filters.travelLength} options={facets.travelLengths} placeholder={t("Any length", "Semua durasi")} />
        <SelectFilter label={t("Meals", "Makanan")} name="meals" value={filters.meals} options={facets.meals} placeholder={t("Any meals", "Semua makanan")} />
        <SelectFilter label={t("Accommodations", "Akomodasi")} name="accommodation" value={filters.accommodation} options={facets.accommodations} placeholder={t("Any stay", "Semua akomodasi")} />
        <SelectFilter label={t("Remote-work facilities", "Fasilitas kerja jarak jauh")} name="digitalNomad" value={filters.digitalNomad} options={facets.digitalNomadAmenities} placeholder={t("Any workspace", "Semua fasilitas")} />
        <SelectFilter label={t("Additional benefits", "Manfaat tambahan")} name="benefits" value={filters.benefits} options={facets.benefits} placeholder={t("Any benefit", "Semua manfaat")} />
      </div>
    </>
  );
}

export function ExpeditionMarketplaceFilters({ filters, facets, compact = false, locale = "en" }: ExpeditionMarketplaceFiltersProps) {
  const activeCount = activeExpeditionFilterCount(filters);

  return (
    <form
      action={localizedSeoPath("/expeditions", locale)}
      className={cn("rounded-xl border border-ocean-900/10 bg-white p-4 shadow-sm", compact ? "" : "lg:sticky lg:top-28")}
    >
      <input type="hidden" name="sort" value={filters.sort ?? ""} />
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-ocean-900/10 pb-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-ocean-900">
            <Filter className="size-4 text-kelp-500" aria-hidden="true" />
            {locale === "id" ? "Filter pencarian" : "Search filters"}
          </p>
          <p className="mt-1 text-xs font-semibold text-ocean-900/48">{activeCount > 0 ? (locale === "id" ? `${activeCount} filter aktif` : `${activeCount} {locale === "id" ? "aktif" : "active"} filters`) : (locale === "id" ? "Temukan perjalanan yang sesuai" : "Find the right field opportunity")}</p>
        </div>
        {activeCount > 0 ? (
          <Link href={localizedSeoPath("/expeditions", locale)} className="text-xs font-bold text-coral-700 hover:text-coral-500">
            {locale === "id" ? "Hapus" : "Clear"}
          </Link>
        ) : null}
      </div>
      <FilterFields filters={filters} facets={facets} locale={locale} />
      <button type="submit" className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-kelp-500 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-kelp-700">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        {locale === "id" ? "Cari perjalanan" : "Search opportunities"}
      </button>
    </form>
  );
}

export function ExpeditionMarketplaceMobileFilters({ filters, facets, locale = "en" }: ExpeditionMarketplaceFiltersProps) {
  const activeCount = activeExpeditionFilterCount(filters);

  return (
    <details className="rounded-xl border border-ocean-900/10 bg-white shadow-sm lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-ocean-900">
        <span className="inline-flex items-center gap-2">
          <Filter className="size-4 text-kelp-500" aria-hidden="true" />
          {locale === "id" ? "Filter" : "Filters"}
        </span>
        <span className="rounded-full bg-kelp-100 px-2.5 py-1 text-xs text-kelp-700">{activeCount} active</span>
      </summary>
      <div className="border-t border-ocean-900/10 p-3">
        <ExpeditionMarketplaceFilters filters={filters} facets={facets} locale={locale} compact />
      </div>
    </details>
  );
}

export function ExpeditionActiveFilterChips({ filters, locale = "en" }: { filters: ExpeditionSearchFilters; locale?: "en" | "id" }) {
  const entries = activeEntries(filters, locale);

  if (entries.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/58">
        <Leaf className="size-4 text-kelp-500" aria-hidden="true" />
        {locale === "id" ? "Menampilkan semua perjalanan konservasi" : "Showing every conservation opportunity"}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => (
        <Link
          key={entry.key}
          href={removeFilterHref(filters, entry.key, locale)}
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

export function ExpeditionSortControl({ filters, locale = "en" }: { filters: ExpeditionSearchFilters; locale?: "en" | "id" }) {
  return (
    <form action={localizedSeoPath("/expeditions", locale)} className="flex items-center gap-2">
      {Object.entries(filters).map(([key, value]) =>
        key !== "sort" && value !== undefined && value !== null && String(value).trim() ? (
          <input key={key} type="hidden" name={key} value={String(value)} />
        ) : null
      )}
      <label className="sr-only" htmlFor="expedition-sort">
        {locale === "id" ? "Urutkan ekspedisi" : "Sort expeditions"}
      </label>
      <select
        id="expedition-sort"
        name="sort"
        defaultValue={filters.sort ?? ""}
        className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-bold text-ocean-900 outline-none focus:border-kelp-500"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {locale === "id" ? ({ "": "Rekomendasi", soonest: "Keberangkatan terdekat", price_asc: "Harga terendah", hours_asc: "Jam tersedikit", duration_asc: "Durasi tersingkat" } as Record<string, string>)[option.value] : option.label}
          </option>
        ))}
      </select>
      <button type="submit" className="flex min-h-10 items-center justify-center rounded-lg bg-ocean-900 px-3 text-sm font-bold text-white">
        {locale === "id" ? "Urutkan" : "Sort"}
      </button>
    </form>
  );
}
