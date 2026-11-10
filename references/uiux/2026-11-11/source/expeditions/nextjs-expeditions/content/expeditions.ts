import { T, type L } from '@/lib/bilingual';

export type Expedition = {
  slug: string;
  /** false = card links to the closest existing detail page until its own page is written */
  hasOwnDetailPage: boolean;
  image: string;
  imageAlt: L;
  label: L;
  location: L;
  title: L;
  description: L;
  partner: L;
  maxParticipants: number;
  priceIdr: number;
  /** undefined = not confirmed by client yet */
  durationDays?: number;
};

const verified = T('Mitra lokal terverifikasi', 'Verified local partner');

export const expeditions: Expedition[] = [
  {
    slug: 'pulau-pramuka',
    hasOwnDetailPage: true,
    image: '/assets/expeditions/boat-group.jpeg',
    imageAlt: T('Sekelompok peserta naik perahu di sekitar Pulau Pramuka', 'A group of participants on a boat around Pramuka Island'),
    label: T('Pulau dan terumbu', 'Islands and reefs'),
    location: T('Pulau Pramuka · Kepulauan Seribu', 'Pramuka Island · Thousand Islands'),
    title: T('Ekspedisi belajar laut', 'Coastal learning trip'),
    description: T('Jalan di kampung, melihat mangrove, lalu mengenal terumbu di perairan dangkal bersama pemandu dan warga.', 'Walk through the village, see the mangroves, then meet the shallow reef with a local guide and residents.'),
    partner: verified, maxParticipants: 12, priceIdr: 750000, durationDays: 1,
  },
  {
    slug: 'mangrove-penjaga',
    hasOwnDetailPage: false,
    image: '/assets/expeditions/mangrove-conservation-2026.jpg',
    imageAlt: T('Peserta berjalan di area konservasi mangrove', 'Participants walking through a mangrove conservation area'),
    label: T('Mangrove dan pesisir', 'Mangroves and coasts'),
    location: T('Lokasi pesisir · Indonesia', 'Coastal site · Indonesia'),
    title: T('Sehari bersama penjaga mangrove', 'A day with mangrove stewards'),
    description: T('Masuk ke area mangrove, dengar cerita orang yang merawatnya, lalu ikut kegiatan yang sedang berjalan hari itu.', 'Step into the mangroves, hear from the people who care for them, and join the work happening that day.'),
    partner: verified, maxParticipants: 10, priceIdr: 425000, durationDays: 1,
  },
  {
    slug: 'kenalan-terumbu',
    hasOwnDetailPage: false,
    image: '/assets/expeditions/snorkel-group-poster.jpg',
    imageAlt: T('Sekelompok peserta bersiap mengikuti kegiatan snorkeling dengan pemandu', 'A group of participants getting ready to snorkel with a guide'),
    label: T('Pulau dan terumbu', 'Islands and reefs'),
    location: T('Destinasi laut · Indonesia', 'Marine destination · Indonesia'),
    title: T('Kenalan dengan terumbu', 'Meet the reef'),
    description: T('Snorkeling pelan-pelan bersama pemandu. Kenali biota lautnya dan pelajari cara berkunjung tanpa menginjak karang.', 'Snorkel slowly with a guide, meet the marine life, and learn how to visit without stepping on coral.'),
    partner: verified, maxParticipants: 8, priceIdr: 575000,
  },
];

/** Route used by a card's "Lihat detail" link. */
export const detailHref = (e: Expedition) => `/expeditions/${e.hasOwnDetailPage ? e.slug : 'pulau-pramuka'}`;
