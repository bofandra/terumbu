import { T, type L } from '@/lib/bilingual';

export const listSeo: L<{ title: string; description: string }> = {
  id: { title: 'Ekspedisi Konservasi & Ekowisata Pesisir Indonesia | Terumbu', description: 'Temukan ekspedisi pesisir Terumbu untuk mengenal alam, masyarakat, dan kehidupan pesisir secara langsung bersama pemandu lokal.' },
  en: { title: 'Coastal Conservation Expeditions in Indonesia | Terumbu', description: 'Find coastal expeditions with Terumbu to meet local communities, understand the environment, and learn through hands-on experiences.' },
};

export const hero = {
  h1: T('Kenali kehidupan pesisir dari dekat', 'Get to know coastal life up close'),
  copy: T('Mulai perjalananmu dengan mengenal alam, masyarakat, dan kehidupan pesisir secara langsung. Temukan perjalanan dan pengalaman baru di setiap destinasi.', 'Start your journey by meeting the coast, its people, and everyday life up close. Find a new experience in every destination.'),
  primary: T('Lihat semua ekspedisi', 'See all expeditions'),
  secondary: T('Buat trip sesuai keinginanmu', 'Build your own trip'),
  captionTitle: T('Jelajahi pesisir dengan perspektif baru', 'Explore the coast from a new perspective'),
  captionBody: T('Kenali alam dengan pengalaman langsung seperti warga lokal', 'Get to know nature through hands-on experiences with local people'),
  photo: '/assets/expeditions/boat-youth.jpeg',
  photoAlt: T('Peserta Terumbu naik perahu menuju lokasi lapangan pesisir', 'Terumbu participants on a boat heading to a coastal field site'),
};

export const catalogue = {
  h2: T('Perjalanan seperti apa yang kamu cari?', 'What kind of journey are you looking for?'),
  lede: T('Setiap perjalanan menawarkan cara berbeda untuk mengenal pesisir. Temukan detail perjalanan untuk mengetahui lokasi, rangkaian kegiatan, dan informasi keberangkatan.', 'Every journey offers a different way to meet the coast. Open the details for the location, itinerary, and departure information.'),
  filterAria: T('Filter ekspedisi', 'Expedition filters'),
  filterTitle: T('Filter pencarian', 'Search filters'),
  filterSub: T('Temukan pengalaman lapangan yang sesuai', 'Find the right field opportunity'),
  search: T('Cari', 'Search'),
  searchPh: T('Kata kunci, aktivitas, host', 'Keywords, activity, host'),
  destination: T('Destinasi', 'Destination'),
  destinationPh: T('Raja Ampat, Wakatobi, Bali', 'Raja Ampat, Wakatobi, Bali'),
  departure: T('Keberangkatan', 'Departure'),
  returning: T('Kepulangan', 'Return'),
  travelers: T('Peserta', 'Travelers'),
  travelersPh: T('Jumlah peserta', 'Any group size'),
  sortAria: T('Urutkan ekspedisi', 'Sort expeditions'),
  sortRecommended: T('Rekomendasi', 'Recommended'),
  sortPrice: T('Harga: rendah ke tinggi', 'Price: low to high'),
  sortDuration: T('Durasi', 'Duration'),
  sortButton: T('Urutkan', 'Sort'),
  maxPrefix: T('Maks.', 'Max.'),
  participants: T('peserta', 'participants'),
  detail: T('Lihat detail', 'View details'),
  empty: T('Belum ada ekspedisi yang cocok dengan filter kamu.', 'No expeditions match your filters yet.'),
  reset: T('Reset filter', 'Reset filters'),
  resultCount: (n: number): L => ({ id: `${n} ekspedisi ditemukan`, en: `${n} ${n === 1 ? 'expedition' : 'expeditions'} found` }),
};

export const impact = {
  h2: T('Lebih dekat dengan alam dan masyarakatnya.', 'Closer to nature and its people.'),
  copy: T('Kami percaya pengalaman yang baik dimulai dengan memahami tempatnya. Karena itu, setiap perjalanan kami disesuaikan selaras dengan lingkungan dan aktivitas masyarakat setempat.', 'We believe a good experience starts with understanding the place. That is why every journey is shaped around the environment and the rhythm of local communities.'),
  items: [
    { icon: 'guide', title: T('Belajar langsung bersama pemandu lokal', 'Learn directly with a local guide'), body: T('Kenali kawasan pesisir melalui pengetahuan dan pengalaman orang-orang yang hidup di dalamnya.', 'Understand the coast through the knowledge and lived experience of the people who call it home.') },
    { icon: 'waves', title: T('Fleksibel mengikuti kondisi alam', 'Stay flexible with nature'), body: T('Rute dan aktivitas dapat disesuaikan dengan kondisi alam dan situasi di lapangan.', 'Routes and activities can adapt to natural conditions and what is happening on the ground.') },
    { icon: 'shield', title: T('Berkunjung dengan penuh perhatian', 'Visit with care'), body: T('Sebelum berkegiatan, kamu mendapat pembekalan agar setiap langkah tetap memperhatikan keselamatan dan kelestarian lingkungan.', 'Before activities begin, you receive a briefing so every step respects safety and the environment.') },
    { icon: 'book', title: T('Tetap terhubung dengan dampaknya', 'Stay connected to the impact'), body: T('Lihat dokumentasi perjalanan dan perkembangan proyek konservasi melalui Peta Dampak Terumbu.', 'Follow trip documentation and conservation project updates through the Terumbu Impact Map.') },
  ],
} as const;

