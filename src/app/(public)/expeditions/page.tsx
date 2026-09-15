import { Compass, Leaf, Search, ShieldCheck, Users } from "lucide-react";

import { ExpeditionCard } from "@/components/expedition-card";
import {
  ExpeditionActiveFilterChips,
  ExpeditionMarketplaceFilters,
  ExpeditionMarketplaceMobileFilters,
  ExpeditionSortControl
} from "@/components/expedition-marketplace-filters";
import { parseExpeditionSearchFilters } from "@/lib/expedition-marketplace";
import { getExpeditionMarketplaceResults } from "@/lib/queries";

export const metadata = {
  title: "Expeditions"
};

export const dynamic = "force-dynamic";

type ExpeditionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpeditionsPage({ searchParams }: ExpeditionsPageProps) {
  const params = await searchParams;
  const filters = parseExpeditionSearchFilters(params ?? {});
  const { expeditions, total, facets } = await getExpeditionMarketplaceResults(filters);

  return (
    <main className="bg-mist-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-kelp-100 px-3 py-1 text-sm font-bold text-kelp-700">
              <Leaf className="size-4" aria-hidden="true" />
              Eco programs, conservation stays, and field bookings
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">
              Find conservation opportunities across Indonesia
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ocean-900/66 sm:text-lg">
              Search verified hosts, compare what you offer and what you get, then reserve a real Terumbu field departure when dates fit.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Verified partners", icon: ShieldCheck },
                { label: "Impact-linked trips", icon: Compass },
                { label: "Small groups", icon: Users }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <span key={item.label} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 shadow-sm">
                    <Icon className="size-4 text-kelp-500" aria-hidden="true" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>
          <form action="/expeditions" className="rounded-xl border border-ocean-900/10 bg-mist-50 p-4 shadow-sm">
            <p className="text-sm font-bold text-ocean-900">Start searching</p>
            <div className="mt-3 grid gap-3">
              <label className="relative">
                <span className="sr-only">Keyword</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
                <input
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Search by activity, destination, or host"
                  className="min-h-12 w-full rounded-lg border border-ocean-900/12 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900 outline-none focus:border-kelp-500"
                />
              </label>
              <label>
                <span className="sr-only">Destination</span>
                <input
                  name="destination"
                  defaultValue={filters.destination ?? ""}
                  placeholder="Destination"
                  className="min-h-12 w-full rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none focus:border-kelp-500"
                />
              </label>
              <button type="submit" className="flex min-h-12 items-center justify-center rounded-lg bg-kelp-500 px-4 text-sm font-bold text-white shadow-sm hover:bg-kelp-700">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[310px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <ExpeditionMarketplaceFilters filters={filters} facets={facets} />
        </aside>

        <div className="min-w-0">
          <ExpeditionMarketplaceMobileFilters filters={filters} facets={facets} />
          <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-ocean-900/10 bg-white p-4 shadow-sm lg:mt-0 lg:flex-row lg:items-center">
            <div>
              <p className="text-xl font-bold tracking-normal text-ocean-900">
                {total.toLocaleString("id-ID")} opportunities found
              </p>
              <div className="mt-3">
                <ExpeditionActiveFilterChips filters={filters} />
              </div>
            </div>
            <ExpeditionSortControl filters={filters} />
          </div>

          <div className="mt-5 grid gap-5">
            {expeditions.map((expedition) => (
              <ExpeditionCard key={expedition.slug} expedition={expedition} />
            ))}
          </div>

          {expeditions.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-ocean-900/18 bg-white p-8 text-center shadow-sm">
              <p className="text-xl font-bold tracking-normal text-ocean-900">No opportunities match those filters yet.</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ocean-900/62">
                Try removing a filter, broadening the destination, or searching by a conservation activity like reef monitoring or community work.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
