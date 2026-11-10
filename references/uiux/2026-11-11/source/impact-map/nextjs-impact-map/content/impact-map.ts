import { T, type L } from '@/lib/bilingual';

/**
 * Semua copy halaman /impact-map (ID = bahasa sumber, EN = terjemahan dari ID) dan data lokasi.
 * Angka & lokasi di bawah mengikuti halaman live https://terumbu.world/impact-map (10 Nov 2026).
 * TODO(engineer): ganti SITES dan STATS dengan data dari DB (getImpactMapSites / getImpactStats).
 */

export const seo: L<{ title: string; description: string }> = {
  id: {
    title: 'Peta Dampak Konservasi Pesisir Indonesia | Terumbu.eco',
    description: 'Lihat lokasi konservasi pesisir Indonesia, baca catatan dari lapangan, dan cek status verifikasi restorasi mangrove, terumbu karang, serta bersih pantai bersama Terumbu.eco.',
  },
  en: {
    title: 'Coastal Conservation Impact Map in Indonesia | Terumbu.eco',
    description: 'Explore coastal conservation sites in Indonesia, read field notes, and check the verification status of mangrove, coral, and beach cleanup work with Terumbu.eco.',
  },
};

export const hero = {
  title: T('Lihat langsung dampak konservasi di pesisir Indonesia', 'Trace conservation impact along Indonesia’s coast'),
  copy: T(
    'Dari bersih pantai di Komodo sampai persemaian mangrove di Bali Utara. Lihat di mana kegiatannya, baca catatan dari lapangan, dan cek sendiri mana yang sudah terverifikasi.',
    'From beach cleanups in Komodo to mangrove nurseries in North Bali: see where the work happens, read the field notes, and check the verification status yourself.',
  ),
  cta1: T('Jelajahi peta', 'Explore the map'),
  cta2: T('Dukung kampanye', 'Support a campaign'),
  trust: [
    T('Posisi di peta sengaja diperkirakan', 'Public locations are approximate'),
    T('Setiap catatan bisa dilacak sumbernya', 'Field notes can be traced back'),
    T('Data dari catatan proyek yang sudah dipublikasikan', 'Data comes from published project records'),
  ],
  photo: '/assets/impact/mangrove-conservation-2026.jpg',
  photoAlt: T('Peserta berjalan di area konservasi mangrove bersama pemandu lokal', 'Participants walking through a mangrove conservation area with a local guide'),
  capTitle: T('Dari lapangan, langsung ke layarmu', 'From the field to your screen'),
  capBody: T('Tiap pin di peta terhubung ke catatan kegiatan yang bisa kamu buka kapan saja.', 'Every pin on the map links to an activity record you can open again.'),
};

/** Statistik rail. Hanya angka yang sudah ada di halaman live; jangan tambah angka tanpa sumber terverifikasi. */
export const stats = {
  aria: T('Ringkasan peta dampak', 'Impact map summary'),
  items: [
    { value: '3', label: T('lokasi konservasi di peta', 'public conservation sites') },
    { value: '2', label: T('lokasi yang buktinya sudah terverifikasi', 'sites with verified evidence') },
    { value: '1', label: T('lokasi yang catatannya masih ditinjau', 'site with a record in review') },
    { value: '420 kg', label: T('sampah terpilah di Rute Bersih Pantai Komodo', 'of waste sorted on the Komodo Cleanup Route') },
  ],
  note: T(
    'Angka diambil dari catatan proyek yang sudah dipublikasikan. Yang masih ditinjau tidak kami hitung sebagai terverifikasi.',
    'Figures follow published project records. Anything still awaiting review is not counted as verified.',
  ),
};

export type ActivityType = 'cleanup' | 'mangrove' | 'coral';
export type Site = {
  id: string;
  name: string;
  type: ActivityType;
  /** koordinat sengaja dibulatkan (perkiraan) demi keamanan kawasan sensitif */
  lat: number;
  lng: number;
  status: 'verified' | 'review';
  progress: number;
  region: L;
  level: string;
  latest: L;
  metric: L;
  survey: L | null;
  /** TODO(engineer): ganti ke route catatan/proyek yang benar dari DB */
  href: string;
};

