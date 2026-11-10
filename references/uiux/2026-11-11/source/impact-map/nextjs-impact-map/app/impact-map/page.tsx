import type { Metadata } from 'next';
import ImpactMapView from '@/components/ImpactMapView';
import { JsonLd } from '@/lib/jsonld';
import { abs, SITE_NAME } from '@/lib/site';
import { faq, hero, seo } from '@/content/impact-map';

const path = '/impact-map';
const s = seo.id;

// Bahasa Indonesia = bahasa yang dirender di HTML statis (yang dibaca Google). Toggle EN berjalan di client.
export const metadata: Metadata = {
  title: { absolute: s.title },
  description: s.description,
  alternates: { canonical: path },
  openGraph: {
    title: s.title, description: s.description, url: abs(path), siteName: SITE_NAME, locale: 'id_ID', type: 'website',
    images: [{ url: hero.photo, width: 1600, height: 902, alt: hero.photoAlt.id }],
  },
  twitter: { card: 'summary_large_image', title: s.title, description: s.description, images: [hero.photo] },
};

export default function Page() {
  // Structured data dibangkitkan dari file content yang sama dengan teks di halaman, jadi FAQ schema = FAQ yang terlihat.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${abs(path)}#page`, url: abs(path), name: s.title, description: s.description, inLanguage: 'id', isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: abs('/') }, breadcrumb: { '@id': `${abs(path)}#breadcrumb` } },
      { '@type': 'BreadcrumbList', '@id': `${abs(path)}#breadcrumb`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beranda', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Peta Dampak', item: abs(path) },
      ] },
      { '@type': 'FAQPage', mainEntity: faq.items.map((x) => ({ '@type': 'Question', name: x.q.id, acceptedAnswer: { '@type': 'Answer', text: x.a.id } })) },
    ],
  };
  return <><JsonLd data={jsonLd} /><ImpactMapView /></>;
}
