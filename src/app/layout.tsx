import type { Metadata } from "next";

import "@/app/globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.world";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Ekspedisi Konservasi Pesisir Indonesia | Terumbu.eco",
    template: "%s | Terumbu.eco"
  },
  description:
    "Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.eco.",
  openGraph: {
    type: "website",
    siteName: "Terumbu.eco",
    title: "Ekspedisi Konservasi Pesisir Indonesia | Terumbu.eco",
    description:
      "Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.eco.",
    locale: "id_ID",
    url: appUrl
  },
  twitter: {
    card: "summary_large_image",
    title: "Ekspedisi Konservasi Pesisir Indonesia | Terumbu.eco",
    description:
      "Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.eco."
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
