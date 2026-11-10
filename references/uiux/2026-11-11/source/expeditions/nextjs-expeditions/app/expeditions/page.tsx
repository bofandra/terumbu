import type { Metadata } from 'next';
import ExpeditionsView from '@/components/ExpeditionsView';
import { JsonLd } from '@/lib/jsonld';
import { abs, SITE_NAME } from '@/lib/site';
import { expeditions } from '@/content/expeditions';
import { faq, hero, listSeo } from '@/content/expeditions-page';

const path = '/expeditions';
const seo = listSeo.id;

export const metadata: Metadata = {
  title: { absolute: seo.title },
  description: seo.description,
  alternates: { canonical: path },
  openGraph: {
    title: seo.title, description: seo.description, url: abs(path), siteName: SITE_NAME, locale: 'id_ID', type: 'website',
    images: [{ url: hero.photo, width: 1280, height: 960, alt: hero.photoAlt.id }],
  },
  twitter: { card: 'summary_large_image', title: seo.title, description: seo.description, images: [hero.photo] },
};

export default function Page() {
  // Structured data is generated from the same content the page renders, so it cannot drift from the visible text.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${abs(path)}#page`, url: abs(path), name: seo.title, description: seo.description, inLanguage: 'id', isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: abs('/') } },
      {
        '@type': 'ItemList', name: 'Ekspedisi Terumbu', itemListElement: expeditions.map((e, i) => ({
          '@type': 'ListItem', position: i + 1, url: abs(`/expeditions/${e.hasOwnDetailPage ? e.slug : 'pulau-pramuka'}`),
          name: e.title.id,
        })),
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beranda', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Ekspedisi', item: abs(path) },
      ] },
      { '@type': 'FAQPage', mainEntity: faq.items.map((x) => ({ '@type': 'Question', name: x.q.id, acceptedAnswer: { '@type': 'Answer', text: x.a.id } })) },
    ],
  };
  return <><JsonLd data={jsonLd} /><ExpeditionsView /></>;
}
