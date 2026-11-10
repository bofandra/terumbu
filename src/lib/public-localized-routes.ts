import { headers } from "next/headers";
import type { SupportedLocale } from "@/lib/user-preferences";

/** Only these public content paths have localized, indexable URL aliases. */
export function isLocalizedPublicPath(path: string) {
  return path === "/" || path === "/expeditions" || path === "/impact-map" || /^\/expeditions\/[^/]+$/.test(path);
}

export function stripPublicLocale(path: string) {
  const unprefixed = path.replace(/^\/(?:en|id)(?=\/|$)/, "");
  return unprefixed || "/";
}

export function publicLocaleHref(locale: SupportedLocale, path: string) {
  const plain = stripPublicLocale(path);
  return isLocalizedPublicPath(plain) ? `/${locale}${plain === "/" ? "" : plain}` : plain;
}

export function publicLanguageAlternates(path: string) {
  return { en: publicLocaleHref("en", path), id: publicLocaleHref("id", path) };
}

export async function publicCanonicalPath(path: string) {
  const requestHeaders = await headers();
  const prefix = requestHeaders.get("x-terumbu-locale-prefix");
  return publicLocaleHref(prefix === "id" ? "id" : "en", path);
}
