"use client";

import { Camera, CheckCircle2, ExternalLink, HeartHandshake, MapPin, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { ImpactSiteData } from "@/lib/domain";
import { cn } from "@/lib/utils";

const indonesiaBounds = {
  minLat: -11,
  maxLat: 6,
  minLng: 94,
  maxLng: 142
};

type ImpactMapPreviewProps = {
  sites: ImpactSiteData[];
};

function pinPosition(site: ImpactSiteData) {
  const left = ((site.longitude - indonesiaBounds.minLng) / (indonesiaBounds.maxLng - indonesiaBounds.minLng)) * 100;
  const top = ((indonesiaBounds.maxLat - site.latitude) / (indonesiaBounds.maxLat - indonesiaBounds.minLat)) * 100;

  return {
    left: `${Math.min(92, Math.max(8, left))}%`,
    top: `${Math.min(86, Math.max(12, top))}%`
  };
}

function pinTone(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("mangrove")) {
    return "bg-kelp-500 text-white ring-kelp-100";
  }

  if (normalized.includes("cleanup")) {
    return "bg-coral-500 text-white ring-coral-100";
  }

  if (normalized.includes("community")) {
    return "bg-ocean-700 text-white ring-ocean-100";
  }

  return "bg-white text-coral-500 ring-white/60";
}

function isImageUrl(value: string | null | undefined) {
  return Boolean(value && (value.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value)));
}

