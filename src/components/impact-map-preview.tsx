"use client";

import { MapPin } from "lucide-react";
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

export function ImpactMapPreview({ sites }: ImpactMapPreviewProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const filters = useMemo(() => ["All", ...Array.from(new Set(sites.map((site) => site.type)))], [sites]);
  const visibleSites = activeFilter === "All" ? sites : sites.filter((site) => site.type === activeFilter);

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

        {visibleSites.map((site) => (
          <div
            key={site.name}
            className="absolute"
            style={pinPosition(site)}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-coral-500 shadow-soft">
              <MapPin size={22} aria-hidden="true" />
            </span>
          </div>
        ))}

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/92 p-5 backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Live impact map</p>
          <p className="mt-2 max-w-xl text-2xl font-bold tracking-normal text-ocean-900">
            Verified restoration sites, field updates, and evidence in one national view.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition",
                filter === activeFilter ? "bg-ocean-900 text-white" : "bg-ocean-50 text-ocean-900 hover:bg-ocean-100"
              )}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {visibleSites.map((site) => (
            <div key={site.name} className="rounded-xl border border-ocean-900/10 p-4">
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
                {site.verification} · {site.evidenceCount} evidence records
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-ocean-50">
                <div className="h-full rounded-full bg-kelp-500" style={{ width: `${site.progress}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-ocean-900/60">{site.progress}% milestone progress</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
