// Single source of truth for canonical URLs. Change SITE_URL here (or via NEXT_PUBLIC_SITE_URL) if the final domain is terumbu.eco.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://terumbu.world').replace(/\/$/, '');
export const SITE_NAME = 'Terumbu.eco';
export const WHATSAPP = '6281284505927'; // TODO(client): confirm number before publish
export const waLink = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
export const abs = (path: string) => `${SITE_URL}${path}`;
