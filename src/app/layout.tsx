import type { Metadata } from "next";

import "@/app/globals.css";
import { getPreferredLocale } from "@/lib/user-preferences";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.world";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Conservation Expeditions in Indonesia | Terumbu.world",
    template: "%s | Terumbu.world"
  },
  description:
    "Explore conservation expeditions in Indonesia, support coastal projects, and follow evidence of ecological impact with Terumbu.world.",
  openGraph: {
    type: "website",
    siteName: "Terumbu.world",
    title: "Conservation Expeditions in Indonesia | Terumbu.world",
    description:
      "Explore conservation expeditions in Indonesia, support coastal projects, and follow evidence of ecological impact with Terumbu.world.",
    locale: "en_US",
    url: appUrl
  },
  twitter: {
    card: "summary_large_image",
    title: "Conservation Expeditions in Indonesia | Terumbu.world",
    description:
      "Explore conservation expeditions in Indonesia, support coastal projects, and follow evidence of ecological impact with Terumbu.world."
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getPreferredLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
