'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CURRENCIES, T, usePrefs, type Currency, type Locale } from '@/lib/i18n';

const nav = {
  skip: T('Langsung ke isi', 'Skip to content'),
  main: T('Navigasi utama', 'Main navigation'),
  expeditions: T('Ekspedisi Konservasi', 'Conservation Expeditions'),
  campaigns: T('Dukung Kampanye', 'Support Campaigns'),
  impact: T('Jejak Dampak', 'Impact Trail'),
  academy: T('Terumbu Academy', 'Terumbu Academy'),
  language: T('Pilih bahasa', 'Choose language'),
  currency: T('Pilih mata uang', 'Choose currency'),
  plan: T('Rencanakan perjalanan', 'Plan your trip'),
  logo: T('Logo Terumbu.eco, ke beranda', 'Terumbu.eco logo, back to homepage'),
  logoAlt: T('Logo Terumbu.eco', 'Terumbu.eco logo'),
  tagline: T('Pendanaan konservasi, pengalaman lapangan, pembelajaran, dan rekam dampak terverifikasi untuk ekosistem pesisir Indonesia.', 'Conservation funding, field experiences, learning, and verified impact records for Indonesia’s coastal ecosystems.'),
  platform: T('Platform', 'Platform'),
  about: T('Tentang Kami', 'About Us'),
  join: T('Gabung Terumbu', 'Join Terumbu'),
  business: T('Bisnis & Korporasi', 'Business & Corporate'),
  partners: T('Mitra Kami', 'Our Partners'),
  privacy: T('Kebijakan Privasi & Transparansi', 'Privacy & Transparency'),
  copyright: T('© 2026 Terumbu Lestari Nusantara', '© 2026 Terumbu Lestari Nusantara'),
};

export function SkipLink() {
  const { t } = usePrefs();
  return <a className="skip" href="#main">{t(nav.skip)}</a>;
}

export function SiteHeader() {
  const { t, locale, setLocale, currency, setCurrency, rateTitle } = usePrefs();
  return (
    <header className="site-header">
      <div className="shell nav">
        <Link className="wordmark" href="/" aria-label={t(nav.logo)}>
          <Image src="/assets/terumbu-logo.png" alt={t(nav.logoAlt)} width={2560} height={514} priority />
        </Link>
        <nav className="nav-links" aria-label={t(nav.main)}>
          <Link href="/expeditions">{t(nav.expeditions)}</Link>
          <Link href="/#campaigns">{t(nav.campaigns)}</Link>
          <Link href="/impact-map">{t(nav.impact)}</Link>
          <Link href="/#academy">{t(nav.academy)}</Link>
        </nav>
        <div className="nav-controls">
          <label className="select-control">
            <span className="sr-only">{t(nav.language)}</span>
            <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} aria-label={t(nav.language)}>
              <option value="id">ID</option>
              <option value="en">EN</option>
            </select>
          </label>
          <label className="select-control">
            <span className="sr-only">{t(nav.currency)}</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} aria-label={t(nav.currency)} title={rateTitle}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <Link className="nav-cta" href="/expeditions"><span>{t(nav.plan)}</span> <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = usePrefs();
  return (
    <footer className="footer" id="footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label={t(nav.logoAlt)}>
            <Image src="/assets/terumbu-logo.png" alt={t(nav.logoAlt)} width={2560} height={514} />
          </Link>
          <p>{t(nav.tagline)}</p>
        </div>
        <nav className="footer-column" aria-label={t(nav.platform)}>
          <p className="footer-label">{t(nav.platform)}</p>
          <Link href="/expeditions">{t(nav.expeditions)}</Link>
          <Link href="/#campaigns">{t(nav.campaigns)}</Link>
          <Link href="/impact-map">{t(nav.impact)}</Link>
          <Link href="/#academy">{t(nav.academy)}</Link>
        </nav>
        {/* TODO(engineer): these four point to the homepage contact section until the real pages exist */}
        <nav className="footer-column" aria-label={t(nav.about)}>
          <p className="footer-label">{t(nav.about)}</p>
          <Link href="/#contact">{t(nav.join)}</Link>
          <Link href="/#contact">{t(nav.business)}</Link>
          <Link href="/#contact">{t(nav.partners)}</Link>
          <Link href="/#contact">{t(nav.privacy)}</Link>
        </nav>
      </div>
      <div className="shell footer-bottom"><span>{t(nav.copyright)}</span></div>
    </footer>
  );
}
