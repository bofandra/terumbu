import type { MetadataRoute } from 'next';
import { abs } from '@/lib/site';

export const dynamic = 'force-static';

// NOTE: jika digabung ke app utama, gabungkan entri ini dengan sitemap yang sudah ada (jangan menimpa).
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: abs('/impact-map'), changeFrequency: 'weekly', priority: 0.8 }];
}
