"use client";

import {
  Award,
  Bell,
  BookOpen,
  CreditCard,
  Eye,
  FileBadge,
  Heart,
  HelpCircle,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Search,
  Settings,
  ShieldQuestion,
  Star,
  UserCircle,
  Waves
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const dashboardNav = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "My Impact", href: "/dashboard/impact", icon: MapPinned },
  { label: "My Corals", href: "/dashboard/corals", icon: Waves },
  { label: "Donations", href: "/dashboard/donations", icon: Heart },
  { label: "Expeditions", href: "/dashboard/expeditions", icon: ShieldQuestion },
  { label: "Academy", href: "/dashboard/academy", icon: BookOpen },
  { label: "Impact Passport", href: "/dashboard/passport", icon: Award },
  { label: "Certificates", href: "/dashboard/certificates", icon: FileBadge },
  { label: "Saved Projects", href: "/dashboard/saved", icon: Star }
];

const accountNav = [
  { label: "Notifications", href: "/dashboard#notifications", icon: Bell },
  { label: "Payment Methods", href: "/dashboard/donations", icon: CreditCard },
  { label: "Account Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Privacy & Visibility", href: "/dashboard/settings#privacy", icon: Eye },
  { label: "Help & Support", href: "/dashboard#support", icon: HelpCircle }
];

const mobileNav = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Impact", href: "/dashboard/impact", icon: MapPinned },
  { label: "Corals", href: "/dashboard/corals", icon: Waves },
  { label: "Explore", href: "/campaigns", icon: Search },
  { label: "Profile", href: "/dashboard/passport", icon: UserCircle }
];

function getCurrentLabel(pathname: string) {
  if (pathname === "/dashboard/search") {
    return "Search Results";
  }

  return [...dashboardNav, ...accountNav].find((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))?.label ?? "Overview";
}

function isActivePath(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function initialsForDisplayName(displayName: string) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "OH";
}

export function DashboardShell({ children, displayName, unreadNotificationCount = 0 }: { children: ReactNode; displayName: string; unreadNotificationCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLabel = getCurrentLabel(pathname);
  const initials = initialsForDisplayName(displayName);
  const notificationBadge = unreadNotificationCount > 0 ? String(Math.min(unreadNotificationCount, 99)) : null;
  const currentSearch = pathname === "/dashboard/search" ? searchParams.get("q") ?? "" : "";

  return (
    <div className="min-h-screen bg-mist-50 pb-20 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 hidden w-72 bg-ocean-900 px-5 py-6 text-white shadow-2xl lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">T</span>
          <span>
            <span className="block text-2xl font-bold tracking-normal">Terumbu.eco</span>
            <span className="block text-[11px] font-semibold text-white/52">Restore Reefs. Empower Communities.</span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-2">
          {dashboardNav.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  isActive ? "bg-coral-500 text-white shadow-soft" : "text-white/72 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className={cn("absolute left-0 h-6 w-1 rounded-r-full bg-white transition", isActive ? "opacity-100" : "opacity-0")} />
                <Icon size={19} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/14 pt-5">
          <nav className="grid gap-1.5">
            {accountNav.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition",
                    isActive ? "bg-white/12 text-white" : "text-white/72 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} aria-hidden="true" />
                    {item.label}
                  </span>
                  {item.label === "Notifications" && notificationBadge ? <span className="rounded-full bg-coral-500 px-2 py-0.5 text-[11px] text-white">{notificationBadge}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div id="support" className="mt-auto rounded-2xl border border-white/16 bg-white/8 p-5">
          <HelpCircle size={28} aria-hidden="true" />
          <p className="mt-3 font-bold">Need Help?</p>
          <p className="mt-2 text-sm leading-6 text-white/64">We are here to help you make bigger impact.</p>
          <Link href="mailto:support@terumbu.eco" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-coral-500 px-4 text-sm font-bold text-white">
            Contact Support
          </Link>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between gap-4 border-b border-ocean-900/10 bg-white/92 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <details className="relative lg:hidden">
              <summary aria-label="Open navigation" className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full bg-ocean-50 text-ocean-900">
                <Menu size={19} aria-hidden="true" />
              </summary>
              <div className="absolute left-0 mt-3 w-72 rounded-2xl border border-ocean-900/10 bg-white p-2 shadow-soft">
                {[...dashboardNav, ...accountNav].map((item) => {
                  const Icon = item.icon;
                  const badge = item.label === "Notifications" ? notificationBadge : null;

                  return (
                    <Link key={`${item.label}:${item.href}`} href={item.href} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                      <span className="flex items-center gap-3">
                        <Icon size={17} aria-hidden="true" />
                        {item.label}
                      </span>
                      {badge ? <span className="rounded-full bg-coral-500 px-2 py-0.5 text-[11px] text-white">{badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </details>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">Dashboard</p>
              <p className="truncate text-lg font-bold tracking-normal text-ocean-900 sm:text-xl">{currentLabel}</p>
            </div>
          </div>

          <form action="/dashboard/search" method="get" className="hidden min-h-11 w-full max-w-sm items-center gap-3 rounded-full border border-ocean-900/12 bg-white px-4 text-sm font-semibold text-ocean-900/54 shadow-soft xl:flex">
            <Search size={18} aria-hidden="true" />
            <label htmlFor="dashboard-search" className="sr-only">Search dashboard</label>
            <input id="dashboard-search" name="q" type="search" defaultValue={currentSearch} className="w-full bg-transparent outline-none placeholder:text-ocean-900/42" placeholder="Search anything..." />
          </form>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/dashboard#notifications" aria-label="Notifications" className="relative flex size-11 items-center justify-center rounded-full hover:bg-ocean-50">
              <Bell size={19} aria-hidden="true" />
              {notificationBadge ? <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-coral-500 px-1 text-center text-[10px] font-bold leading-5 text-white">{notificationBadge}</span> : null}
            </Link>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full hover:bg-ocean-50 sm:py-1 sm:pl-1 sm:pr-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-sm font-bold text-white">{initials}</span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-32 truncate text-sm font-bold text-ocean-900">{displayName}</span>
                  <span className="block text-xs font-semibold text-ocean-900/54">Ocean Hero</span>
                </span>
              </summary>
              <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-ocean-900/10 bg-white p-2 shadow-soft">
                <Link href="/dashboard/passport" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  View Impact Passport
                </Link>
                <Link href="/dashboard/settings" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Account settings
                </Link>
                <Link href="/dashboard/donations" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Payment methods
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
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ocean-900/10 bg-white/94 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition",
                  isActive ? "bg-ocean-900 text-white" : "text-ocean-900/62 hover:bg-ocean-50 hover:text-ocean-900"
                )}
              >
                <Icon size={19} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
