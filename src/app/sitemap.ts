import type { MetadataRoute } from "next";

import { getPublicSitemapRecords, getPublishedDestinations } from "@/lib/queries";
import { localizedSeoPath, publicSeoAlternates } from "@/lib/public-locale-routing";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.world";

export const dynamic = "force-dynamic";

export const publicSitemapPaths = [
  "",
  "/campaigns",
  "/expeditions",
  "/destinations",
  "/academy",
  "/impact-map",
  "/platform",
  "/community",
  "/about",
  "/terms",
  "/privacy",
  "/donation-policy",
  "/refund-policy"
] as const;

const indexedLocalePages = ["/", "/expeditions", "/impact-map"] as const;
const seoLanguages = (path: string) => Object.fromEntries(
  Object.entries(publicSeoAlternates(path)).map(([key, href]) => [key, new URL(href, baseUrl).toString()])
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, records] = await Promise.all([
    getPublishedDestinations(),
    getPublicSitemapRecords()
  ]);

  return [
    ...publicSitemapPaths.filter((path) => !indexedLocalePages.includes((path || "/") as (typeof indexedLocalePages)[number])).map((path) => ({
      url: `${baseUrl}${path}`,
      changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : 0.8
    })),
    ...indexedLocalePages.flatMap((path) => (["en", "id"] as const).map((locale) => ({
      url: new URL(localizedSeoPath(path, locale), baseUrl).toString(),
      alternates: { languages: seoLanguages(path) },
      changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
      priority: path === "/" ? 1 : 0.9
    }))),
    ...destinations.map((destination) => ({
      url: `${baseUrl}/destinations/${destination.slug}`,
      lastModified: destination.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9
    })),
    ...records.expeditions.flatMap((expedition) => (["en", "id"] as const).map((locale) => {
      const path = `/expeditions/${expedition.slug}`;
      return {
        url: new URL(localizedSeoPath(path, locale), baseUrl).toString(),
        lastModified: expedition.updatedAt,
        alternates: { languages: seoLanguages(path) },
        changeFrequency: "weekly" as const,
        priority: 0.9
      };
    })),
    ...records.campaigns.map((campaign) => ({
      url: `${baseUrl}/campaigns/${campaign.slug}`,
      lastModified: campaign.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
    ...records.courses.map((course) => ({
      url: `${baseUrl}/academy/courses/${course.slug}`,
      lastModified: course.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7
    })),
    ...records.partners.map((partner) => ({
      url: `${baseUrl}/partners/${partner.slug}`,
      lastModified: partner.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7
    }))
  ];
}
