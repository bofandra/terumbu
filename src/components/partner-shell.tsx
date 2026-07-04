"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Plus,
  Waves,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PartnerNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const partnerNavItems: PartnerNavItem[] = [
  { href: "/partner", label: "Overview", icon: LayoutDashboard },
  { href: "/partner/campaigns/new", label: "Create", icon: Plus },
  { href: "/partner/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/partner/activity", label: "Activity", icon: ClipboardList }
];

export function PartnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-sand-50 text-ocean-900">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-ocean-900/10 bg-white/72 px-4 py-4 backdrop-blur sm:px-6 lg:sticky lg:top-0 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-ocean-900 text-white">
                <Waves className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-bold text-ocean-900">Terumbu.eco</span>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ocean-900/54">Partner</span>
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 lg:mt-5 lg:w-full lg:justify-between"
            >
              Dashboard
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0" aria-label="Partner sections">
            {partnerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-bold transition lg:w-full",
                    isActive ? "bg-ocean-900 text-white shadow-soft" : "text-ocean-900/70 hover:bg-ocean-50 hover:text-ocean-900"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden rounded-lg border border-ocean-900/10 bg-sand-50 p-4 lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Partner workspace</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/68">
              Campaign setup, field activity, image uploads, and verification tracking in one place.
            </p>
          </div>
        </aside>

        <section className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
