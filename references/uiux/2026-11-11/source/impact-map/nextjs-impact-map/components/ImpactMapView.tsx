'use client';

import Image from 'next/image';
import Link from 'next/link';
import '@/styles/impact-map.css';
import { usePrefs, useLocalizedMeta } from '@/lib/i18n';
import { SITES, cta, explorer, faq, hero, levels, notes, read, seo, stats } from '@/content/impact-map';
import { SiteFooter, SiteHeader, SkipLink } from './SiteChrome';
import ImpactExplorer from './ImpactExplorer';

const readIcons: Record<string, React.ReactNode> = {
  pin: <><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  shield: <><path d="m12 3 7 3v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" /><path d="M8 8h8M8 12h5" /></>,
  heart: <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" />,
};
const noteIcons: Record<string, React.ReactNode> = {
  cleanup: <><path d="M3 15c2.2-3 4.4-3 6.7 0s4.5 3 6.7 0 4.4-3 6.6 0" /><path d="M5 19c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" /><path d="M12 3v7M9 6l3-3 3 3" /></>,
  mangrove: <><path d="M12 21v-9" /><path d="M12 12c-4 0-6-2.5-6-6 4 0 6 2 6 6Z" /><path d="M12 14c3.5 0 6-2 6-5.5-3.5 0-6 2-6 5.5Z" /><path d="M6 21h12" /></>,
  pending: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export default function ImpactMapView() {
  const { t } = usePrefs();
  useLocalizedMeta(seo);

  return (
    <div className="pg-impact">
      <SkipLink />
      <SiteHeader />
      <main id="main">
        <section className="hero">
          <div className="shell hero-grid">
            <div>
              <h1>{t(hero.title)}</h1>
              <p className="hero-copy">{t(hero.copy)}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#peta">{t(hero.cta1)} <span aria-hidden="true">↘</span></a>
                <Link className="button button-secondary" href="/campaigns">{t(hero.cta2)}</Link>
              </div>
              <ul className="trust">{hero.trust.map((x) => <li key={x.id}>{t(x)}</li>)}</ul>
            </div>
            <figure className="hero-photo">
              <Image src={hero.photo} alt={t(hero.photoAlt)} fill priority sizes="(min-width: 821px) 55vw, 100vw" />
              <figcaption className="hero-caption"><strong>{t(hero.capTitle)}</strong><span>{t(hero.capBody)}</span></figcaption>
            </figure>
          </div>
        </section>

        <section className="stat-rail" aria-label={t(stats.aria)}>
          <div className="shell">
            <ul className="stat-list">
              {stats.items.map((s) => <li key={s.value + s.label.id}><strong>{s.value}</strong><span>{t(s.label)}</span></li>)}
            </ul>
            <p className="stat-note">{t(stats.note)}</p>
          </div>
        </section>

        <section className="explorer" id="peta">
          <div className="shell">
            <div className="section-head"><h2>{t(explorer.title)}</h2><p>{t(explorer.copy)}</p></div>
            <ImpactExplorer />
          </div>
        </section>

        <section className="notes">
          <div className="shell">
            <div className="section-head" style={{ marginBottom: 0 }}><h2>{t(notes.title)}</h2><p>{t(notes.copy)}</p></div>
            <div className="note-grid">
              {notes.items.map((n) => (
                <article className="note" key={n.id}>
                  <div className={`note-top${n.pending ? ' pending' : ''}`}><Icon>{noteIcons[n.icon]}</Icon><b>{n.big}</b></div>
                  <div className="note-body">
                    <div className="loc">{t(n.loc)}</div>
                    <h3>{t(n.title)}</h3>
                    <p>{t(n.body)}</p>
                    <Link href={SITES.find((x) => x.id === n.id)?.href ?? '/campaigns'}>{t(n.pending ? notes.project : notes.open)}</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="read" id="cara-baca">
          <div className="shell read-grid">
            <div className="read-lead"><h2>{t(read.title)}</h2><p>{t(read.copy)}</p></div>
            <ul className="read-list">
              {read.items.map((r) => (
                <li className="read-item" key={r.icon}><Icon>{readIcons[r.icon]}</Icon><strong>{t(r.title)}</strong><p>{t(r.body)}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="levels">
          <div className="shell">
            <h2>{t(levels.title)}</h2>
            <div className="level-grid">
              <div className="level-card"><h3>{t(levels.levelTitle)}</h3><p>{t(levels.levelBody)}</p><ul>{levels.levelList.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div className="level-card"><h3>{t(levels.recordTitle)}</h3><p>{t(levels.recordBody)}</p></div>
            </div>
          </div>
        </section>

        <section className="faq" id="faq">
          <div className="shell faq-grid">
            <div className="faq-lead"><h2>{t(faq.title)}</h2><p>{t(faq.copy)}</p></div>
            <div>{faq.items.map((i) => <details key={i.q.id}><summary>{t(i.q)}</summary><p>{t(i.a)}</p></details>)}</div>
          </div>
        </section>

        <section className="final-cta" id="contact">
          <div className="shell final-cta-inner">
            <div><h2>{t(cta.title)}</h2><p>{t(cta.copy)}</p></div>
            <div className="final-actions">
              <Link className="button button-lime" href="/campaigns">{t(cta.b1)} <span aria-hidden="true">↗</span></Link>
              <Link className="button button-secondary" href="/expeditions">{t(cta.b2)}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
