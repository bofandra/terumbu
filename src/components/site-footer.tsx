import Link from "next/link";

import type { SupportedLocale } from "@/lib/user-preferences";
import { publicLocaleHref } from "@/lib/public-localized-routes";

export function SiteFooter({ locale = "en" }: { locale?: SupportedLocale }) {
  const labels =
    locale === "id"
      ? {
          description: "Pendanaan konservasi, pengalaman lapangan, pembelajaran, dan rekam dampak terverifikasi untuk ekosistem pesisir Indonesia.",
          platform: "Platform",
          account: "Akun",
          trust: "Kepercayaan",
          links: [
            { label: "Jelajahi ekspedisi", href: "/expeditions" },
            { label: "Dukung proyek", href: "/campaigns" },
            { label: "Peta dampak", href: "/impact-map" },
            { label: "Akademi", href: "/academy" },
            { label: "Destinasi", href: "/destinations" },
            { label: "Tentang Terumbu", href: "/about" }
          ],
          join: "Gabung Terumbu",
          dashboard: "Dasbor",
          myImpact: "Dampak Saya",
          corporate: "Corporate",
          verifiedPartners: "Mitra terverifikasi",
          fieldEvidence: "Bukti lapangan",
          transparency: "Transparansi keuangan"
        }
      : {
          description: "Conservation funding, field experiences, learning, and verified impact records for Indonesia's coastal ecosystems.",
          platform: "Platform",
          account: "Account",
          trust: "Trust",
          links: [
            { label: "Explore expeditions", href: "/expeditions" },
            { label: "Support projects", href: "/campaigns" },
            { label: "Impact map", href: "/impact-map" },
            { label: "Academy", href: "/academy" },
            { label: "Destinations", href: "/destinations" },
            { label: "About Terumbu", href: "/about" }
          ],
          join: "Join Terumbu",
          dashboard: "Dashboard",
          myImpact: "My Impact",
          corporate: "Corporate",
          verifiedPartners: "Verified partners",
          fieldEvidence: "Field evidence",
          transparency: "Financial transparency"
        };

  return (
    <footer className="border-t border-white/10 bg-[#062d7f] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <Link href={publicLocaleHref(locale, "/")} className="text-2xl font-black tracking-tight text-white">
            Terumbu.world
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
            {labels.description}
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold text-white">{labels.platform}</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {labels.links.map((item) => (
                <li key={item.href}>
                  <Link href={publicLocaleHref(locale, item.href)} className="hover:text-[#c9f341]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{labels.account}</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li><Link href="/signup" className="hover:text-[#c9f341]">{labels.join}</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#c9f341]">{labels.dashboard}</Link></li>
              <li><Link href="/dashboard/impact" className="hover:text-[#c9f341]">{labels.myImpact}</Link></li>
              <li><Link href="/corporate/dashboard" className="hover:text-[#c9f341]">{labels.corporate}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{labels.trust}</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li>{labels.verifiedPartners}</li>
              <li>{labels.fieldEvidence}</li>
              <li>{labels.transparency}</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
\n