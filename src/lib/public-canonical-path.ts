import "server-only";
import { headers } from "next/headers";
import { publicLocaleHref } from "@/lib/public-localized-routes";

export async function publicCanonicalPath(path: string) {
  const requestHeaders = await headers();
  const prefix = requestHeaders.get("x-terumbu-locale-prefix");
  return publicLocaleHref(prefix === "id" ? "id" : "en", path);
}