export const SITES: Site[] = [
  {
    id: 'komodo', name: 'Komodo Cleanup Route', type: 'cleanup', lat: -8.5, lng: 119.5, status: 'verified', progress: 48,
    region: T('Nusa Tenggara Timur', 'East Nusa Tenggara'), level: 'Basic verified',
    latest: T('Peluncuran bersih pantai sekolah Komodo', 'Komodo school cleanup launch'),
    metric: T('Sampah dipilah: 420 kg', 'Waste sorted: 420 kg'), survey: T('19 Sep 2026', '19 Sep 2026'),
    href: '/campaigns/cleanup-komodo-coast',
  },
  {
    id: 'bali', name: 'North Bali Mangrove Belt', type: 'mangrove', lat: -8.1, lng: 115.1, status: 'verified', progress: 61,
    region: T('Bali', 'Bali'), level: 'Document verified',
    latest: T('Audit persemaian mangrove Bali Utara', 'North Bali mangrove nursery audit'),
    metric: T('Tingkat hidup: 89%', 'Survival rate: 89%'), survey: null,
    href: '/campaigns/mangrove-shield-bali',
  },
  {
    id: 'raja', name: 'Raja Ampat Reef Garden', type: 'coral', lat: -0.6, lng: 130.5, status: 'review', progress: 72,
    region: T('Papua Barat Daya', 'Southwest Papua'), level: 'Field verified',
    latest: T('Monitoring menunggu peninjauan', 'Monitoring activity awaiting review'),
    metric: T('Bukti lapangan masih menunggu verifikasi', 'Awaiting verified field evidence'), survey: null,
    href: '/campaigns/restore-raja-ampat-reefs',
  },
];

export const explorer = {
  title: T('Cari proyek sesuai jenis kegiatan dan status buktinya', 'Find projects by activity type and evidence status'),
  copy: T(
    'Klik pin atau pilih dari daftar untuk melihat detailnya. Posisi di peta sengaja kami perkirakan supaya kawasan yang sensitif tetap aman.',
    'Pick a pin or a site in the list to open its details. Map positions are intentionally approximate to protect sensitive areas.',
  ),
  filters: T('Filter peta', 'Map filters'),
  filtersSub: T('Pilih yang mau ditampilkan', 'Narrow down the sites shown'),
  type: T('Jenis kegiatan', 'Activity type'),
  status: T('Status bukti', 'Evidence status'),
  list: T('Daftar lokasi', 'Site list'),
  empty: T('Belum ada lokasi yang cocok. Coba ganti filternya.', 'No sites match these filters yet. Try changing them.'),
  noMap: T('Petanya belum bisa dimuat. Kamu tetap bisa melihat detail proyek lewat daftar lokasi.', 'The map could not load. Use the site list to see each project’s details.'),
  mapLabel: T('Peta lokasi konservasi pesisir Indonesia', 'Map of coastal conservation sites in Indonesia'),
  legendOk: T('Catatan terverifikasi', 'Verified record'),
  legendReview: T('Catatan masih ditinjau', 'Record in review'),
  all: T('Semua', 'All'),
  types: { cleanup: T('Bersih pantai', 'Beach cleanup'), mangrove: T('Mangrove', 'Mangrove'), coral: T('Terumbu karang', 'Coral') },
  statuses: { verified: T('Terverifikasi', 'Verified'), review: T('Masih ditinjau', 'Needs review') },
  sitesCount: (n: number): L => ({ id: `${n} lokasi`, en: `${n} ${n === 1 ? 'site' : 'sites'}` }),
  milestone: T('Progres milestone', 'Milestone progress'),
  level: T('Level verifikasi proyek', 'Project verification level'),
  records: T('Catatan aktivitas', 'Activity records'),
  recVerified: T('1 terverifikasi', '1 verified'),
  recReview: T('1 masih ditinjau', '1 in review'),
  latest: T('Aktivitas terbaru', 'Latest activity'),
  survey: T('Survei terakhir', 'Latest survey'),
  openSource: T('Buka catatan sumber', 'Open source record'),
  viewProject: T('Lihat proyek', 'View project'),
  support: T('Dukung proyek ini', 'Support this project'),
  progress: T('progres', 'progress'),
};

