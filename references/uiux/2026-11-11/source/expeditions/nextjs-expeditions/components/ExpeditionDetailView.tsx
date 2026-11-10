'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import '@/styles/expedition-detail.css';
import { usePrefs, useLocalizedMeta } from '@/lib/i18n';
import { waLink } from '@/lib/site';
import { pramuka as c } from '@/content/pulau-pramuka';
import { crumbs } from '@/content/expeditions-page';
import { SiteFooter, SiteHeader, SkipLink } from './SiteChrome';

function HeroGallery() {
  const { t } = usePrefs();
  const slides = c.hero.slides;
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => { if (timer.current) clearInterval(timer.current); timer.current = null; }, []);
  const start = useCallback(() => {
    stop();
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4500);
  }, [stop, slides.length]);

  useEffect(() => { start(); return stop; }, [start, stop]);

  return (
    <figure className="hero-image hero-gallery" aria-label={t(c.hero.galleryAria)} onMouseEnter={stop} onMouseLeave={start} onFocus={stop} onBlur={start}>
      {slides.map((s, i) => (
        <Image key={s.src} className={`gallery-slide${i === index ? ' is-active' : ''}`} src={s.src} alt={t(s.alt)} fill priority={i === 0} sizes="(max-width: 900px) 100vw, 40vw" aria-hidden={i === index ? undefined : true} />
      ))}
      <div className="hero-sticker"><span>{t(c.hero.stickerTop)}</span><small>{t(c.hero.stickerSub)}</small></div>
      <div className="gallery-dots" role="tablist" aria-label={t(c.hero.dotsAria)}>
        {slides.map((s, i) => (
          <button key={s.src} className={`gallery-dot${i === index ? ' is-active' : ''}`} type="button" role="tab" aria-label={t(c.hero.photoLabel(i + 1))} aria-selected={i === index} onClick={() => { setIndex(i); start(); }} />
        ))}
      </div>
    </figure>
  );
}

export default function ExpeditionDetailView() {
  const { t, money } = usePrefs();
  useLocalizedMeta(c.seo);

  return (
    <div className="pg-detail">
      <SkipLink />
      <SiteHeader />
      <main id="main">
        <nav className="shell crumbs" aria-label={t(c.breadcrumbAria)}>
          <Link href="/expeditions">{t(crumbs.expeditions)}</Link><span aria-hidden="true">/</span><span aria-current="page">{t(c.crumb)}</span>
        </nav>

        <section className="hero">
          <div className="shell hero-grid">
            <div>
              <div className="eyebrow">{t(c.hero.eyebrow)}</div>
              <h1>{t(c.hero.h1a)} <em>{t(c.hero.h1b)}</em></h1>
              <p className="hero-copy">{t(c.hero.copy)}</p>
              <div className="hero-actions">
                <a className="button button-sun" href="#contact">{t(c.hero.primary)} <span aria-hidden="true">↗</span></a>
                <Link className="button button-secondary" href="/expeditions">{t(c.hero.secondary)}</Link>
              </div>
            </div>
            <HeroGallery />
          </div>
        </section>

        <section className="facts-wrap" aria-label={t(c.facts.aria)}>
          <div className="shell facts">
            <div className="fact"><span className="fact-label">{t(c.facts.duration)}</span><strong>{t(c.facts.durationValue)}</strong></div>
            <div className="fact"><span className="fact-label">{t(c.facts.goodFor)}</span><strong>{t(c.facts.goodForValue)}</strong></div>
            <div className="fact"><span className="fact-label">{t(c.facts.focus)}</span><strong>{t(c.facts.focusValue)}</strong></div>
            <div className="fact"><span className="fact-label">{t(c.facts.price)}</span><strong>{money(c.priceIdr)}</strong> <small>{t(c.facts.perPerson)}</small></div>
          </div>
        </section>

        <section className="section intro">
          <div className="shell intro-grid">
            <div className="intro-lead"><h2>{t(c.intro.h2)}</h2></div>
            <div className="intro-copy">{c.intro.paragraphs.map((p, i) => <p key={i}>{t(p)}</p>)}</div>
          </div>
        </section>

        <section className="section itinerary" id="itinerary">
          <div className="shell itinerary-grid">
            <div className="itinerary-intro"><h2>{t(c.itinerary.h2)}</h2><p>{t(c.itinerary.lede)}</p></div>
            <div className="day-list">
              {c.itinerary.steps.map((s, i) => (
                <div className="day" key={i}>
                  <div className="day-number">{String(i + 1).padStart(2, '0')}</div>
                  <div><h3>{t(s.title)}</h3><p>{t(s.body)}</p></div>
                </div>
              ))}
              <p className="itinerary-note">{t(c.itinerary.note)}</p>
            </div>
          </div>
        </section>

        <section className="section prepare">
          <div className="shell">
            <div className="section-head"><h2>{t(c.prepare.h2)}</h2><p>{t(c.prepare.lede)}</p></div>
            <div className="prepare-grid">
              <article className="prepare-card"><h3>{t(c.prepare.needTitle)}</h3><ul>{c.prepare.need.map((x, i) => <li key={i}>{t(x)}</li>)}</ul></article>
              <article className="prepare-card"><h3>{t(c.prepare.helpTitle)}</h3><ul>{c.prepare.help.map((x, i) => <li key={i}>{t(x)}</li>)}</ul></article>
            </div>
          </div>
        </section>

        <section className="section impact" id="impact">
          <div className="shell impact-grid">
            <div>
              <h2>{t(c.impact.h2)}</h2>
              <p className="impact-copy">{t(c.impact.copy1)}</p>
              <p className="impact-copy">{t(c.impact.copy2)}</p>
              <Link className="impact-link" href="/#impact">{t(c.impact.link)}</Link>
            </div>
            <div className="impact-list">
              {c.impact.items.map((x, i) => <article className="impact-item" key={i}><strong>{t(x.title)}</strong><p>{t(x.body)}</p></article>)}
            </div>
          </div>
        </section>

        <section className="section faq" id="faq">
          <div className="shell faq-grid">
            <div className="faq-lead"><h2>{t(c.faq.h2)}</h2><p>{t(c.faq.lede)}</p></div>
            <div>{c.faq.items.map((x, i) => <details key={i}><summary>{t(x.q)}</summary><p>{t(x.a)}</p></details>)}</div>
          </div>
        </section>

        <section className="section final-cta" id="contact">
          <div className="shell final-cta-inner">
            <div><h2>{t(c.cta.h2)}</h2><p>{t(c.cta.copy)}</p></div>
            <a className="button button-sun" href={waLink(c.cta.waText)} target="_blank" rel="noopener noreferrer"><span>{t(c.cta.button)}</span> <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
