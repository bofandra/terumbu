"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  ShipWheel,
  Waves,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

import { logoutAction } from "@/lib/auth-actions";
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
  { href: "/partner/expeditions", label: "Expeditions", icon: ShipWheel },
  { href: "/partner/activity", label: "Activity", icon: ClipboardList }
];

function initialsForName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PA";
}

export function PartnerShell({ children, displayName, roleLabel }: { children: ReactNode; displayName: string; roleLabel: string }) {
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
              Campaign setup, expedition details, field activity, images, and verification tracking in one place.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between gap-4 border-b border-ocean-900/10 bg-white/94 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/partner" aria-label="Partner overview" className="flex size-11 items-center justify-center rounded-full bg-ocean-50 text-ocean-900 lg:hidden">
                <Megaphone size={20} aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">Partner portal</p>
                <p className="truncate text-lg font-bold tracking-normal text-ocean-900 sm:text-xl">Partner workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/partner#notifications" aria-label="Notifications" className="relative flex size-11 items-center justify-center rounded-full hover:bg-ocean-50">
                <Bell size={19} aria-hidden="true" />
                <span className="absolute right-1.5 top-1.5 size-3 rounded-full bg-coral-500 ring-2 ring-white" />
              </Link>
              <Link href="mailto:partnerships@terumbu.eco" aria-label="Help" className="hidden size-11 items-center justify-center rounded-full hover:bg-ocean-50 sm:flex">
                <CircleHelp size={19} aria-hidden="true" />
              </Link>
              <Link href="/partner/activity" aria-label="Messages" className="hidden size-11 items-center justify-center rounded-full hover:bg-ocean-50 sm:flex">
                <MessageSquare size={19} aria-hidden="true" />
              </Link>
              <details className="group relative">
                <summary aria-label="Partner account menu" className="flex cursor-pointer list-none items-center gap-3 rounded-full hover:bg-ocean-50 sm:py-1 sm:pl-1 sm:pr-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-sm font-bold text-white">
                    {initialsForName(displayName)}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-32 truncate text-sm font-bold text-ocean-900">{displayName}</span>
                    <span className="block text-xs font-semibold text-ocean-900/54">{roleLabel}</span>
                  </span>
                </summary>
                <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-ocean-900/10 bg-white p-2 shadow-soft">
                  <Link href="/partner" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                    Partner overview
                  </Link>
                  <Link href="/partner/activity" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                    Activity center
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-coral-700 hover:bg-coral-100">
                      <LogOut size={16} aria-hidden="true" />
                      Log out
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </header>

          <section className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