export const notes = {
  title: T('Catatan dari lapangan', 'Field notes you can trace'),
  copy: T('Setiap catatan memuat satu angka atau temuan dari lapangan, lengkap dengan status verifikasinya.', 'Each note links field activity to one number or finding, together with its verification status.'),
  open: T('Buka catatan sumber ↗', 'Open source record ↗'),
  project: T('Lihat proyek ↗', 'View project ↗'),
  items: [
    { id: 'komodo', big: '420 kg', icon: 'cleanup', loc: T('Nusa Tenggara Timur · terverifikasi', 'East Nusa Tenggara · verified'), title: T('Peluncuran bersih pantai sekolah Komodo', 'Komodo school cleanup launch'), body: T('Sampah yang berhasil dipilah di Rute Bersih Pantai Komodo, dengan survei terakhir tercatat 19 September 2026.', 'Waste sorted on the Komodo Cleanup Route. Latest survey recorded on 19 September 2026.'), pending: false },
    { id: 'bali', big: '89%', icon: 'mangrove', loc: T('Bali · terverifikasi', 'Bali · verified'), title: T('Audit persemaian mangrove Bali Utara', 'North Bali mangrove nursery audit'), body: T('Berapa persen bibit mangrove di persemaian yang bertahan hidup. Ini kabar terbaru yang sudah dipublikasikan untuk sabuk mangrove Bali Utara.', 'Survival rate of mangrove seedlings in the nursery. This is the latest published update for the North Bali mangrove belt.'), pending: false },
    { id: 'raja', big: 'Review', icon: 'pending', loc: T('Papua Barat Daya · masih ditinjau', 'Southwest Papua · in review'), title: T('Taman Terumbu Raja Ampat', 'Raja Ampat Reef Garden'), body: T('Kegiatan monitoring sudah tercatat, tapi bukti lapangannya masih kami tinjau. Statusnya akan berubah jadi terverifikasi setelah selesai.', 'Monitoring activity is recorded, but its field evidence is still being reviewed. We will mark it verified once that is done.'), pending: true },
  ],
};

export const read = {
  title: T('Baca dampaknya lewat konteks, bukan cuma angka', 'How to read impact calmly, beyond the numbers'),
  copy: T('Angka besar itu gampang dibuat. Makanya di tiap lokasi kami tunjukkan juga status bukti, waktu survei, dan catatan kegiatannya.', 'Big numbers are easy to produce. So each site also shows its evidence status, survey timing, and activity notes.'),
  items: [
    { icon: 'pin', title: T('Mulai dari tempatnya', 'Start with the place'), body: T('Pilih lokasi sesuai jenis kegiatannya: bersih pantai, mangrove, atau terumbu karang.', 'Find sites by activity: beach cleanup, mangrove, or coral.') },
    { icon: 'shield', title: T('Cek status buktinya', 'Check the evidence status'), body: T('Lihat mana catatan yang sudah terverifikasi dan mana yang masih ditinjau.', 'Tell verified records apart from those still awaiting review.') },
    { icon: 'book', title: T('Buka catatan sumbernya', 'Open the source record'), body: T('Setiap catatan terhubung ke halaman proyeknya, jadi kamu bisa cek sendiri asalnya.', 'Each record links to its project page, so you can trace where it came from.') },
    { icon: 'heart', title: T('Pilih langkah berikutnya', 'Choose your next step'), body: T('Dukung kampanye, ikut ekspedisi, atau belajar dulu lewat Terumbu Academy.', 'Support a campaign, join an expedition, or start with Terumbu Academy.') },
  ],
};

