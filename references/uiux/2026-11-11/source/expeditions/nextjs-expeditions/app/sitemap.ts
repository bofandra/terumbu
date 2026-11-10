import type { MetadataRoute } from 'next';
import { abs } from '@/lib/site';
import { pramuka } from '@/content/pulau-pramuka';

export const dynamic = 'force-static';

// NOTE: if this is merged into the main app, merge these entries with the homepage sitemap instead of overwriting it.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: abs('/expeditions'), changeFrequency: 'weekly', priority: 0.9 },
    { url: abs(`/expeditions/${pramuka.slug}`), changeFrequency: 'monthly', priority: 0.8 },
  ];
}
