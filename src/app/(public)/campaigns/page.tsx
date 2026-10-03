import { Search } from "lucide-react";
import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { SectionHeading } from "@/components/section-heading";
import { getCampaignCards, getCampaignCategories } from "@/lib/queries";
import { getPreferredLocale } from "@/lib/user-preferences";

export const metadata = {
  title: "Campaigns"
};

export const dynamic = "force-dynamic";

type CampaignsPageProps = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
    region?: string;
    sort?: string;
  }>;
};

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = await searchParams;
  const selectedCategory = params?.category?.trim() || "";
  const query = params?.q?.trim() || "";
  const selectedRegion = params?.region?.trim() || "";
  const sort = params?.sort === "funded" || params?.sort === "ending" ? params.sort : "newest";

  const [locale, allCampaigns, categories] = await Promise.all([
    getPreferredLocale(),
    getCampaignCards(),
    getCampaignCategories()
  ]);

  const labels =
    locale === "id"
      ? {
          eyebrow: "Dukung",
          title: "Kampanye konservasi terverifikasi",
          intro: "Temukan proyek yang kamu pedulikan, pahami dampak kontribusimu, lalu ikuti bukti kegiatannya seiring pekerjaan berjalan.",
          all: "Semua",
          searchAria: "Cari kampanye",
          searchPlaceholder: "Cari proyek atau lokasi",
          regionAria: "Wilayah",
          allRegions: "Semua wilayah",
          sortAria: "Urutkan kampanye",
          newest: "Terbaru",
          mostFunded: "Pendanaan tertinggi",
          endingSoon: "Segera berakhir",
          search: "Cari",
          projectsFound: "proyek ditemukan",
          clearFilters: "Hapus filter",
          noResults: "Belum ada proyek yang cocok dengan filter tersebut.",
          noResultsHelp: "Coba wilayah yang lebih luas, hapus kategori, atau bersihkan pencarian untuk melihat semua kampanye terverifikasi.",
          viewAll: "Lihat semua kampanye"
        }
      : {
          eyebrow: "Support",
          title: "Verified conservation campaigns",
          intro: "Find a project you care about, understand what your contribution enables, and follow evidence as the work progresses.",
          all: "All",
          searchAria: "Search campaigns",
          searchPlaceholder: "Search projects or locations",
          regionAria: "Region",
          allRegions: "All regions",
          sortAria: "Sort campaigns",
          newest: "Newest",
          mostFunded: "Most funded",
          endingSoon: "Ending soon",
          search: "Search",
          projectsFound: "projects found",
          clearFilters: "Clear filters",
          noResults: "No projects match those filters yet.",
          noResultsHelp: "Try a broader location, remove a category, or clear the search to see all verified campaigns.",
          viewAll: "View all campaigns"
        };

  const filters = [{ label: labels.all, value: "" }, ...categories.map((category) => ({ label: category, value: category }))];
  const regions = Array.from(new Set(allCampaigns.map((campaign) => campaign.region))).sort((a, b) => a.localeCompare(b));

  const normalizedQuery = query.toLocaleLowerCase();
  let campaigns = allCampaigns.filter((campaign) => {
    if (selectedCategory && campaign.category !== selectedCategory) return false;
    if (selectedRegion && campaign.region !== selectedRegion) return false;
    if (!normalizedQuery) return true;

    return [campaign.title, campaign.summary, campaign.region, campaign.category]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });

  if (sort === "funded") {
    campaigns = [...campaigns].sort((a, b) => b.raised / b.goal - a.raised / a.goal);
  } else if (sort === "ending") {
    campaigns = [...campaigns].sort((a, b) => a.daysLeft - b.daysLeft);
  }

  function categoryHref(category: string) {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (query) next.set("q", query);
    if (selectedRegion) next.set("region", selectedRegion);
    if (sort !== "newest") next.set("sort", sort);
    const search = next.toString();
    return search ? `/campaigns?${search}` : "/campaigns";
  }

  return (
    <main className="bg-mist-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeading eyebrow={labels.eyebrow} title={labels.title}>
            {labels.intro}
          </SectionHeading>

          <form action="/campaigns" className="mt-8 grid gap-3 rounded-xl border border-ocean-900/10 bg-mist-50 p-4 md:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
            {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
            <label className="relative">
              <span className="sr-only">{labels.searchAria}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
              <input
                name="q"
                defaultValue={query}
                placeholder={labels.searchPlaceholder}
                className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white pl-9 pr-3 text-sm font-semibold text-ocean-900 outline-none focus:border-kelp-500"
              />
            </label>

            <label>
              <span className="sr-only">{labels.regionAria}</span>
              <select
                name="region"
                defaultValue={selectedRegion}
                className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none focus:border-kelp-500"
              >
                <option value="">{labels.allRegions}</option>
                {regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </label>

            <label>
              <span className="sr-only">{labels.sortAria}</span>
              <select
                name="sort"
                defaultValue={sort}
                className="min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none focus:border-kelp-500"
              >
                <option value="newest">{labels.newest}</option>
                <option value="funded">{labels.mostFunded}</option>
                <option value="ending">{labels.endingSoon}</option>
              </select>
            </label>

            <button type="submit" className="min-h-11 rounded-lg bg-kelp-500 px-5 text-sm font-bold text-white hover:bg-kelp-700">
              {labels.search}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = selectedCategory === filter.value;
              return (
                <Link
                  key={filter.value || "all"}
                  href={categoryHref(filter.value)}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "rounded-full bg-ocean-900 px-4 py-2 text-sm font-bold text-white"
                      : "rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-900 ring-1 ring-ocean-900/10 hover:ring-kelp-500"
                  }
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ocean-900/62">
            <span className="font-bold text-ocean-900">{campaigns.length}</span> {labels.projectsFound}
          </p>
          {query || selectedRegion || selectedCategory || sort !== "newest" ? (
            <Link href="/campaigns" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              {labels.clearFilters}
            </Link>
          ) : null}
        </div>

        {campaigns.length > 0 ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-ocean-900/18 bg-white p-10 text-center">
            <p className="text-xl font-bold text-ocean-900">{labels.noResults}</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ocean-900/62">
              {labels.noResultsHelp}
            </p>
            <Link href="/campaigns" className="mt-5 inline-flex rounded-full bg-ocean-900 px-5 py-3 text-sm font-bold text-white hover:bg-ocean-700">
              {labels.viewAll}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
