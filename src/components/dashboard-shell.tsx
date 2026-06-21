"use client";

import { Bell, Home, LogOut, Settings, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const dashboardNav = [
  { label: "Overview", href: "/dashboard" },
  { label: "My Impact", href: "/dashboard/impact" },
  { label: "Corals", href: "/dashboard/corals" },
  { label: "Donations", href: "/dashboard/donations" },
  { label: "Expeditions", href: "/dashboard/expeditions" },
  { label: "Academy", href: "/dashboard/academy" },
  { label: "Certificates", href: "/dashboard/certificates" },
  { label: "Passport", href: "/dashboard/passport" }
];

function getCurrentLabel(pathname: string) {
  return dashboardNav.find((item) => item.href === pathname)?.label ?? "Overview";
}

export function DashboardShell({ children, displayName }: { children: ReactNode; displayName: string }) {
  const pathname = usePathname();
  const currentLabel = getCurrentLabel(pathname);

  return (
    <div className="min-h-screen bg-sand-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ocean-900/10 bg-white px-4 py-5 lg:block">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <nav className="mt-8 grid gap-1">
          {dashboardNav.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-ocean-50 hover:text-ocean-900",
                  isActive ? "bg-ocean-50 text-ocean-900" : "text-ocean-900/68"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ocean-900/10 bg-white/92 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Home size={19} aria-hidden="true" className="text-coral-500" />
            <p className="font-bold text-ocean-900">Dashboard / {currentLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Notifications" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50">
              <Bell size={19} aria-hidden="true" />
            </button>
            <Link href="/dashboard/settings" aria-label="Settings" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50">
              <Settings size={19} aria-hidden="true" />
            </Link>
            <div className="hidden items-center gap-2 rounded-full bg-ocean-50 py-1 pl-2 pr-3 sm:flex">
              <UserCircle size={21} aria-hidden="true" />
              <span className="max-w-40 truncate text-sm font-semibold text-ocean-900">{displayName}</span>
            </div>
            <form action={logoutAction}>
              <button type="submit" aria-label="Logout" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50">
                <LogOut size={19} aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
