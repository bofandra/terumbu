import type { Metadata } from "next";

import "@/app/globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Terumbu.eco",
    template: "%s | Terumbu.eco"
  },
  description:
    "Conservation funding, expeditions, academy learning, and verified impact tracking for Indonesia's coastal ecosystems.",
  openGraph: {
    type: "website",
    siteName: "Terumbu.eco",
    title: "Terumbu.eco",
    description:
      "Conservation funding, expeditions, academy learning, and verified impact tracking for Indonesia's coastal ecosystems.",
    url: appUrl
  },
  twitter: {
    card: "summary_large_image",
    title: "Terumbu.eco",
    description:
      "Conservation funding, expeditions, academy learning, and verified impact tracking for Indonesia's coastal ecosystems."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
