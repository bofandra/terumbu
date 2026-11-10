'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DivIcon, Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePrefs } from '@/lib/i18n';
import { SITES, explorer as c, type ActivityType, type Site } from '@/content/impact-map';

type TypeFilter = 'all' | ActivityType;
type StatusFilter = 'all' | Site['status'];

export default function ImpactExplorer() {
  const { t, locale } = usePrefs();
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(SITES[0].id);
  const [mapFailed, setMapFailed] = useState(false);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const visible = useMemo(
    () => SITES.filter((s) => (type === 'all' || s.type === type) && (status === 'all' || s.status === status)),
    [type, status],
  );
  const selected = visible.find((s) => s.id === selectedId) ?? visible[0] ?? null;

  // Leaflet hanya jalan di browser; HTML server tetap berisi daftar lokasi + detail (untuk SEO & fallback).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('leaflet');
        const L = (mod as unknown as { default?: typeof import('leaflet') }).default ?? mod;
        if (cancelled || !mapEl.current || mapRef.current) return;
        leaflet.current = L;
        const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView([-4.5, 120], 4);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 10, attribution: '© OpenStreetMap contributors' }).addTo(map);
        SITES.forEach((s) => {
          const m = L.marker([s.lat, s.lng], { icon: pin(L, s, false), title: s.name, alt: s.name, keyboard: true }).addTo(map);
          m.on('click', () => setSelectedId(s.id));
          markers.current[s.id] = m;
        });
        mapRef.current = map;
        setMapReady(true);
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; markers.current = {}; };
  }, []);

  // sinkronkan pin dengan filter + pilihan
  useEffect(() => {
    const map = mapRef.current, L = leaflet.current;
    if (!mapReady || !map || !L) return;
    SITES.forEach((s) => {
      const m = markers.current[s.id];
      if (!m) return;
      const show = visible.some((v) => v.id === s.id);
      if (show && !map.hasLayer(m)) m.addTo(map);
      if (!show && map.hasLayer(m)) map.removeLayer(m);
      m.setIcon(pin(L, s, s.id === selected?.id));
    });
  }, [mapReady, visible, selected]);

  const pick = (id: string) => {
    setSelectedId(id);
    const m = markers.current[id];
    if (m) mapRef.current?.panTo(m.getLatLng());
  };

  const typeItems: [TypeFilter, string][] = [['all', t(c.all)], ['cleanup', t(c.types.cleanup)], ['mangrove', t(c.types.mangrove)], ['coral', t(c.types.coral)]];
  const statusItems: [StatusFilter, string][] = [['all', t(c.all)], ['verified', t(c.statuses.verified)], ['review', t(c.statuses.review)]];

  return (
    <div className="explorer-layout">
      <div className="side">
        <div className="panel filters-panel">
          <div className="panel-head"><strong>{t(c.filters)}</strong><span>{t(c.filtersSub)}</span></div>
          <div className="filter-group">
            <span>{t(c.type)}</span>
            <div className="chips" role="group" aria-label={t(c.type)}>
              {typeItems.map(([v, label]) => <button key={v} type="button" className="chip" aria-pressed={type === v} onClick={() => setType(v)}>{label}</button>)}
            </div>
          </div>
          <div className="filter-group">
            <span>{t(c.status)}</span>
            <div className="chips" role="group" aria-label={t(c.status)}>
              {statusItems.map(([v, label]) => <button key={v} type="button" className="chip" aria-pressed={status === v} onClick={() => setStatus(v)}>{label}</button>)}
            </div>
          </div>
        </div>
        <div className="panel list-panel">
          <div className="panel-head"><strong>{t(c.list)}</strong><span aria-live="polite">{t(c.sitesCount(visible.length))}</span></div>
          <ul className="site-list">
            {visible.map((s) => (
              <li key={s.id}>
                <button type="button" className="site-row" aria-current={s.id === selected?.id ? 'true' : undefined} onClick={() => pick(s.id)}>
                  <b>{s.name}</b>
                  <small>{t(s.region)} · {t(c.types[s.type])}</small>
                  <div className="meter" style={{ ['--w' as string]: `${s.progress}%` }}><i /></div>
                </button>
              </li>
            ))}
          </ul>
          {visible.length === 0 ? <p className="empty">{t(c.empty)}</p> : null}
        </div>
      </div>

      <div className="main-col">
        <div className={`map-wrap${mapFailed ? ' no-map' : ''}`}>
          <div ref={mapEl} id="map" role="region" aria-label={t(c.mapLabel)} />
          <div className="map-fallback">{t(c.noMap)}</div>
          <div className="map-legend">
            <span style={{ ['--dot' as string]: 'var(--color-ocean)' }}>{t(c.legendOk)}</span>
            <span style={{ ['--dot' as string]: 'var(--color-coral-text)' }}>{t(c.legendReview)}</span>
          </div>
        </div>

        {selected ? <Detail site={selected} locale={locale} /> : null}
      </div>
    </div>
  );
}

function Detail({ site: s }: { site: Site; locale: string }) {
  const { t } = usePrefs();
  const ok = s.status === 'verified';
  return (
    <article className="panel detail" aria-live="polite">
      <div className="detail-top">
        <div><h3>{s.name}</h3><p className="detail-region">{t(s.region)}</p></div>
        <span className="tag">{t(c.types[s.type])}</span>
      </div>
      <dl className="detail-grid">
        <div><dt>{t(c.milestone)}</dt><dd>{s.progress}%</dd></div>
        <div><dt>{t(c.level)}</dt><dd>{s.level}</dd></div>
        <div><dt>{t(c.records)}</dt><dd className={ok ? 'status-ok' : 'status-review'}>{t(ok ? c.recVerified : c.recReview)}</dd></div>
      </dl>
      <div className="meter" role="img" aria-label={`${s.progress}% ${t(c.progress)}`} style={{ ['--w' as string]: `${s.progress}%` }}><i /></div>
      <div className="latest">
        <small>{t(c.latest)}</small>
        <strong>{t(s.latest)}</strong>
        <p>{t(s.metric)}{s.survey ? ` · ${t(c.survey)}: ${t(s.survey)}` : ''}</p>
      </div>
      <div className="detail-actions">
        <a className="button button-primary" href={s.href}>{t(ok ? c.openSource : c.viewProject)} <span aria-hidden="true">↗</span></a>
        <a className="button button-secondary" href="/campaigns">{t(c.support)}</a>
      </div>
    </article>
  );
}

function pin(L: typeof import('leaflet'), s: Site, active: boolean): DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="pin ${s.status}${active ? ' active' : ''}"></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}