export const faq = {
  h2: T('Hal yang perlu kamu persiapkan sebelum perjalanan', 'What to prepare before your journey'),
  lede: T('Setiap perjalanan punya persiapan yang berbeda. Kami akan mengajakmu mengenal kondisi lokasi dan hal-hal yang perlu diperhatikan sebelum memulai perjalanan.', 'Every journey needs different preparation. We will help you understand the site and what to keep in mind before you set out.'),
  items: [
    { q: T('Ekspedisi ini cocok untuk siapa?', 'Who are these expeditions for?'), a: T('Ekspedisi Terumbu bisa diikuti oleh wisatawan, keluarga, komunitas, sekolah, maupun tim perusahaan. Setiap kegiatan punya tingkat aktivitas dan batas usia yang berbeda, jadi cek detail perjalanan sebelum mendaftar.', 'Terumbu expeditions are open to travellers, families, communities, schools, and company teams. Each activity has a different level of effort and age range, so check the trip details before booking.') },
    { q: T('Berapa lama durasi setiap ekspedisi?', 'How long does each expedition last?'), a: T('Durasi bergantung pada tujuan dan rangkaian kegiatannya. Ada perjalanan satu hari, kegiatan akhir pekan, sampai ekspedisi beberapa hari dengan pilihan menginap.', 'The duration depends on the destination and itinerary. Some trips last a day, while others run over a weekend or several days with accommodation options.') },
    { q: T('Apakah saya harus bisa berenang atau punya pengalaman tertentu?', 'Do I need to swim or have previous experience?'), a: T('Tidak semua perjalanan membutuhkan kemampuan berenang. Untuk kegiatan di air, seperti snorkeling atau pemantauan terumbu, informasi kemampuan yang dibutuhkan akan dicantumkan di detail ekspedisi. Pemandu juga akan memberikan arahan sebelum kegiatan dimulai.', 'Not every trip requires swimming skills. For water activities such as snorkelling or reef monitoring, the required abilities will be listed in the trip details. Your guide will also brief you before the activity.') },
    { q: T('Seberapa berat aktivitas fisiknya?', 'How physically demanding is the trip?'), a: T('Tingkat aktivitas berbeda di setiap lokasi. Beberapa kegiatan cukup ringan, sementara yang lain bisa melibatkan berjalan di pantai, naik perahu, berada di bawah matahari, atau melewati area mangrove. Detail perjalanan akan menjelaskan kondisi medan dan aktivitas yang perlu kamu siapkan.', 'Activity levels vary by location. Some are gentle, while others may involve walking on the beach, travelling by boat, spending time in the sun, or moving through mangroves. The trip details explain the terrain and what to expect.') },
    { q: T('Apa saja yang termasuk dalam biaya ekspedisi?', 'What is included in the expedition price?'), a: T('Rincian biaya mengikuti perjalanan yang kamu pilih. Biasanya, informasi ini mencakup pemandu lokal, kegiatan lapangan, perlengkapan tertentu, transportasi lokal, konsumsi, atau akomodasi jika tersedia. Semua komponen akan dijelaskan sebelum pembayaran.', 'The price depends on the trip you choose. It may include a local guide, field activities, selected equipment, local transport, meals, or accommodation when available. Every component will be explained before payment.') },
    { q: T('Apa yang belum termasuk dalam biaya?', 'What is not included in the price?'), a: T('Tiket menuju titik keberangkatan, pengeluaran pribadi, perlengkapan pribadi, asuransi, dan kebutuhan lain di luar itinerary biasanya belum termasuk. Cek rincian biaya setiap ekspedisi supaya tidak ada yang terlewat.', 'Travel to the departure point, personal expenses, personal equipment, insurance, and anything outside the itinerary are usually not included. Check each trip’s price details before you book.') },
    { q: T('Apa yang perlu saya bawa?', 'What should I bring?'), a: T('Kebutuhan tiap perjalanan berbeda. Umumnya, kamu perlu membawa pakaian yang nyaman, alas kaki sesuai medan, pelindung matahari, obat pribadi, botol minum, dan tas yang tahan air. Daftar perlengkapan lengkap akan dikirim sebelum keberangkatan.', 'What you need depends on the trip. In general, bring comfortable clothes, footwear for the terrain, sun protection, personal medication, a water bottle, and a waterproof bag. A full packing list will be sent before departure.') },
    { q: T('Bagaimana cara memesan ekspedisi?', 'How do I book an expedition?'), a: T('Pilih perjalanan yang ingin kamu ikuti, lalu hubungi tim Terumbu melalui tombol konsultasi. Kami akan mengecek tanggal, jumlah peserta, kebutuhan kelompok, dan ketersediaan mitra lokal sebelum mengirimkan detail pemesanan.', 'Choose a trip, then contact the Terumbu team through the consultation button. We will check the dates, group size, group needs, and local partner availability before sending the booking details.') },
    { q: T('Apakah saya bisa memilih tanggal keberangkatan sendiri?', 'Can I choose my own departure date?'), a: T('Bisa untuk beberapa jenis perjalanan. Jadwal bergantung pada ketersediaan pemandu, kondisi lokasi, pasang surut, cuaca, dan jumlah peserta. Untuk ekspedisi dengan jadwal tetap, tanggal keberangkatan akan dicantumkan di halaman detail.', 'For some trips, yes. Dates depend on guide availability, site conditions, tides, weather, and group size. Fixed-date expeditions will show their departure dates on the detail page.') },
    { q: T('Berapa jumlah peserta dalam satu ekspedisi?', 'How many people join one expedition?'), a: T('Jumlah peserta mengikuti kapasitas setiap perjalanan. Informasi seperti jumlah minimum, kapasitas maksimum, dan apakah perjalanan bersifat private atau gabungan akan dicantumkan di detail ekspedisi.', 'Group size follows the capacity of each trip. The minimum and maximum number of participants, along with whether the trip is private or shared, will be listed in the expedition details.') },
    { q: T('Apakah saya bisa ikut seorang diri?', 'Can I join on my own?'), a: T('Bisa, tergantung jadwal dan format perjalanannya. Kamu dapat bergabung dengan kelompok yang sudah tersedia atau menunggu sampai jumlah minimum peserta terpenuhi. Tim Terumbu akan membantu mencarikan opsi yang paling sesuai.', 'That depends on the schedule and trip format. You may join an existing group or wait until the minimum group size is reached. The Terumbu team can help you find the right option.') },
    { q: T('Siapa yang akan mendampingi selama perjalanan?', 'Who will accompany us?'), a: T('Kegiatan didampingi pemandu lokal dan, bila diperlukan, tim Terumbu. Pemandu membantu membaca kondisi tempat, menjelaskan aktivitas, serta memberi arahan agar perjalanan tetap aman dan menghormati lingkungan setempat. Bahasa pendampingan akan dicantumkan di detail ekspedisi.', 'Activities are led by a local guide and, when needed, a member of the Terumbu team. Guides help you understand the place, explain each activity, and keep the visit safe and respectful. The guide’s language will be listed in the trip details.') },
    { q: T('Bagaimana dengan transportasi, makanan, dan akomodasi?', 'What about transport, meals, and accommodation?'), a: T('Fasilitasnya berbeda di setiap lokasi. Detail perjalanan akan menjelaskan titik temu, jenis transportasi, pilihan makanan, serta akomodasi yang tersedia. Kalau kamu punya kebutuhan diet atau preferensi tertentu, sampaikan saat konsultasi.', 'Facilities vary by location. The trip details explain the meeting point, transport, meal options, and available accommodation. Tell us about any dietary needs or preferences during the consultation.') },
    { q: T('Bagaimana jika cuaca atau kondisi lokasi tidak memungkinkan?', 'What happens if the weather or site conditions are not suitable?'), a: T('Rute dan aktivitas bisa berubah mengikuti cuaca, kondisi laut, pasang surut, atau situasi di lapangan. Jika perubahan diperlukan, tim Terumbu bersama mitra lokal akan menyiapkan opsi kegiatan lain, perubahan jadwal, atau langkah berikutnya sesuai kebijakan perjalanan.', 'Routes and activities may change because of weather, sea conditions, tides, or what is happening on the ground. If a change is needed, Terumbu and the local partner will arrange an alternative activity, a new schedule, or the next step under the trip policy.') },
    { q: T('Bagaimana kontribusi dari ekspedisi ini mendukung konservasi?', 'How does this expedition support conservation?'), a: T('Setiap ekspedisi dirancang bersama mitra lokal dan mengikuti kebutuhan di lokasi. Kontribusi peserta dapat digunakan untuk mendukung kegiatan lapangan, pemandu, operasional lokal, atau proyek konservasi yang tercantum di detail perjalanan. Dokumentasi dan perkembangan proyek dapat diikuti melalui Peta Dampak Terumbu.', 'Each expedition is designed with a local partner around the needs of the site. Participant contributions may support field activities, guides, local operations, or the conservation project listed in the trip details. Follow project updates through the Terumbu Impact Map.') },
  ],
} as const;

export const cta = {
  h2: T('Rencanakan perjalananmu sekarang', 'Plan your journey now'),
  copy: T('Setiap perjalanan punya persiapan yang berbeda. Kami akan mengajakmu mengenal kondisi lokasi dan hal-hal yang perlu diperhatikan sebelum memulai perjalanan.', 'Every journey needs different preparation. We will help you understand the site and what to keep in mind before you set out.'),
  button: T('Konsultasikan dengan Kami', 'Talk to our team'),
  waText: 'Hai Terumbu, kami tertarik merencanakan ekspedisi konservasi.',
};

export const crumbs = { home: T('Beranda', 'Home'), expeditions: T('Ekspedisi', 'Trips') };
