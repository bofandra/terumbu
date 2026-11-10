"use client";

import { ExternalLink, HeartHandshake, MapPin, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ImpactSiteLeafletMap } from "@/components/impact-site-leaflet-map";
import { isVisualEvidenceUrl } from "@/lib/coral-monitoring";
import type { ImpactSiteData } from "@/lib/domain";
import type { SupportedLocale } from "@/lib/user-preferences";
import { cn } from "@/lib/utils";

type ImpactMapPreviewProps = {
  sites: ImpactSiteData[];
  locale?: SupportedLocale;
};

export function ImpactMapPreview({ sites, locale = "en" }: ImpactMapPreviewProps) {
  const labels =
    locale === "id"
      ? {
          all: "Semua",
          verifiedActivity: "Aktivitas terverifikasi",
          needsReview: "Perlu review",
          verifyingTitle: "Lokasi dampak sedang diverifikasi",
          verifyingBody: "Setelah catatan lapangan mitra disetujui, lokasi restorasi dan aktivitas akan muncul di sini.",
          iframeTitle: "Tampilan OpenStreetMap lokasi konservasi Indonesia",
          showDetails: "Tampilkan detail dampak untuk",
          popover: "Ringkasan aktivitas",
          pending: "Aktivitas menunggu",
          liveMap: "Peta dampak",
          verifiedSites: "Lokasi restorasi terverifikasi",
          liveMapSuffix: "dan aktivitas lapangan dalam satu tampilan nasional.",
          filters: "Filter peta",
          milestone: "progres milestone",
          activityRecords: "catatan aktivitas",
          latestSurvey: "Survei terbaru",
          monitoringPending: "Aktivitas monitoring menunggu",
          before: "Sebelum",
          after: "Sesudah",
          activityFor: "aktivitas untuk",
          latestActivity: "Aktivitas terbaru",
          openSource: "Buka catatan sumber",
          history: "Riwayat monitoring",
          milestoneAria: "persen melalui milestone saat ini",
          donate: "Donasi",
          fullMap: "Lihat peta lengkap",
          noMatch: "Tidak ada lokasi dampak yang sesuai dengan filter terpilih.",
          region: "Wilayah", allRegions: "Semua wilayah", resultCount: "lokasi sesuai filter", siteReview: "Status lokasi", evidenceReview: "Tinjauan bukti lapangan",
          verified: "terverifikasi",
          inReview: "dalam review"
        }
      : {
          all: "All",
          verifiedActivity: "Verified activity",
          needsReview: "Needs review",
          verifyingTitle: "Impact sites are being verified",
          verifyingBody: "Once partner field records are approved, restoration sites and activity will appear here.",
          iframeTitle: "OpenStreetMap provider view of Indonesian conservation sites",
          showDetails: "Show impact details for",
          popover: "Activity popover",
          pending: "Activity pending",
          liveMap: "Live impact map",
          verifiedSites: "Verified restoration sites",
          liveMapSuffix: "field activity in one national view.",
          filters: "Map filters",
          milestone: "milestone progress",
          activityRecords: "activity records",
          latestSurvey: "Latest survey",
          monitoringPending: "Monitoring activity pending",
          before: "Before",
          after: "After",
          activityFor: "activity for",
          latestActivity: "Latest activity",
          openSource: "Open source record",
          history: "Monitoring history",
          milestoneAria: "percent through its current milestone",
          donate: "Donate",
          fullMap: "View full map",
          noMatch: "No impact sites match the selected filters.",
          region: "Region", allRegions: "All regions", resultCount: "sites match filters", siteReview: "Site status", evidenceReview: "Field evidence review",
          verified: "verified",
          inReview: "in review"
        };
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "review">("all");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(sites[0]?.id ?? null);
  const typeFilters = useMemo(() => Array.from(new Set(sites.map((site) => site.type))), [sites]);
  const regions = useMemo(() => Array.from(new Set(sites.map((site) => site.region).filter(Boolean))).sort(), [sites]);
  const visibleSites = sites.filter((site) => {
    const typeMatches = activeFilter === "all" || site.type === activeFilter;
    const regionMatches = regionFilter === "all" || site.region === regionFilter;
    const statusMatches =
      statusFilter === "all" ||
      (statusFilter === "verified" && site.verifiedEvidenceCount > 0) ||
      (statusFilter === "review" && site.pendingEvidenceCount > 0);

    return typeMatches && regionMatches && statusMatches;
  });
  const selectedSite = visibleSites.find((site) => site.id === selectedSiteId) ?? visibleSites[0] ?? null;

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-900/10 bg-white p-8 text-center shadow-soft">
        <MapPin className="mx-auto text-coral-500" size={28} aria-hidden="true" />
        <h3 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">{labels.verifyingTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-ocean-900/64">
          {labels.verifyingBody}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="grid gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ocean-900">
            <SlidersHorizontal size={16} aria-hidden="true" />
            {labels.filters}
          </p>
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            {labels.region}
            <select value={regionFilter} onChange={(event) => { setRegionFilter(event.target.value); setSelectedSiteId(null); }} className="min-h-11 w-full rounded-lg border border-ocean-900/20 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700">
              <option value="all">{labels.allRegions}</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {[{ value: "all", label: labels.all }, ...typeFilters.map((type) => ({ value: type, label: type }))].map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition",
                  filter.value === activeFilter ? "bg-ocean-900 text-white" : "bg-ocean-50 text-ocean-900 hover:bg-ocean-100"
                )}
                aria-pressed={filter.value === activeFilter}
                onClick={() => {
                  setActiveFilter(filter.value);
                  setSelectedSiteId(null);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all" as const, label: labels.all },
              { value: "verified" as const, label: labels.verifiedActivity },
              { value: "review" as const, label: labels.needsReview }
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition",
                  filter.value === statusFilter ? "bg-kelp-700 text-white" : "bg-kelp-100 text-kelp-700 hover:bg-kelp-200"
                )}
                aria-pressed={filter.value === statusFilter}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setSelectedSiteId(null);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p role="status" aria-live="polite" className="text-xs font-semibold text-ocean-900/70">{visibleSites.length} {labels.resultCount}</p>
        </div>

        {selectedSite ? (
          <div className="mt-6 rounded-xl border border-ocean-900/10 bg-sand-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold tracking-normal text-ocean-900">{selectedSite.name}</p>
                <p className="mt-1 text-sm text-ocean-900/62">{selectedSite.region}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">
                {selectedSite.type}
              </span>
            </div>

            <div className="mt-5 rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ocean-900/60">{labels.evidenceReview}</p>
              <p className="mt-2 text-sm font-semibold text-ocean-900">{selectedSite.verifiedEvidenceCount} {labels.verified} · {selectedSite.pendingEvidenceCount} {labels.inReview}</p>
              <p className="mt-1 text-xs text-ocean-900/60">{selectedSite.evidenceCount} {labels.activityRecords}</p>
              {selectedSite.latestSurvey ? <p className="mt-2 text-xs text-ocean-900/60">{labels.latestSurvey}: {selectedSite.latestSurvey}</p> : null}
            </div>

            {selectedSite.beforeAfter ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { label: labels.before, evidence: selectedSite.beforeAfter.before },
                  { label: labels.after, evidence: selectedSite.beforeAfter.after }
                ].map(({ label, evidence }) => (
                  <div key={label} className="overflow-hidden rounded-xl bg-white">
                    {evidence && isVisualEvidenceUrl(evidence.fileUrl) ? (
                      <Image
                        src={evidence.fileUrl}
                        alt={`${label} ${labels.activityFor} ${selectedSite.name}`}
                        width={360}
                        height={220}
                        unoptimized
                        className="h-28 w-full object-cover"
                        sizes="(min-width: 1280px) 180px, 50vw"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-ocean-50 text-xs font-bold text-ocean-900/52">{label}</div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{label}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-ocean-900/62">
                        {evidence ? evidence.title : "Activity pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {selectedSite.latestEvidence ? (
              <div className="mt-5 rounded-xl bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{labels.latestActivity}</p>
                <h3 className="mt-2 font-bold text-ocean-900">{selectedSite.latestEvidence.title}</h3>
                <p className="mt-2 text-xs leading-5 text-ocean-900/60">
                  {selectedSite.latestEvidence.stageLabel} / {selectedSite.latestEvidence.verificationStatus}
                  {selectedSite.latestEvidence.metricLabel && selectedSite.latestEvidence.metricValue
                    ? ` / ${selectedSite.latestEvidence.metricLabel}: ${selectedSite.latestEvidence.metricValue}`
                    : ""}
                </p>
                <Link href={selectedSite.latestEvidence.sourceHref} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
                  {labels.openSource}
                  <ExternalLink size={14} aria-hidden="true" />
                </Link>
              </div>
            ) : null}

            {selectedSite.monitoringHistory.length > 0 ? (
              <div className="mt-5">
                <p className="text-sm font-bold text-ocean-900">{labels.history}</p>
                <ol className="mt-3 space-y-3">
                  {selectedSite.monitoringHistory.map((event) => (
                    <li key={event.id} className="border-l-2 border-ocean-100 pl-3">
                      <Link href={event.evidenceHref} className="text-sm font-bold text-ocean-900 hover:text-coral-700">
                        {event.label} / {event.date}
                      </Link>
                      <p className="mt-1 text-xs leading-5 text-ocean-900/58">{event.summary}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={selectedSite.campaignSlug ? `/campaigns/${selectedSite.campaignSlug}` : "/campaigns"}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-coral-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-coral-700"
              >
                <HeartHandshake size={16} aria-hidden="true" />
                {labels.donate}
              </Link>
              <Link
                href="/impact-map"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-900 ring-1 ring-ocean-900/10 transition hover:ring-coral-500"
              >
                {labels.fullMap}
              </Link>
            </div>
          </div>
        ) : null}

        {visibleSites.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-5 text-sm font-semibold text-ocean-900/62">
            {labels.noMatch}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {visibleSites.map((site) => (
            <button
              key={site.id}
              type="button"
              className={cn(
                "w-full rounded-xl border p-4 text-left transition hover:border-coral-500",
                selectedSite?.id === site.id ? "border-coral-500 bg-coral-100/35" : "border-ocean-900/10"
              )}
              onClick={() => setSelectedSiteId(site.id)}
              aria-pressed={selectedSite?.id === site.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ocean-900">{site.name}</p>
                  <p className="mt-1 text-sm text-ocean-900/62">{site.region}</p>
                </div>
                <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900">
                  {site.type}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-ocean-900/58">
                {labels.siteReview}: {site.verification} · {labels.evidenceReview}: {site.verifiedEvidenceCount} {labels.verified} · {site.pendingEvidenceCount} {labels.inReview}
              </p>
            </button>
          ))}
        </div>
      </div>
      <ImpactSiteLeafletMap sites={sites} visibleSites={visibleSites} selectedSiteId={selectedSite?.id ?? null} onSelect={setSelectedSiteId} locale={locale} />
    </div>
  );
}
