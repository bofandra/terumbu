import { cookies } from "next/headers";

export const supportedLocales = ["en", "id"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const supportedDisplayCurrencies = ["USD", "EUR", "IDR", "JPY"] as const;
export type DisplayCurrency = (typeof supportedDisplayCurrencies)[number];

export async function getPreferredLocale(): Promise<SupportedLocale> {
  const store = await cookies();
  const value = store.get("terumbu_locale")?.value;
  return supportedLocales.includes(value as SupportedLocale) ? (value as SupportedLocale) : "id";
}

export async function getPreferredDisplayCurrency(): Promise<DisplayCurrency> {
  const store = await cookies();
  const value = store.get("terumbu_currency")?.value;
  return supportedDisplayCurrencies.includes(value as DisplayCurrency) ? (value as DisplayCurrency) : "IDR";
}

export function localeTag(locale: SupportedLocale) {
  return locale === "id" ? "id-ID" : "en-US";
}

const messages = {
  en: {
    nav: {
      explore: "Explore",
      support: "Support",
      impact: "Impact",
      learn: "Learn",
      donations: "Donations",
      expeditions: "Expeditions",
      destinations: "Destinations",
      academy: "Academy",
      impactMap: "Impact Map",
      about: "About",
      login: "Login",
      join: "Join",
      dashboard: "Dashboard",
      myImpact: "My Impact",
      settings: "Account settings",
      logout: "Log out"
    },
    home: {
      badge: "Conservation expeditions across Indonesia",
      title: "Explore the wild. Help protect it.",
      intro: "Join conservation journeys with local communities, learn from the ecosystems you visit, and take part in real action.",
      explore: "Explore Expeditions",
      impact: "See Verified Impact",
      support: "Support a Project",
      destinationPlaceholder: "Where do you want to explore?",
      activityPlaceholder: "Coral, mangrove, wildlife",
      searchTrips: "Find an expedition",
      flexibleDates: "Flexible dates",
      verifiedPartners: "Local partners",
      evidenceAfterTrip: "Impact evidence after your trip",
      audience: "Travelers, donors, volunteers, and learners",
      fieldUpdate: "Field update",
      watchImpact: "See the progress",
      featuredEyebrow: "Featured expeditions",
      featuredTitle: "More than simply exploring.",
      featuredDescription: "Explore beautiful places while joining conservation work with local communities. Every expedition is planned clearly, with impact you can trace.",
      exploreTrips: "Explore expeditions",
      supportEyebrow: "Support from anywhere",
      supportTitle: "Support real action. Follow every step.",
      supportDescription: "Support a conservation project today, follow its progress, and see evidence as the work moves forward.",
      viewCampaigns: "See all campaigns",
      impactMapEyebrow: "Impact map",
      impactMapTitle: "Track projects as the work unfolds",
      impactMapDescription: "Explore locations, field documentation, and restoration progress to understand how conservation work happens on the ground.",
      howEyebrow: "How it works",
      howTitle: "Turn good intentions into real impact",
      journeyFundTitle: "Support conservation projects",
      journeyFundDescription: "Explore conservation campaigns with documented field activities and clear targets.",
      journeyVisitTitle: "Join the field",
      journeyVisitDescription: "Take part in conservation expeditions that connect travel with restoration and meaningful ecosystem contributions.",
      journeyLearnTitle: "Learn from real projects",
      journeyLearnDescription: "Build conservation knowledge and skills through the Academy, connected to field practice.",
      journeyTrackTitle: "Track your contribution",
      journeyTrackDescription: "Bring your support, learning, field activities, and certificates together in an Impact Passport.",
      passportEyebrow: "Digital Impact Passport",
      passportTitle: "Make your contribution part of your story",
      passportDescription: "Save and share your conservation experiences, learning, and contributions."
    },
    expeditions: {
      badge: "Coastal conservation trips in Indonesia",
      title: "See the coast up close.",
      intro: "Join a local guide in the field, hear from coastal residents, and learn how each place is cared for. Choose a trip for your group, then check the details before you go.",
      search: "Search",
      keyword: "Search by activity, destination, or host",
      destination: "Destination",
      verifiedPartners: "Local partners",
      impactTrips: "Impact-linked trips",
      smallGroups: "Small groups",
      found: "opportunities found",
      noResults: "No opportunities match those filters yet.",
      searchTitle: "Start with a place or activity",
      catalogueEyebrow: "Ecotourism, conservation stays, and field activities",
      catalogueTitle: "Where will you go first?",
      catalogueIntro: "Browse the available trips, compare the field activities, and open a listing for dates, prices, and what to prepare.",
      approachEyebrow: "How it works",
      approachTitle: "Trips that stay close to the place.",
      approachIntro: "You arrive as a guest. The itinerary follows site conditions and the people who work there every day.",
      approachItems: [
        { title: "Start with local people", body: "Guides and local partners help you understand the place you are visiting." },
        { title: "Read the field conditions", body: "Routes and activities follow the weather, tides, and your group’s needs." },
        { title: "Learn how to visit well", body: "You get a briefing before entering the water, mangroves, or a conservation area." },
        { title: "Follow the work afterwards", body: "See project updates and field documentation through Terumbu’s Impact Map." }
      ],
      faqEyebrow: "Before you go",
      faqTitle: "What you should know.",
      faqs: [
        { question: "Who are these trips for?", answer: "Schools, communities, office teams, families, and individual travelers can join. Activities depend on the group, the host, and field conditions." },
        { question: "How are prices displayed?", answer: "The listing keeps the host’s original price and shows an estimate in your selected display currency when a reviewed FX reference is available." },
        { question: "Can we request a private departure?", answer: "Yes. Open the trip you want and send the team your group size, preferred dates, and access needs." }
      ],
      ctaEyebrow: "Plan your trip",
      ctaTitle: "Have a place in mind?",
      ctaBody: "Tell us who is coming, when you want to go, and what you want to learn. We can help you find the right route.",
      ctaLabel: "Talk to the expedition team"
    }
  },
  id: {
    nav: {
      explore: "Jelajahi",
      support: "Dukung",
      impact: "Dampak",
      learn: "Belajar",
      donations: "Donasi",
      expeditions: "Ekspedisi",
      destinations: "Destinasi",
      academy: "Akademi",
      impactMap: "Peta Dampak",
      about: "Tentang",
      login: "Masuk",
      join: "Gabung",
      dashboard: "Dasbor",
      myImpact: "Dampak Saya",
      settings: "Pengaturan akun",
      logout: "Keluar"
    },
    home: {
      badge: "Ekspedisi konservasi di seluruh Indonesia",
      title: "Jelajahi alamnya. Ikut jaga tempatnya.",
      intro: "Ikuti perjalanan konservasi bersama masyarakat lokal belajar dari ekosistem yang kamu kunjungi dan terlibat dalam aksi nyata.",
      explore: "Jelajahi Ekspedisi",
      impact: "Lihat Dampak Terverifikasi",
      support: "Dukung Proyek",
      destinationPlaceholder: "Mau menjelajah ke mana?",
      activityPlaceholder: "Karang, mangrove, satwa",
      searchTrips: "Temukan ekspedisi",
      flexibleDates: "Tanggal fleksibel",
      verifiedPartners: "Mitra lokal",
      evidenceAfterTrip: "Bukti dampak setelah perjalanan",
      audience: "Wisatawan, donor, relawan, dan pembelajar",
      fieldUpdate: "Kabar lapangan",
      watchImpact: "Lihat perkembangannya",
      featuredEyebrow: "Ekspedisi pilihan",
      featuredTitle: "Lebih dari sekadar menjelajah.",
      featuredDescription: "Jelajahi keindahan alam sambil mengambil bagian dalam upaya konservasi bersama komunitas lokal. Setiap ekspedisi dirancang dengan perencanaan yang jelas dan dampak yang dapat ditelusuri.",
      exploreTrips: "Jelajahi ekspedisi",
      supportEyebrow: "Dukung dari mana saja",
      supportTitle: "Dukung aksi nyata. Ikuti setiap perkembangannya.",
      supportDescription: "Dukung proyek konservasi hari ini. Ikuti perkembangannya dan pantau bukti kemajuan proyek seiring pekerjaan berlangsung.",
      viewCampaigns: "Lihat semua kampanye",
      impactMapEyebrow: "Peta dampak",
      impactMapTitle: "Pantau perkembangan proyek yang sedang dikerjakan",
      impactMapDescription: "Jelajahi lokasi, dokumentasi kegiatan, dan progres restorasi untuk memahami bagaimana upaya konservasi berlangsung di lapangan.",
      howEyebrow: "Cara kerja",
      howTitle: "Dari niat baik menjadi dampak nyata",
      journeyFundTitle: "Dukung proyek konservasi",
      journeyFundDescription: "Jelajahi kampanye konservasi dengan aktivitas lapangan yang terdokumentasi dan target yang jelas.",
      journeyVisitTitle: "Ambil bagian di lapangan",
      journeyVisitDescription: "Ikuti ekspedisi konservasi yang menghubungkan perjalanan dengan aktivitas restorasi dan kontribusi nyata bagi ekosistem.",
      journeyLearnTitle: "Belajar dari proyek nyata",
      journeyLearnDescription: "Kembangkan pengetahuan dan keterampilan konservasi melalui Academy, dengan pembelajaran yang terhubung ke praktik di lapangan.",
      journeyTrackTitle: "Lacak kontribusimu",
      journeyTrackDescription: "Satukan riwayat dukungan, pembelajaran, aktivitas lapangan, dan sertifikat dalam Impact Passport sebagai catatan perjalanan konservasimu.",
      passportEyebrow: "Digital Impact Passport",
      passportTitle: "Jadikan kontribusimu bagian dari ceritamu",
      passportDescription: "Pengalaman konservasi, pembelajaran, dan kontribusi yang bisa kamu simpan dan bagikan."
    },
    expeditions: {
      badge: "Trip konservasi di pesisir Indonesia",
      title: "Lihat pesisir lebih dekat.",
      intro: "Ikut ke lapangan bersama pemandu lokal, dengar cerita warga, dan kenali cara tiap tempat dirawat. Pilih trip yang sesuai kelompokmu, lalu cek detailnya sebelum berangkat.",
      search: "Cari",
      keyword: "Cari aktivitas, destinasi, atau host",
      destination: "Destinasi",
      verifiedPartners: "Mitra lokal",
      impactTrips: "Perjalanan terkait dampak",
      smallGroups: "Grup kecil",
      found: "pengalaman ditemukan",
      noResults: "Belum ada pengalaman yang cocok dengan filter tersebut.",
      searchTitle: "Mulai dari tempat atau kegiatan",
      catalogueEyebrow: "Ekowisata, conservation stay, dan aktivitas lapangan",
      catalogueTitle: "Mau ke mana dulu?",
      catalogueIntro: "Lihat trip yang tersedia, bandingkan kegiatan lapangannya, lalu buka detail untuk mengecek tanggal, harga, dan hal yang perlu disiapkan.",
      approachEyebrow: "Cara kerja",
      approachTitle: "Trip yang dekat dengan tempatnya.",
      approachIntro: "Kamu datang sebagai tamu. Karena itu, alurnya mengikuti kondisi lokasi dan arahan orang yang sehari-hari bekerja di sana.",
      approachItems: [
        { title: "Mulai dari warga setempat", body: "Pemandu dan mitra lokal membantu kamu memahami tempat yang sedang dikunjungi." },
        { title: "Lihat kondisi lapangan", body: "Rute dan kegiatan menyesuaikan cuaca, pasang surut, serta kebutuhan kelompokmu." },
        { title: "Jaga cara berkunjung", body: "Kamu mendapat pembekalan sebelum masuk ke air, mangrove, atau area konservasi." },
        { title: "Ikuti kabarnya setelah pulang", body: "Dokumentasi dan perkembangan proyek bisa dilihat melalui Peta Dampak Terumbu." }
      ],
      faqEyebrow: "Sebelum berangkat",
      faqTitle: "Yang perlu kamu tahu.",
      faqs: [
        { question: "Trip ini cocok untuk siapa?", answer: "Sekolah, komunitas, tim kantor, keluarga, dan wisatawan bisa ikut. Kegiatannya menyesuaikan kelompok, mitra, dan kondisi lapangan." },
        { question: "Bagaimana harga ditampilkan?", answer: "Harga asli dari mitra tetap ditampilkan. Jika referensi kurs yang sudah ditinjau tersedia, kamu juga akan melihat estimasi dalam mata uang pilihanmu." },
        { question: "Bisa minta keberangkatan privat?", answer: "Bisa. Buka trip yang kamu inginkan, lalu kirim jumlah peserta, tanggal pilihan, dan kebutuhan akses kepada tim." }
      ],
      ctaEyebrow: "Rencanakan perjalananmu",
      ctaTitle: "Punya lokasi di kepala?",
      ctaBody: "Ceritakan siapa yang ikut, kapan ingin berangkat, dan apa yang ingin dipelajari. Kami bantu mencari rute yang sesuai.",
      ctaLabel: "Tanya tim ekspedisi"
    }
  }
} as const;

export function t(locale: SupportedLocale) {
  return messages[locale];
}
