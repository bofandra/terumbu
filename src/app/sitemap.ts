import type { MetadataRoute } from "next";

import { getPublicSitemapRecords, getPublishedDestinations } from "@/lib/queries";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, records] = await Promise.all([
    getPublishedDestinations(),
    getPublicSitemapRecords()
  ]);

  return [
    ...publicSitemapPaths.map((path) => ({
      url: `${baseUrl}${path}`,
      changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : 0.8
    })),
    ...destinations.map((destination) => ({
      url: `${baseUrl}/destinations/${destination.slug}`,
      lastModified: destination.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9
    })),
    ...records.expeditions.map((expedition) => ({
      url: `${baseUrl}/expeditions/${expedition.slug}`,
      lastModified: expedition.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9
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
