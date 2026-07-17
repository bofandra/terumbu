"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  FileBadge,
  FileText,
  Globe2,
  Handshake,
  Home,
  LifeBuoy,
  LogOut,
  Puzzle,
  Search,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const mainNav = [
  { label: "Overview", href: "/corporate", icon: Home },
  { label: "Programs", href: "/corporate/programs", icon: BriefcaseBusiness },
  { label: "Projects", href: "/corporate/projects", icon: ShieldCheck },
  { label: "Funding & Utilization", href: "/corporate/funding", icon: FileBadge },
  { label: "Impact Metrics", href: "/corporate#impact-metrics", icon: BarChart3 },
  { label: "Employees", href: "/corporate/employees", icon: Users },
  { label: "Events & Volunteering", href: "/corporate#events", icon: CalendarDays },
  { label: "Evidence Center", href: "/corporate/evidence", icon: FileText },
  { label: "Reports", href: "/corporate/reports", icon: FileBadge },
  { label: "Public Impact Page", href: "/corporate#public-impact-page", icon: Globe2 }
];

const managementNav = [
  { label: "Partners", href: "/corporate#partners", icon: Handshake },
  { label: "Team & Access", href: "/corporate/settings", icon: Users },
  { label: "Integrations", href: "/corporate/settings#integrations", icon: Puzzle },
  { label: "Settings", href: "/corporate/settings", icon: Settings },
  { label: "Help & Support", href: "mailto:partnerships@terumbu.eco", icon: LifeBuoy }
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
  const path = href.split("#")[0] ?? href;

  return path === "/corporate" ? pathname === path || pathname === "/corporate/dashboard" : pathname === path || pathname.startsWith(`${path}/`);
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

  return (
    <div className="min-h-screen bg-mist-50 pb-16 xl:pb-0">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-ocean-900 px-5 py-6 text-white shadow-2xl xl:flex">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">T</span>
          <span className="text-2xl font-bold tracking-normal">Terumbu.eco</span>
        </Link>

        <div className="mt-8 rounded-2xl border border-white/14 bg-white/8 p-4">
          <div className="flex items-center gap-3">
            <span
              title={accountLogoUrl ? "Company logo configured" : accountName}
              className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-white/12 text-lg font-bold"
            >
              {initialsForName(accountName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase text-white">{accountName}</p>
              <p className="mt-1 truncate text-xs font-semibold text-white/62">{programName}</p>
            </div>
          </div>
          <span className="mt-4 inline-flex rounded-full bg-ocean-500/24 px-3 py-1 text-xs font-bold text-ocean-50">
            Enterprise ESG Plan
          </span>
          <dl className="mt-4 grid gap-2 text-xs text-white/64">
            <div className="flex justify-between gap-3">
              <dt>Active projects</dt>
              <dd className="font-bold text-white">{activeProjects.toLocaleString("id-ID")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Next report due</dt>
              <dd className="font-bold text-white">{nextReportDue}</dd>
            </div>
          </dl>
        </div>

        <nav className="mt-6 grid gap-1.5" aria-label="Corporate navigation">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  active ? "bg-coral-500 text-white shadow-soft" : "text-white/72 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/14 pt-5">
          <p className="px-3 text-xs font-bold uppercase text-white/42">Management</p>
          <nav className="mt-3 grid gap-1.5" aria-label="Corporate management navigation">
            {managementNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition",
                    active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto rounded-2xl border border-white/16 bg-white/8 p-4">
          <CalendarDays size={22} aria-hidden="true" className="text-coral-200" />
          <p className="mt-3 text-sm font-bold">Next reporting deadline</p>
          <p className="mt-2 text-xs leading-5 text-white/64">{nextReportDue}</p>
          <Link href="/corporate/reports" className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-white/12 px-4 text-sm font-bold text-white hover:bg-white/18">
            View Report Center
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-coral-500 text-sm font-bold">
            {initialsForName(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <p className="text-xs text-white/58">{roleLabel}</p>
          </div>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between gap-4 border-b border-ocean-900/10 bg-white/94 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/corporate" aria-label="Corporate overview" className="flex size-11 items-center justify-center rounded-full bg-ocean-50 text-ocean-900 xl:hidden">
              <Building2 size={20} aria-hidden="true" />
            </Link>
            <label className="hidden min-h-11 items-center gap-2 rounded-xl border border-ocean-900/10 bg-white px-4 text-sm font-bold text-ocean-900 shadow-sm md:flex">
              <span className="sr-only">Program</span>
              <ShieldCheck size={17} aria-hidden="true" className="text-coral-500" />
              <select className="bg-transparent outline-none" defaultValue={programName}>
                <option>{programName}</option>
                <option>All Programs</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
            <label className="hidden min-h-11 items-center gap-2 rounded-xl border border-ocean-900/10 bg-white px-4 text-sm font-bold text-ocean-900 shadow-sm lg:flex">
              <CalendarDays size={17} aria-hidden="true" className="text-ocean-700" />
              <span className="sr-only">Reporting period</span>
              <select className="bg-transparent outline-none" defaultValue="Jan-Jun 2026 (YTD)">
                <option>Jan-Jun 2026 (YTD)</option>
                <option>Q2 2026</option>
                <option>2026 Year to Date</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>

          <label className="hidden min-h-11 w-full max-w-sm items-center gap-3 rounded-full border border-ocean-900/10 bg-white px-4 text-sm font-semibold text-ocean-900/54 shadow-sm lg:flex">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search corporate workspace</span>
            <input className="w-full bg-transparent outline-none placeholder:text-ocean-900/42" placeholder="Search projects, partners, reports..." />
          </label>

          <div className="flex items-center gap-2">
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
              <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-ocean-900/10 bg-white p-2 shadow-soft">
                <Link href="/corporate" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Corporate overview
                </Link>
                <Link href="/corporate/settings" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Team & access
                </Link>
                <Link href="/corporate/reports" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                  Report center
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
    </div>
  );
}
