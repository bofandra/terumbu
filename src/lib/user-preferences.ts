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
      donations: "Donations",
      expeditions: "Expeditions",
      destinations: "Destinations",
      academy: "Academy",
      impactMap: "Impact Map",
      about: "About",
      login: "Login",
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
      support: "Support a Project"
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
      donations: "Donasi",
      expeditions: "Ekspedisi",
      destinations: "Destinasi",
      academy: "Akademi",
      impactMap: "Peta Dampak",
      about: "Tentang",
      login: "Masuk",
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
      support: "Dukung Proyek"
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
