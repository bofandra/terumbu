"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import { impactSites } from "@/lib/data";
import { cn } from "@/lib/utils";

const filters = ["All", "Coral", "Mangrove", "Cleanup", "Academy"];

export function ImpactMapPreview() {
  const [activeFilter, setActiveFilter] = useState("All");
  const visibleSites = activeFilter === "All" ? impactSites : impactSites.filter((site) => site.type === activeFilter);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-ocean-900/10 bg-ocean-900 shadow-soft">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1600&q=80')"
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(244,93,72,0.38),transparent_28%),linear-gradient(135deg,rgba(7,52,63,0.82),rgba(24,143,138,0.55))]" />

        {visibleSites.map((site, index) => (
          <div
            key={site.name}
            className="absolute"
            style={{
              left: `${20 + index * 17}%`,
              top: `${24 + (index % 3) * 19}%`
            }}
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

