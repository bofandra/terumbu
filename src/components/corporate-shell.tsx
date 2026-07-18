"use client";

import {
  BriefcaseBusiness,
  Building2,
  FileBadge,
  FileText,
  Home,
  Kanban,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  Waves,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

type CorporateNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const corporateNavItems: CorporateNavItem[] = [
  { label: "Task hub", href: "/corporate", icon: Home },
  { label: "Kanban board", href: "/corporate/board", icon: Kanban },
  { label: "Programs", href: "/corporate/programs", icon: BriefcaseBusiness },
  { label: "Funded campaigns", href: "/corporate/projects", icon: ShieldCheck },
  { label: "Funding", href: "/corporate/funding", icon: FileBadge },
  { label: "Employees", href: "/corporate/employees", icon: Users },
  { label: "Evidence", href: "/corporate/evidence", icon: FileText },
  { label: "Reports", href: "/corporate/reports", icon: FileBadge },
  { label: "Settings", href: "/corporate/settings", icon: Settings }
];

function initialsForName(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "CP";
}

function isActive(pathname: string, href: string) {
  return href === "/corporate" ? pathname === href || pathname === "/corporate/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}

function currentTaskForPath(pathname: string) {
  const activeItem = corporateNavItems
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return activeItem?.label ?? "Task hub";
}

export function CorporateShell({
  children,
  displayName,
  roleLabel,
  accountName,
  programName,
  accountLogoUrl,
  activeProjects,
  nextReportDue
}: {
  children: ReactNode;
  displayName: string;
  roleLabel: string;
  accountName: string;
  programName: string;
  accountLogoUrl: string | null;
  activeProjects: number;
  nextReportDue: string;
}) {
  const pathname = usePathname();
  const currentTask = currentTaskForPath(pathname);

  return (
    <div className="min-h-screen bg-sand-50 text-ocean-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-ocean-900/10 bg-white px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-ocean-900 text-white">
              <Waves className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-bold text-ocean-900">Terumbu.eco</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ocean-900/54">Corporate</span>
            </span>
          </Link>

          <div className="mt-5 rounded-lg border border-ocean-900/10 bg-sand-50 p-3" title={accountLogoUrl ? "Company logo configured" : accountName}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-ocean-900 ring-1 ring-ocean-900/10">
                {initialsForName(accountName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ocean-900">{accountName}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-ocean-900/56">{programName}</p>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0" aria-label="Corporate sections">
            {corporateNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-bold transition lg:w-full",
                    active ? "bg-ocean-900 text-white" : "text-ocean-900/70 hover:bg-ocean-50 hover:text-ocean-900"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between gap-4 border-b border-ocean-900/10 bg-white/94 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/corporate" aria-label="Corporate task hub" className="flex size-11 items-center justify-center rounded-full bg-ocean-50 text-ocean-900 lg:hidden">
                <Building2 size={20} aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">Corporate portal</p>
                <p className="truncate text-lg font-bold tracking-normal text-ocean-900 sm:text-xl">{currentTask}</p>
              </div>
            </div>

            <div className="hidden items-center gap-4 text-sm font-semibold text-ocean-900/58 md:flex">
              <span>{activeProjects.toLocaleString("id-ID")} funded campaigns</span>
              <span className="h-4 w-px bg-ocean-900/14" />
              <span>Report due {nextReportDue}</span>
            </div>

            <details className="group relative">
              <summary aria-label="Corporate account menu" className="flex cursor-pointer list-none items-center gap-3 rounded-full hover:bg-ocean-50 sm:py-1 sm:pl-1 sm:pr-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-sm font-bold text-white">
                  {initialsForName(displayName)}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-32 truncate text-sm font-bold text-ocean-900">{displayName}</span>
                  <span className="block text-xs font-semibold text-ocean-900/54">{roleLabel}</span>
                </span>
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-64 rounded-lg border border-ocean-900/10 bg-white p-2 shadow-soft">
                <Link href="/corporate" className="block rounded-lg px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Corporate task hub
                </Link>
                <Link href="/corporate/settings" className="block rounded-lg px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Team and access
                </Link>
                <Link href="/corporate/reports" className="block rounded-lg px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Report workflow
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-coral-700 hover:bg-coral-100">
                    <LogOut size={16} aria-hidden="true" />
                    Log out
                  </button>
                </form>
              </div>
            </details>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}
