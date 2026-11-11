/**
 * Crawlable bilingual URLs for Terumbu's first public acquisition journeys.
 * Keep legacy paths as non-index-primary compatibility routes and do not prefix
 * unrelated authenticated, corporate, checkout, admin or API routes.
 */
export type PublicSeoLocale = "en" | "id";

const publicSeoLandingPaths = new Set(["/", "/expeditions", "/impact-map"]);

export function isPublicSeoPath(path: string): boolean {
  return publicSeoLandingPaths.has(path) || /^\/expeditions\/[^/?#]+$/.test(path);
}

export function resolveLocalizedPublicPath(pathname: string): { locale: PublicSeoLocale; path: string } | null {
  const match = /^\/(en|id)(?:\/(expeditions(?:\/[^/]+)?|impact-map))?\/?$/.exec(pathname);
  if (!match) return null;
  const locale = match[1] as PublicSeoLocale;
  const path = match[2] ? `/${match[2]}` : "/";
  return isPublicSeoPath(path) ? { locale, path } : null;
}

export function localizedSeoPath(path: string, locale: PublicSeoLocale): string {
  if (!isPublicSeoPath(path)) throw new Error(`Not a public bilingual SEO path: ${path}`);
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function publicLocaleHref(href: string, locale: PublicSeoLocale): string {
  const match = /^([^?#]*)([?#].*)?$/.exec(href);
  if (!match || !isPublicSeoPath(match[1])) return href;
  return localizedSeoPath(match[1], locale) + (match[2] ?? "");
}

export function publicSeoAlternates(path: string): Record<PublicSeoLocale | "x-default", string> {
  return {
    en: localizedSeoPath(path, "en"),
    id: localizedSeoPath(path, "id"),
    "x-default": localizedSeoPath(path, "en")
  };
}
