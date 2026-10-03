import { cookies } from "next/headers";

export const supportedLocales = ["en", "id"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const supportedDisplayCurrencies = ["USD", "EUR", "IDR", "JPY"] as const;
export type DisplayCurrency = (typeof supportedDisplayCurrencies)[number];

export async function getPreferredLocale(): Promise<SupportedLocale> {
  const store = await cookies();
  const value = store.get("terumbu_locale")?.value;
  return supportedLocales.includes(value as SupportedLocale) ? (value as SupportedLocale) : "en";
}

export async function getPreferredDisplayCurrency(): Promise<DisplayCurrency> {
  const store = await cookies();
  const value = store.get("terumbu_currency")?.value;
  return supportedDisplayCurrencies.includes(value as DisplayCurrency) ? (value as DisplayCurrency) : "USD";
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
      login: "Login",
      join: "Join",
      dashboard: "Dashboard",
      myImpact: "My Impact",
      settings: "Account settings",
      logout: "Log out"
    },
    home: {
      badge: "Conservation expeditions across Indonesia",
      title: "Travel somewhere worth protecting.",
      intro: "Join conservation expeditions, learn from local field teams, and see the verified impact your journey helps create.",
      explore: "Explore Expeditions",
      impact: "See Verified Impact",
      support: "Support a Project",
      destinationPlaceholder: "Where in Indonesia?",
      activityPlaceholder: "Reef, wildlife, community...",
      searchTrips: "Find an expedition",
      flexibleDates: "Flexible dates",
      verifiedPartners: "Verified local partners",
      evidenceAfterTrip: "Impact evidence after your trip",
      audience: "Travelers, donors, volunteers, and learners",
      fieldUpdate: "Field update",
      watchImpact: "Watch impact",
      featuredEyebrow: "Featured expeditions",
      featuredTitle: "Go beyond sightseeing",
      featuredDescription: "Join field experiences with local conservation teams, clear logistics, verified partners, and impact you can carry into your Impact Passport.",
      exploreTrips: "Explore Trips",
      supportEyebrow: "Support from anywhere",
      supportTitle: "Can’t travel yet? Fund the next conservation milestone",
      supportDescription: "Back a verified project now, then follow field activity and evidence as the work progresses.",
      viewCampaigns: "View Campaigns",
      impactMapEyebrow: "Impact map",
      impactMapTitle: "Field activity should be visible, not hidden in reports",
      impactMapDescription: "Browse restoration sites, cleanup routes, learning hubs, activity records, and the progress behind every claim.",
      howEyebrow: "How it works",
      howTitle: "Discover → travel → contribute → verify → share",
      journeyFundTitle: "Fund verified work",
      journeyFundDescription: "Choose campaigns backed by partner checks, field activity, and transparent funding goals.",
      journeyVisitTitle: "Visit the field",
      journeyVisitDescription: "Join conservation expeditions that connect travel with measurable restoration activity.",
      journeyLearnTitle: "Learn the science",
      journeyLearnDescription: "Build practical knowledge through Academy tracks linked to real projects and destinations.",
      journeyTrackTitle: "Track your impact",
      journeyTrackDescription: "Collect donations, courses, fieldwork, and certificates in a shareable Impact Passport.",
      passportEyebrow: "Digital Impact Passport",
      passportTitle: "Your trip should leave more than photos",
      passportDescription: "Donations, field expeditions, sponsored ecosystems, learning, volunteer hours, and certificates become a verified conservation record you can keep and share."
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
      login: "Masuk",
      join: "Gabung",
      dashboard: "Dasbor",
      myImpact: "Dampak Saya",
      settings: "Pengaturan akun",
      logout: "Keluar"
    },
    home: {
      badge: "Ekspedisi konservasi di seluruh Indonesia",
      title: "Berwisata ke tempat yang layak kita lindungi.",
      intro: "Ikuti ekspedisi konservasi, belajar bersama tim lapangan lokal, dan lihat dampak terverifikasi yang ikut diwujudkan oleh perjalananmu.",
      explore: "Jelajahi Ekspedisi",
      impact: "Lihat Dampak Terverifikasi",
      support: "Dukung Proyek",
      destinationPlaceholder: "Mau ke mana di Indonesia?",
      activityPlaceholder: "Terumbu karang, satwa, komunitas...",
      searchTrips: "Temukan ekspedisi",
      flexibleDates: "Tanggal fleksibel",
      verifiedPartners: "Mitra lokal terverifikasi",
      evidenceAfterTrip: "Bukti dampak setelah perjalanan",
      audience: "Wisatawan, donor, relawan, dan pembelajar",
      fieldUpdate: "Kabar lapangan",
      watchImpact: "Lihat dampak",
      featuredEyebrow: "Ekspedisi pilihan",
      featuredTitle: "Lebih dari sekadar melihat-lihat",
      featuredDescription: "Ikuti pengalaman lapangan bersama tim konservasi lokal, dengan logistik yang jelas, mitra terverifikasi, dan dampak yang tercatat di Impact Passport.",
      exploreTrips: "Jelajahi Ekspedisi",
      supportEyebrow: "Dukung dari mana saja",
      supportTitle: "Belum bisa bepergian? Dukung target konservasi berikutnya",
      supportDescription: "Dukung proyek terverifikasi sekarang, lalu ikuti aktivitas lapangan dan buktinya seiring pekerjaan berjalan.",
      viewCampaigns: "Lihat Kampanye",
      impactMapEyebrow: "Peta dampak",
      impactMapTitle: "Aktivitas lapangan seharusnya terlihat, bukan tersembunyi di laporan",
      impactMapDescription: "Jelajahi lokasi restorasi, rute bersih pantai, pusat belajar, catatan aktivitas, dan progres di balik setiap klaim.",
      howEyebrow: "Cara kerja",
      howTitle: "Temukan → berangkat → berkontribusi → verifikasi → bagikan",
      journeyFundTitle: "Dukung kerja terverifikasi",
      journeyFundDescription: "Pilih kampanye dengan pemeriksaan mitra, aktivitas lapangan, dan target pendanaan yang transparan.",
      journeyVisitTitle: "Turun ke lapangan",
      journeyVisitDescription: "Ikuti ekspedisi konservasi yang menghubungkan perjalanan dengan aktivitas restorasi terukur.",
      journeyLearnTitle: "Pelajari ilmunya",
      journeyLearnDescription: "Bangun pengetahuan praktis lewat Academy yang terhubung dengan proyek dan destinasi nyata.",
      journeyTrackTitle: "Pantau dampakmu",
      journeyTrackDescription: "Kumpulkan donasi, kursus, aktivitas lapangan, dan sertifikat dalam Impact Passport yang dapat dibagikan.",
      passportEyebrow: "Digital Impact Passport",
      passportTitle: "Perjalananmu seharusnya meninggalkan lebih dari sekadar foto",
      passportDescription: "Donasi, ekspedisi lapangan, ekosistem yang didukung, pembelajaran, jam relawan, dan sertifikat menjadi rekam konservasi terverifikasi yang dapat kamu simpan dan bagikan."
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