export const levels = {
  title: T('Dua istilah yang sering tertukar', 'Two things people often mix up'),
  levelTitle: T('Level verifikasi proyek', 'Project verification level'),
  levelBody: T('Menunjukkan jenis pemeriksaan yang sudah dilewati sebuah proyek. Di peta ini ada tiga level:', 'Shows the type of check a project has passed. On this map you will see three levels:'),
  levelList: ['Basic verified', 'Document verified', 'Field verified'],
  recordTitle: T('Status catatan aktivitas', 'Activity record status'),
  recordBody: T(
    'Menunjukkan apakah satu catatan kegiatan di lapangan sudah terverifikasi atau masih ditinjau. Proyek bisa saja berlevel tinggi, tapi catatan terbarunya masih menunggu peninjauan. Contohnya Raja Ampat.',
    'Shows whether one field activity record is verified or still in review. A project can have a high verification level while its latest record still awaits review. Raja Ampat is an example.',
  ),
};

export const faq = {
  title: T('Pertanyaan yang sering muncul soal peta dampak', 'Common questions about the impact map'),
  copy: T('Belum nemu jawabannya? Tanya saja ke tim Terumbu, kami bantu jelaskan.', 'Can’t find your answer? Ask the Terumbu team and we will help.'),
  items: [
    { q: T('Seberapa akurat lokasi di peta?', 'How accurate are the locations on the map?'), a: T('Posisi di peta sengaja kami perkirakan. Koordinat persisnya tidak dibuka supaya kawasan ekologis yang sensitif tetap terlindungi.', 'Public locations are intentionally approximate. We do not share precise coordinates for sensitive ecological areas.') },
    { q: T('Apa bedanya level verifikasi proyek dengan status catatan aktivitas?', 'What is the difference between project verification level and activity record status?'), a: T('Level verifikasi proyek menunjukkan jenis pemeriksaan yang sudah dilewati proyek. Status catatan aktivitas menunjukkan apakah satu catatan lapangan sudah terverifikasi atau masih ditinjau.', 'The project verification level shows the type of check a project has passed. The activity record status shows whether a single field record is verified or still in review.') },
    { q: T('Kenapa ada lokasi yang statusnya masih ditinjau?', 'Why is a site still marked as in review?'), a: T('Kegiatannya sudah tercatat, tapi bukti lapangannya belum selesai kami tinjau. Tetap kami tampilkan supaya kamu tahu mana yang sudah terverifikasi dan mana yang belum.', 'The activity there is recorded, but its field evidence has not finished review. We still show it so you can see what is verified and what is not.') },
    { q: T('Seberapa sering data diperbarui?', 'How often is the data updated?'), a: T('Peta mengikuti catatan proyek yang sudah dipublikasikan. Kalau ada, tanggal survei atau kegiatan terbaru tampil di detail lokasi.', 'The map follows published project records. The latest survey or activity date appears in each site’s details when available.') },
    { q: T('Bagaimana cara ikut membantu?', 'How can I take part?'), a: T('Kamu bisa mendukung kampanye, ikut ekspedisi konservasi, atau mulai belajar lewat Terumbu Academy.', 'You can support a campaign, join a conservation expedition, or learn through Terumbu Academy.') },
  ],
};

export const cta = {
  title: T('Mulai dari satu lokasi, lanjut jadi kontribusi yang lebih panjang', 'One site can be the start of a longer contribution'),
  copy: T('Pilih proyek yang paling dekat dengan minatmu, lalu ikuti kabar lapangannya.', 'Pick the project closest to your interests, then follow its field updates.'),
  b1: T('Lihat proyek yang bisa didukung', 'See projects to support'),
  b2: T('Cari ekspedisi', 'Find an expedition'),
};
