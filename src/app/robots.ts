import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/partner", "/dashboard", "/corporate/dashboard"]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
