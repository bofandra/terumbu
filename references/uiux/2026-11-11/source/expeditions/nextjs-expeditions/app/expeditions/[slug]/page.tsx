import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExpeditionDetailView from '@/components/ExpeditionDetailView';
import { JsonLd } from '@/lib/jsonld';
import { abs, SITE_NAME } from '@/lib/site';
import { pramuka } from '@/content/pulau-pramuka';

// Only slugs listed here are built (static export). Add new detail pages here + in content/.
export const dynamicParams = false;
export function generateStaticParams() { return [{ slug: pramuka.slug }]; }

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== pramuka.slug) return {};
  const path = `/expeditions/${slug}`;
  const seo = pramuka.seo.id;
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: path },
    openGraph: {
      title: seo.title, description: pramuka.ogDescription.id, url: abs(path), siteName: SITE_NAME, locale: 'id_ID', type: 'article',
      images: [{ url: pramuka.ogImage, width: 1599, height: 899, alt: pramuka.ogImageAlt.id }],
    },
    twitter: { card: 'summary_large_image', title: seo.title, description: pramuka.ogDescription.id, images: [pramuka.ogImage] },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (slug !== pramuka.slug) notFound();
  const path = `/expeditions/${slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristTrip', '@id': `${abs(path)}#trip`, name: pramuka.jsonLdName, description: pramuka.jsonLdDescription, url: abs(path), inLanguage: 'id',
        image: pramuka.hero.slides.map((s) => abs(s.src)),
        touristType: ['School groups', 'Families', 'Community groups'],
        itinerary: { '@type': 'Place', name: 'Pulau Pramuka, Kepulauan Seribu', address: { '@type': 'PostalAddress', addressRegion: 'DKI Jakarta', addressCountry: 'ID' } },
        provider: { '@type': 'Organization', name: SITE_NAME, url: abs('/') },
        offers: { '@type': 'Offer', url: abs(path), price: String(pramuka.priceIdr), priceCurrency: 'IDR', description: 'Contoh harga mulai per peserta; harga final mengikuti kebutuhan kelompok.' },
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ekspedisi', item: abs('/expeditions') },
        { '@type': 'ListItem', position: 2, name: pramuka.jsonLdName, item: abs(path) },
      ] },
      { '@type': 'FAQPage', mainEntity: pramuka.faq.items.map((x) => ({ '@type': 'Question', name: x.q.id, acceptedAnswer: { '@type': 'Answer', text: x.a.id } })) },
    ],
  };
  return <><JsonLd data={jsonLd} /><ExpeditionDetailView /></>;
}
