import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://terumbu.world/'),
  title: 'Ekspedisi Konservasi Pesisir Indonesia | Terumbu.eco',
  description: 'Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.eco.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Ekspedisi Konservasi Pesisir Indonesia | Terumbu.eco',
    description: 'Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.eco.',
    url: 'https://terumbu.world/',
    siteName: 'Terumbu.eco',
    locale: 'id_ID',
    type: 'website',
    images: [{ url: '/assets/Form-Main-Page.jpg', width: 1200, height: 630, alt: 'Penyelam menjelajahi terumbu karang berwarna-warni di Indonesia' }],
  },
  twitter: { card: 'summary_large_image', title: 'Ekspedisi Konservasi Pesisir Indonesia | Terumbu.eco', description: 'Ikuti ekspedisi konservasi, dukung proyek pesisir terverifikasi, dan pantau bukti dampak nyata bagi ekosistem Indonesia bersama Terumbu.eco.', images: ['/assets/Form-Main-Page.jpg'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
