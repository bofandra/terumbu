"use client";

import { Camera, CheckCircle2, List, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn, formatCurrency } from "@/lib/utils";

const indonesiaBounds = {
  minLat: -11,
  maxLat: 6,
  minLng: 94,
  maxLng: 142
};

type PersonalImpactSite = {
  name: string;
  type: string;
  region: string;
  campaignSlug: string;
  campaignTitle: string;
  progress: number;
  latitude: number;
  longitude: number;
  verification: string;
  evidenceCount: number;
  latestSurvey: string | null;
  contributed: number;
  supportedUnits: number;
};

function pinPosition(site: PersonalImpactSite) {
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

  return "bg-ocean-700 text-white ring-ocean-100";
}

export function DashboardPersonalImpactMap({ sites }: { sites: PersonalImpactSite[] }) {
  const [selectedName, setSelectedName] = useState(sites[0]?.name ?? null);
  const selectedSite = sites.find((site) => site.name === selectedName) ?? sites[0] ?? null;

  if (sites.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-ocean-900/16 bg-white p-8 text-center shadow-soft" aria-labelledby="personal-map-title">
        <MapPin className="mx-auto text-coral-500" size={30} aria-hidden="true" />
        <h2 id="personal-map-title" className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">
          Your impact map is waiting
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">
          Campaigns you support, sponsored corals, expeditions, and verified field evidence will appear here as approximate zones.
        </p>
        <Link href="/campaigns" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-coral-500 px-5 text-sm font-bold text-white">
          Explore projects
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" aria-labelledby="personal-map-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Your impact map</p>
          <h2 id="personal-map-title" className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">
            Places connected to your activity
          </h2>
        </div>
        <Link href="/dashboard/impact" className="hidden text-sm font-bold text-coral-700 hover:text-coral-500 sm:inline-flex">
          View full map
        </Link>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl bg-ocean-900">
          <iframe
            title="OpenStreetMap view of personal Indonesian impact zones"
            className="absolute inset-0 h-full w-full border-0 opacity-70"
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=94%2C-11%2C142%2C6&layer=mapnik"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,52,63,0.68),rgba(24,143,138,0.22))]" />

          {sites.map((site) => (
            <button
              key={`${site.campaignSlug}-${site.name}`}
              type="button"
              aria-label={`Show my impact at ${site.name}`}
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 shadow-soft ring-4 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
                pinTone(site.type),
                selectedSite?.name === site.name && "scale-110 ring-white"
              )}
              style={pinPosition(site)}
              onClick={() => setSelectedName(site.name)}
            >
              <span className="flex size-10 items-center justify-center rounded-full">
                <MapPin size={20} aria-hidden="true" />
              </span>
            </button>
          ))}

          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/92 p-4 backdrop-blur">
            <p className="text-sm font-bold text-ocean-900">Locations are shown approximately to protect restoration areas.</p>
          </div>
        </div>

        <div>
          {selectedSite ? (
            <div className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ocean-900">{selectedSite.name}</p>
                  <p className="mt-1 text-sm text-ocean-900/62">{selectedSite.region}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">{selectedSite.type}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-ocean-900/68">{selectedSite.campaignTitle}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-kelp-500" size={20} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-ocean-900">{selectedSite.progress}% milestone progress</p>
                    <p className="text-xs text-ocean-900/58">{selectedSite.verification}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Camera className="mt-0.5 text-coral-500" size={20} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-ocean-900">{selectedSite.evidenceCount} evidence records</p>
                    <p className="text-xs text-ocean-900/58">{selectedSite.latestSurvey ? `Latest survey: ${selectedSite.latestSurvey}` : "Survey pending"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-kelp-500" style={{ width: `${selectedSite.progress}%` }} />
              </div>
              <div className="mt-5 grid gap-2 text-sm font-semibold text-ocean-900/68">
                <span>{formatCurrency(selectedSite.contributed)} contributed here</span>
                <span>{selectedSite.supportedUnits.toLocaleString("id-ID")} supported restoration units</span>
              </div>
              <Link href={`/campaigns/${selectedSite.campaignSlug}`} className="mt-5 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
                View my impact here
              </Link>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2" aria-label="Impact sites list view">
            <p className="flex items-center gap-2 text-sm font-bold text-ocean-900">
              <List size={16} aria-hidden="true" />
              List view
            </p>
            {sites.map((site) => (
              <button
                key={`${site.campaignSlug}-${site.name}-list`}
                type="button"
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:border-coral-500",
                  selectedSite?.name === site.name ? "border-coral-500 bg-coral-100/35" : "border-ocean-900/10 bg-white"
                )}
                onClick={() => setSelectedName(site.name)}
              >
                <span className="block font-bold text-ocean-900">{site.name}</span>
                <span className="mt-1 block text-ocean-900/58">{site.region}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
