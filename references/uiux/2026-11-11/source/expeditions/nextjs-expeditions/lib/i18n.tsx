'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { L } from './bilingual';
export { T, type L } from './bilingual';

export type Locale = 'id' | 'en';
export type Currency = 'IDR' | 'USD' | 'JPY' | 'EUR';

const FALLBACK_RATES: Record<Currency, number> = { IDR: 1, USD: 0.000055, JPY: 0.008772, EUR: 0.000049 };
const CURRENCY_LOCALES: Record<Currency, string> = { IDR: 'id-ID', USD: 'en-US', JPY: 'ja-JP', EUR: 'de-DE' };
export const CURRENCIES: Currency[] = ['IDR', 'USD', 'JPY', 'EUR'];

type Prefs = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** pick the active language from a bilingual value */
  t: <V>(v: L<V>) => V;
  /** format an IDR amount in the selected currency using the latest rate */
  money: (idr: number) => string;
  rateTitle: string;
};

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id');
  const [currency, setCurrencyState] = useState<Currency>('IDR');
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);
  const [rateState, setRateState] = useState<{ date: string; fallback: boolean }>({ date: '', fallback: false });

  // restore saved preferences after hydration (server always renders ID + IDR)
  useEffect(() => {
    try {
      const l = localStorage.getItem('terumbu-locale');
      if (l === 'id' || l === 'en') setLocaleState(l);
      const c = localStorage.getItem('terumbu-currency') as Currency | null;
      if (c && CURRENCIES.includes(c)) setCurrencyState(c);
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  // latest exchange rate with fallback
  useEffect(() => {
    const controller = new AbortController();
    fetch('https://open.er-api.com/v6/latest/IDR', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.result !== 'success' || !data?.rates) throw new Error('bad rate response');
        const next = { ...FALLBACK_RATES };
        (['USD', 'JPY', 'EUR'] as const).forEach((code) => { const v = Number(data.rates[code]); if (Number.isFinite(v)) next[code] = v; });
        setRates(next);
        setRateState({ date: new Date((data.time_last_update_unix || Date.now() / 1000) * 1000).toISOString(), fallback: false });
      })
      .catch((e) => { if (e?.name !== 'AbortError') setRateState({ date: '', fallback: true }); });
    return () => controller.abort();
  }, []);

  const setLocale = useCallback((l: Locale) => { setLocaleState(l); try { localStorage.setItem('terumbu-locale', l); } catch { /* ignore */ } }, []);
  const setCurrency = useCallback((c: Currency) => { setCurrencyState(c); try { localStorage.setItem('terumbu-currency', c); } catch { /* ignore */ } }, []);

  const value = useMemo<Prefs>(() => {
    const money = (idr: number) =>
      new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
        style: 'currency', currency,
        maximumFractionDigits: currency === 'IDR' || currency === 'JPY' ? 0 : 2,
      }).format(idr * rates[currency]);
    const label = locale === 'en' ? 'Latest exchange rate' : 'Kurs terbaru';
    const rateTitle = rateState.fallback
      ? (locale === 'en' ? 'Using fallback exchange rate' : 'Menggunakan kurs cadangan')
      : rateState.date ? `${label} · ${new Date(rateState.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}` : label;
    return { locale, setLocale, currency, setCurrency, t: (v) => v[locale], money, rateTitle };
  }, [locale, currency, rates, rateState, setLocale, setCurrency]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}

/** Keeps <title> and meta description in sync with the language toggle (static HTML always ships Indonesian). */
export function useLocalizedMeta(meta: L<{ title: string; description: string }>) {
  const { locale } = usePrefs();
  useEffect(() => {
    const m = meta[locale];
    document.title = m.title;
    const set = (sel: string, v: string) => document.head.querySelector<HTMLMetaElement>(sel)?.setAttribute('content', v);
    set('meta[name="description"]', m.description);
    set('meta[property="og:title"]', m.title);
    set('meta[property="og:description"]', m.description);
    set('meta[property="og:locale"]', locale === 'id' ? 'id_ID' : 'en_US');
    set('meta[name="twitter:title"]', m.title);
    set('meta[name="twitter:description"]', m.description);
  }, [locale, meta]);
}
