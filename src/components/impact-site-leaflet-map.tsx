"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { ImpactSiteData } from "@/lib/domain";
import { isIndonesianImpactSiteLocation } from "@/lib/impact-map-location";
import type { SupportedLocale } from "@/lib/user-preferences";

type ImpactSiteLeafletMapProps = {
  sites: ImpactSiteData[];
  visibleSites: ImpactSiteData[];
  selectedSiteId: string | null;
  onSelect: (id: string) => void;
  locale: SupportedLocale;
};

function sitePin(L: typeof import("leaflet"), site: ImpactSiteData, selected: boolean) {
  const evidenceStatus = site.verifiedEvidenceCount > 0 ? "verified" : "review";
  return L.divIcon({
    className: `terumbu-map-pin ${evidenceStatus}${selected ? " is-selected" : ""}`,
    html: '<span aria-hidden="true"></span>',
    iconSize: [38, 42],
    iconAnchor: [19, 40]
  });
}

/**
 * Actual georeferenced Leaflet markers, not absolutely positioned overlay pins.
 * The map is progressive enhancement: the server-rendered site list remains
 * navigable if the map tiles or Leaflet library cannot be loaded.
 */
export function ImpactSiteLeafletMap({ sites, visibleSites, selectedSiteId, onSelect, locale }: ImpactSiteLeafletMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelect);
  const previousSelection = useRef(selectedSiteId);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const loaded = await import("leaflet");
        const L = (loaded.default ?? loaded) as typeof import("leaflet");
        if (cancelled || !element.current) return;

        leaflet.current = L;
        const instance = L.map(element.current, {
          scrollWheelZoom: false,
          minZoom: 3,
          maxZoom: 14
        }).setView([-3.5, 119], 4);

        map.current = instance;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 14,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(instance);

        const coords: [number, number][] = [];
        for (const site of sites) {
          if (!isIndonesianImpactSiteLocation(site)) continue;
          const position: [number, number] = [site.latitude, site.longitude];
          coords.push(position);
          const marker = L.marker(position, {
            title: site.name,
            alt: site.name,
            keyboard: true,
            icon: sitePin(L, site, site.id === selectedSiteId)
          });
          marker.on("click", () => onSelectRef.current(site.id));
          markers.current.set(site.id, marker);
        }
        if (coords.length > 1) {
          instance.fitBounds(coords, { padding: [30, 30], maxZoom: 7 });
        } else if (coords.length === 1) {
          instance.setView(coords[0], 7);
        }
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markers.current.clear();
      leaflet.current = null;
    };
    // Site records are server-rendered and remain stable between filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites]);

  useEffect(() => {
    const instance = map.current, L = leaflet.current;
    if (!ready || !instance || !L) return;
    const visible = new Set(visibleSites.map((site) => site.id));
    for (const site of sites) {
      const marker = markers.current.get(site.id);
      if (!marker) continue;
      if (visible.has(site.id) && !instance.hasLayer(marker)) marker.addTo(instance);
      if (!visible.has(site.id) && instance.hasLayer(marker)) instance.removeLayer(marker);
      marker.setIcon(sitePin(L, site, site.id === selectedSiteId));
    }
  }, [ready, sites, visibleSites, selectedSiteId]);

  // Choosing a site in the accessible list focuses the matching map marker.
  // Skip the initial choice so the first view retains the national overview.
  useEffect(() => {
    const wasChanged = previousSelection.current !== selectedSiteId;
    previousSelection.current = selectedSiteId;
    if (!ready || !wasChanged || !selectedSiteId) return;
    const marker = markers.current.get(selectedSiteId);
    if (marker && map.current?.hasLayer(marker)) {
      map.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [ready, selectedSiteId]);

  return (
    <div className="relative min-h-[440px] overflow-hidden rounded-3xl border border-ocean-900/10 bg-ocean-900 shadow-soft">
      <div ref={element} role="region"
        aria-label={locale === "id" ? "Peta interaktif lokasi konservasi di Indonesia" : "Interactive map of conservation sites in Indonesia"}
        className="relative z-0 h-[440px] w-full sm:h-[550px]" />
      {!ready ? (
        <p className="pointer-events-none absolute inset-x-5 top-5 z-[400] rounded-xl bg-white/95 p-3 text-sm font-semibold text-ocean-900">
          {failed
            ? (locale === "id" ? "Peta tidak dapat dimuat. Pilih lokasi dari daftar di samping." : "Map unavailable. Choose a site from the accompanying list.")
            : (locale === "id" ? "Memuat peta interaktif…" : "Loading interactive map…")}
        </p>
      ) : null}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[400] flex flex-wrap gap-3 rounded-xl bg-white/95 p-3 text-xs font-bold text-ocean-900 shadow-sm">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-kelp-500" />
          {locale === "id" ? "Ada bukti terverifikasi" : "Verified evidence"}
        </span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-coral-500" />
          {locale === "id" ? "Belum ada bukti terverifikasi" : "Not yet verified"}
        </span>
      </div>
    </div>
  );
}
