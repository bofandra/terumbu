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
      verifiedPartners: "Verified local partners",
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
      journeyFundTitle: "Support verified projects",
      journeyFundDescription: "Choose conservation campaigns with checked partners, clear field activities, and transparent targets.",
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
      badge: "Eco programs, conservation stays, and field bookings",
      title: "Find conservation opportunities across Indonesia",
      intro: "Search verified hosts, compare what you offer and what you get, then reserve a real Terumbu field departure when dates fit.",
      search: "Search",
      keyword: "Search by activity, destination, or host",
      destination: "Destination",
      verifiedPartners: "Verified partners",
      impactTrips: "Impact-linked trips",
      smallGroups: "Small groups",
      found: "opportunities found",
      noResults: "No opportunities match those filters yet."
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
      verifiedPartners: "Mitra lokal terverifikasi",
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
      journeyFundTitle: "Dukung proyek terverifikasi",
      journeyFundDescription: "Pilih kampanye konservasi dengan mitra yang telah diperiksa, aktivitas lapangan yang jelas, dan target yang transparan.",
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
      badge: "Program ekowisata, tinggal untuk konservasi, dan aktivitas lapangan",
      title: "Temukan pengalaman konservasi di seluruh Indonesia",
      intro: "Cari mitra terverifikasi, bandingkan aktivitas dan fasilitas, lalu pilih keberangkatan lapangan Terumbu yang sesuai jadwalmu.",
      search: "Cari",
      keyword: "Cari aktivitas, destinasi, atau host",
      destination: "Destinasi",
      verifiedPartners: "Mitra terverifikasi",
      impactTrips: "Perjalanan terkait dampak",
      smallGroups: "Grup kecil",
      found: "pengalaman ditemukan",
      noResults: "Belum ada pengalaman yang cocok dengan filter tersebut."
    }
  }
} as const;

export function t(locale: SupportedLocale) {
  return messages[locale];
}
