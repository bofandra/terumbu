import type { Metadata } from "next";

import "@/app/globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.world";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Ekspedisi Konservasi Pesisir Indonesia | Terumbu.world",
    template: "%s | Terumbu.world"
  },
  description:
    "Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.world.",
  openGraph: {
    type: "website",
    siteName: "Terumbu.world",
    title: "Ekspedisi Konservasi Pesisir Indonesia | Terumbu.world",
    description:
      "Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.world.",
    locale: "id_ID",
    url: appUrl
  },
  twitter: {
    card: "summary_large_image",
    title: "Ekspedisi Konservasi Pesisir Indonesia | Terumbu.world",
    description:
      "Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.world."
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
