import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/campaigns",
    "/expeditions",
    "/academy",
    "/impact-map",
    "/about",
    "/login",
    "/signup",
    "/terms",
    "/privacy",
    "/donation-policy",
    "/refund-policy"
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date()
  }));
}
