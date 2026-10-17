import type { ExpeditionSearchFilters } from "@/lib/expedition-marketplace";

export function ExpeditionTravelSearchFields({ filters = {}, locale = "en" }: { filters?: ExpeditionSearchFilters; locale?: string }) {
  const id = locale === "id";
  const input = "min-h-11 w-full rounded-lg border border-ocean-900/15 bg-white p-2 text-sm font-semibold text-ocean-900";
  return <div className="grid gap-3 sm:grid-cols-3">
    <label className="grid gap-1 text-sm font-bold">{id ? "Mulai pada/setelah" : "Starts on/after"}<input className={input} type="date" name="dateFrom" defaultValue={filters.dateFrom} /></label>
    <label className="grid gap-1 text-sm font-bold">{id ? "Selesai pada/sebelum" : "Ends on/before"}<input className={input} type="date" name="dateTo" min={filters.dateFrom} defaultValue={filters.dateTo} /></label>
    <label className="grid gap-1 text-sm font-bold">{id ? "Jumlah peserta" : "Travelers"}<input className={input} type="number" min="1" max="12" name="participants" defaultValue={filters.participants} placeholder={id ? "1–12 peserta" : "1–12 travelers"} /></label>
  </div>;
}
