'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import '@/styles/expeditions.css';
import { usePrefs, useLocalizedMeta } from '@/lib/i18n';
import { waLink } from '@/lib/site';
import { expeditions, detailHref } from '@/content/expeditions';
import { catalogue, cta, faq, hero, impact, listSeo } from '@/content/expeditions-page';
import { SiteFooter, SiteHeader, SkipLink } from './SiteChrome';

type Sort = 'recommended' | 'price' | 'duration';

const impactIcons: Record<string, React.ReactNode> = {
  guide: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.7-3.2 3.1-5 7-5s6.3 1.8 7 5" /><path d="M19 5.5 21 7l-2 1.5" /></>,
  waves: <><path d="M3 15c2.2-3 4.4-3 6.7 0s4.5 3 6.7 0 4.4-3 6.6 0" /><path d="M5 19c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" /><path d="M17 4v4M15 6h4" /></>,
  shield: <><path d="m12 3 7 3v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" /><path d="M8 8h8M8 12h5" /></>,
};

export default function ExpeditionsView() {
  const { t, money } = usePrefs();
  useLocalizedMeta(listSeo);

  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState('');
  const [travelers, setTravelers] = useState('');
  const [draftSort, setDraftSort] = useState<Sort>('recommended');
  const [sort, setSort] = useState<Sort>('recommended');

  const results = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().trim();
    const q = norm(query), d = norm(destination), n = parseInt(travelers, 10);
    const list = expeditions.filter((e) => {
      const hay = norm([e.title, e.description, e.location, e.label, e.partner].map((x) => `${x.id} ${x.en}`).join(' '));
      if (q && !hay.includes(q)) return false;
      if (d && !norm(`${e.location.id} ${e.location.en}`).includes(d)) return false;
      if (Number.isFinite(n) && n > e.maxParticipants) return false;
      return true;
    });
    if (sort === 'price') return [...list].sort((a, b) => a.priceIdr - b.priceIdr);
    if (sort === 'duration') return [...list].sort((a, b) => (a.durationDays ?? 99) - (b.durationDays ?? 99));
    return list;
  }, [query, destination, travelers, sort]);

  const reset = () => { setQuery(''); setDestination(''); setTravelers(''); };

  return (
    <div className="pg-list">
      <SkipLink />
      <SiteHeader />
      <main id="main">
        <section className="hero">
          <div className="shell hero-grid">
            <div>
              <h1>{t(hero.h1)}</h1>
              <p className="hero-copy">{t(hero.copy)}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#expeditions">{t(hero.primary)} <span aria-hidden="true">↘</span></a>
                <a className="button button-secondary" href="#contact">{t(hero.secondary)}</a>
              </div>
            </div>
            <figure className="hero-photo">
              <Image src={hero.photo} alt={t(hero.photoAlt)} fill priority sizes="(max-width: 820px) 100vw, 55vw" />
              <figcaption className="hero-caption"><strong>{t(hero.captionTitle)}</strong><span>{t(hero.captionBody)}</span></figcaption>
            </figure>
          </div>
        </section>

        <section className="catalogue" id="expeditions">
          <div className="shell">
            <div className="section-head">
              <div><h2>{t(catalogue.h2)}</h2></div>
              <p>{t(catalogue.lede)}</p>
            </div>
            <div className="catalogue-layout">
              <aside className="filter-panel" aria-label={t(catalogue.filterAria)}>
                <div className="filter-panel-head"><strong>{t(catalogue.filterTitle)}</strong><span>{t(catalogue.filterSub)}</span></div>
                <div className="filter-fields">
                  <div className="filter-field"><label htmlFor="filter-search">{t(catalogue.search)}</label><input id="filter-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(catalogue.searchPh)} /></div>
                  <div className="filter-field"><label htmlFor="filter-destination">{t(catalogue.destination)}</label><input id="filter-destination" type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t(catalogue.destinationPh)} /></div>
                  {/* TODO(engineer): date filters need departure dates in the data source; inputs are UI-only for now */}
                  <div className="filter-field"><label htmlFor="filter-start">{t(catalogue.departure)}</label><input id="filter-start" type="date" /></div>
                  <div className="filter-field"><label htmlFor="filter-end">{t(catalogue.returning)}</label><input id="filter-end" type="date" /></div>
                  <div className="filter-field"><label htmlFor="filter-travelers">{t(catalogue.travelers)}</label><input id="filter-travelers" type="number" min={1} inputMode="numeric" value={travelers} onChange={(e) => setTravelers(e.target.value)} placeholder={t(catalogue.travelersPh)} /></div>
                </div>
              </aside>
              <div className="results-panel">
                <div className="result-toolbar">
                  <span className="sr-only" role="status" aria-live="polite">{t(catalogue.resultCount(results.length))}</span>
                  <div className="sort-control">
                    <select aria-label={t(catalogue.sortAria)} value={draftSort} onChange={(e) => setDraftSort(e.target.value as Sort)}>
                      <option value="recommended">{t(catalogue.sortRecommended)}</option>
                      <option value="price">{t(catalogue.sortPrice)}</option>
                      <option value="duration">{t(catalogue.sortDuration)}</option>
                    </select>
                    <button type="button" onClick={() => setSort(draftSort)}>{t(catalogue.sortButton)}</button>
                  </div>
                </div>
                <div className="expedition-grid">
                  {results.map((e) => (
                    <article className="expedition-card" key={e.slug}>
                      <div className="card-media">
                        <Image src={e.image} alt={t(e.imageAlt)} fill sizes="(max-width: 560px) 100vw, 180px" />
                        <span className="card-label">{t(e.label)}</span>
                      </div>
                      <div className="card-body">
                        <div className="card-location">{t(e.location)}</div>
                        <h3>{t(e.title)}</h3>
                        <p>{t(e.description)}</p>
                        <div className="card-meta"><span>{t(e.partner)}</span><span>{t(catalogue.maxPrefix)} {e.maxParticipants} {t(catalogue.participants)}</span></div>
                        <div className="card-price"><strong>{money(e.priceIdr)}</strong></div>
                        <Link className="card-link" href={detailHref(e)} aria-label={`${t(catalogue.detail)}: ${t(e.title)}`}>{t(catalogue.detail)} <span aria-hidden="true">↗</span></Link>
                      </div>
                    </article>
                  ))}
                  {results.length === 0 && (
                    <p>{t(catalogue.empty)} <button type="button" className="card-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={reset}>{t(catalogue.reset)}</button></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="impact" id="approach">
          <div className="shell impact-grid">
            <div><h2>{t(impact.h2)}</h2><p className="impact-copy">{t(impact.copy)}</p></div>
            <div className="impact-list">
              {impact.items.map((item) => (
                <div className="impact-item" key={item.icon}>
                  <svg className="impact-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{impactIcons[item.icon]}</svg>
                  <strong>{t(item.title)}</strong>
                  <p>{t(item.body)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="faq" id="faq">
          <div className="shell faq-grid">
            <div className="faq-lead"><h2>{t(faq.h2)}</h2><p>{t(faq.lede)}</p></div>
            <div>
              {faq.items.map((item, i) => (
                <details key={i}><summary>{t(item.q)}</summary><p>{t(item.a)}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta" id="contact">
          <div className="shell final-cta-inner">
            <div><h2>{t(cta.h2)}</h2><p>{t(cta.copy)}</p></div>
            <a className="button button-primary" href={waLink(cta.waText)} target="_blank" rel="noopener noreferrer">{t(cta.button)} <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
