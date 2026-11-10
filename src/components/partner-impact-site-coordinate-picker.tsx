"use client";

import { MapPin } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useId, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Props = { latitude?: number | string | null; longitude?: number | string | null; disabled?: boolean };

const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng)
  && lat >= -11 && lat <= 6 && lng >= 94 && lng <= 142;

/** For authenticated partners only; exact values are never used for public pins by default. */
export function PartnerImpactSiteCoordinatePicker({ latitude, longitude, disabled = false }: Props) {
  const id = useId();
  const [lat, setLat] = useState(latitude == null ? "" : String(latitude));
  const [lng, setLng] = useState(longitude == null ? "" : String(longitude));
  const [open, setOpen] = useState(false);
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const initial = useRef({ lat, lng });
  useEffect(() => { initial.current = { lat, lng }; }, [lat, lng]);

  useEffect(() => {
    if (!open || disabled) return;
    let cancelled = false;
    async function initialize() {
      try {
        const loaded = await import("leaflet");
        const L = (loaded.default ?? loaded) as typeof import("leaflet");
        if (cancelled || !element.current) return;
        const a = Number(initial.current.lat), b = Number(initial.current.lng);
        const hasValid = Boolean(initial.current.lat && initial.current.lng && valid(a, b));
        const instance = L.map(element.current, { scrollWheelZoom: false, minZoom: 4, maxZoom: 15 })
          .setView(hasValid ? [a, b] : [-3.5, 119], hasValid ? 11 : 5);
        map.current = instance;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 15, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(instance);
        const icon = L.divIcon({ className: "terumbu-map-pin verified", html: '<span aria-hidden="true"></span>', iconSize: [38, 42], iconAnchor: [19, 40] });
        if (hasValid) marker.current = L.marker([a,b], { icon }).addTo(instance);
        instance.on("click", ({ latlng }) => {
          const nextLat = Number(latlng.lat.toFixed(6)), nextLng = Number(latlng.lng.toFixed(6));
          if (!valid(nextLat, nextLng)) return;
          setLat(String(nextLat)); setLng(String(nextLng));
          if (marker.current) marker.current.setLatLng([nextLat,nextLng]);
          else marker.current = L.marker([nextLat,nextLng], { icon }).addTo(instance);
        });
        instance.invalidateSize();
      } catch {
        // Manual coordinate inputs remain usable if map tiles fail.
      }
    }
    void initialize();
    return () => { cancelled = true; map.current?.remove(); map.current = null; marker.current = null; };
  }, [open, disabled]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-ocean-900" htmlFor={`${id}-lat`}>Latitude (internal)
          <input id={`${id}-lat`} name="latitude" type="number" min="-11" max="6" step="0.000001" value={lat}
            onChange={(event) => setLat(event.target.value)} placeholder="-0.234900" disabled={disabled} required
            className="min-h-11 w-full rounded-lg border border-ocean-900/20 bg-white px-3 text-sm font-semibold" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-ocean-900" htmlFor={`${id}-lng`}>Longitude (internal)
          <input id={`${id}-lng`} name="longitude" type="number" min="94" max="142" step="0.000001" value={lng}
            onChange={(event) => setLng(event.target.value)} placeholder="130.516600" disabled={disabled} required
            className="min-h-11 w-full rounded-lg border border-ocean-900/20 bg-white px-3 text-sm font-semibold" />
        </label>
      </div>
      <button type="button" disabled={disabled} aria-expanded={open} aria-controls={`${id}-map`}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ocean-900/20 bg-white px-4 text-sm font-bold text-ocean-900 hover:bg-ocean-50 disabled:opacity-50"
        onClick={() => setOpen((value) => !value)}>
        <MapPin size={16} aria-hidden="true" />{open ? "Close map picker" : "Choose on map"}
      </button>
      {open ? <div id={`${id}-map`} className="overflow-hidden rounded-2xl border border-ocean-900/10">
        <div ref={element} role="region" aria-label="Partner site coordinate picker" className="h-[300px] w-full bg-ocean-50" />
        <p className="bg-white p-3 text-xs text-ocean-900/65">Click in Indonesia to set the coordinates. Public pins are approximate unless explicitly allowed.</p>
      </div> : null}
    </div>
  );
}