export function ImpactMapPreview({ sites }: ImpactMapPreviewProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedName, setSelectedName] = useState<string | null>(sites[0]?.name ?? null);
  const filters = useMemo(() => ["All", ...Array.from(new Set(sites.map((site) => site.type)))], [sites]);
  const statusFilters = ["All", "Verified evidence", "Needs review"];
  const visibleSites = sites.filter((site) => {
    const typeMatches = activeFilter === "All" || site.type === activeFilter;
    const statusMatches =
      statusFilter === "All" ||
      (statusFilter === "Verified evidence" && site.verifiedEvidenceCount > 0) ||
      (statusFilter === "Needs review" && site.pendingEvidenceCount > 0);

    return typeMatches && statusMatches;
  });
  const selectedSite = visibleSites.find((site) => site.name === selectedName) ?? visibleSites[0] ?? null;

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-900/10 bg-white p-8 text-center shadow-soft">
        <MapPin className="mx-auto text-coral-500" size={28} aria-hidden="true" />
        <h3 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">Impact sites are being verified</h3>
        <p className="mt-2 text-sm leading-6 text-ocean-900/64">
          Once partner field records are approved, restoration sites and evidence will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-ocean-900/10 bg-ocean-900 shadow-soft">
        <iframe
          title="OpenStreetMap provider view of Indonesian conservation sites"
          className="absolute inset-0 h-full w-full border-0 opacity-70"
          loading="lazy"
          src="https://www.openstreetmap.org/export/embed.html?bbox=94%2C-11%2C142%2C6&layer=mapnik"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,52,63,0.76),rgba(24,143,138,0.42))]" />

        {visibleSites.map((site) => {
          const position = pinPosition(site);

          return (
            <button
              key={site.id}
              type="button"
              aria-label={`Show impact details for ${site.name}`}
              title={site.name}
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 shadow-soft ring-4 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
                pinTone(site.type),
                selectedSite?.id === site.id && "scale-110 ring-white"
              )}
              style={position}
              onClick={() => setSelectedName(site.name)}
            >
              <span className="flex size-11 items-center justify-center rounded-full">
                <MapPin size={22} aria-hidden="true" />
              </span>
            </button>
          );
        })}

        {selectedSite ? (
          <div
            className="absolute z-20 max-w-[250px] -translate-x-1/2 translate-y-8 rounded-xl bg-white/95 p-3 text-left shadow-soft ring-1 ring-ocean-900/10 backdrop-blur"
            style={pinPosition(selectedSite)}
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">Evidence popover</p>
            <p className="mt-1 text-sm font-bold text-ocean-900">{selectedSite.name}</p>
            <p className="mt-1 text-xs text-ocean-900/58">
              {selectedSite.latestEvidence ? `${selectedSite.latestEvidence.stageLabel} / ${selectedSite.latestEvidence.verificationStatus}` : "Evidence pending"}
            </p>
          </div>
        ) : null}

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/92 p-5 backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Live impact map</p>
          <p className="mt-2 max-w-xl text-2xl font-bold tracking-normal text-ocean-900">
            {selectedSite ? selectedSite.name : "Verified restoration sites"}, field updates, and evidence in one national view.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="grid gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ocean-900">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Map filters
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition",
                  filter === activeFilter ? "bg-ocean-900 text-white" : "bg-ocean-50 text-ocean-900 hover:bg-ocean-100"
                )}
                onClick={() => {
                  setActiveFilter(filter);
                  setSelectedName(null);
                }}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold transition",
                  filter === statusFilter ? "bg-kelp-700 text-white" : "bg-kelp-100 text-kelp-700 hover:bg-kelp-200"
                )}
                onClick={() => {
                  setStatusFilter(filter);
                  setSelectedName(null);
                }}
              >
                {filter}
              </button>
            ))}
          </div>
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-xl bg-white p-4">
                <CheckCircle2 className="text-kelp-500" size={20} aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-ocean-900">{selectedSite.progress}% milestone progress</p>
                <p className="mt-1 text-xs leading-5 text-ocean-900/60">{selectedSite.verification}</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <Camera className="text-coral-500" size={20} aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-ocean-900">{selectedSite.evidenceCount} evidence records</p>
                <p className="mt-1 text-xs leading-5 text-ocean-900/60">
                  {selectedSite.latestSurvey ? `Latest survey: ${selectedSite.latestSurvey}` : "Monitoring evidence pending"}
                </p>
              </div>
            </div>

            {selectedSite.beforeAfter ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Before", evidence: selectedSite.beforeAfter.before },
                  { label: "After", evidence: selectedSite.beforeAfter.after }
                ].map(({ label, evidence }) => (
                  <div key={label} className="overflow-hidden rounded-xl bg-white">
                    {evidence && isImageUrl(evidence.fileUrl) ? (
                      <Image
                        src={evidence.fileUrl}
                        alt={`${label} evidence for ${selectedSite.name}`}
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
                        {evidence ? evidence.title : "Evidence pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {selectedSite.latestEvidence ? (
              <div className="mt-5 rounded-xl bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">Latest evidence</p>
                <h3 className="mt-2 font-bold text-ocean-900">{selectedSite.latestEvidence.title}</h3>
                <p className="mt-2 text-xs leading-5 text-ocean-900/60">
                  {selectedSite.latestEvidence.stageLabel} / {selectedSite.latestEvidence.verificationStatus}
                  {selectedSite.latestEvidence.metricLabel && selectedSite.latestEvidence.metricValue
                    ? ` / ${selectedSite.latestEvidence.metricLabel}: ${selectedSite.latestEvidence.metricValue}`
                    : ""}
                </p>
                <Link href={selectedSite.latestEvidence.sourceHref} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
                  Open source record
                  <ExternalLink size={14} aria-hidden="true" />
                </Link>
              </div>
            ) : null}

            {selectedSite.monitoringHistory.length > 0 ? (
              <div className="mt-5">
                <p className="text-sm font-bold text-ocean-900">Monitoring history</p>
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

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-kelp-500" style={{ width: `${selectedSite.progress}%` }} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={selectedSite.campaignSlug ? `/campaigns/${selectedSite.campaignSlug}` : "/campaigns"}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-coral-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-coral-700"
              >
                <HeartHandshake size={16} aria-hidden="true" />
                Donate
              </Link>
              <Link
                href="/impact-map"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-900 ring-1 ring-ocean-900/10 transition hover:ring-coral-500"
              >
                View full map
              </Link>
            </div>
          </div>
        ) : null}

        {visibleSites.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-5 text-sm font-semibold text-ocean-900/62">
            No impact sites match the selected filters.
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {visibleSites.map((site) => (
            <button
              key={site.id}
              type="button"
              className={cn(
                "w-full rounded-xl border p-4 text-left transition hover:border-coral-500",
                selectedSite?.name === site.name ? "border-coral-500 bg-coral-100/35" : "border-ocean-900/10"
              )}
              onClick={() => setSelectedName(site.name)}
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
                {site.verification} · {site.verifiedEvidenceCount} verified · {site.pendingEvidenceCount} in review
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-ocean-50">
                <div className="h-full rounded-full bg-kelp-500" style={{ width: `${site.progress}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-ocean-900/60">{site.progress}% milestone progress</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
