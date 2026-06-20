import Link from "next/link";

import { navItems } from "@/lib/data";

export function SiteFooter() {
  return (
    <footer className="border-t border-ocean-900/10 bg-sand-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <Link href="/" className="text-xl font-bold text-ocean-900">
            Terumbu.eco
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-ocean-900/68">
            Conservation funding, field experiences, learning, and verified impact records for Indonesia&apos;s coastal ecosystems.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold text-ocean-900">Platform</h2>
            <ul className="mt-4 space-y-3 text-sm text-ocean-900/68">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-ocean-900">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ocean-900">Account</h2>
            <ul className="mt-4 space-y-3 text-sm text-ocean-900/68">
              <li>
                <Link href="/dashboard" className="hover:text-ocean-900">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/passport" className="hover:text-ocean-900">
                  Impact Passport
                </Link>
              </li>
              <li>
                <Link href="/corporate/dashboard" className="hover:text-ocean-900">
                  Corporate
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ocean-900">Trust</h2>
            <ul className="mt-4 space-y-3 text-sm text-ocean-900/68">
              <li>Verified partners</li>
              <li>Evidence library</li>
              <li>Financial transparency</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
