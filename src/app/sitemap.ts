import type { MetadataRoute } from "next";

import { getPublishedDestinations } from "@/lib/queries";

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
    "/login",
    "/terms",
    "/privacy",
    "/donation-policy",
    "/refund-policy"
  ] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const destinations = await getPublishedDestinations();

  return [
    ...publicSitemapPaths.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date()
    })),
    ...destinations.map((destination) => ({
      url: `${baseUrl}/destinations/${destination.slug}`,
      lastModified: destination.updatedAt
    }))
  ];
}
