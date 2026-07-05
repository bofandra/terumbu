"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  GraduationCap,
  CircleHelp,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Megaphone,
  MessageSquare,
  ScrollText,
  ShipWheel,
  Users,
  Waves,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: AdminNavItem[];
};

const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  {
    href: "/admin/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    children: [
      { href: "/admin/campaigns", label: "Campaign list", icon: Megaphone },
      { href: "/admin/campaigns/impact-sites", label: "Impact sites", icon: MapPinned },
      { href: "/admin/campaigns/evidence", label: "Evidence", icon: FileCheck2 }
    ]
  },
  { href: "/admin/expeditions", label: "Expeditions", icon: ShipWheel },
  { href: "/admin/corporate", label: "Corporate", icon: Building2 },
  { href: "/admin/academy", label: "Academy", icon: GraduationCap },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit", icon: ScrollText }
];

function initialsForName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";
}

export function AdminShell({ children, displayName, roleLabel }: { children: ReactNode; displayName: string; roleLabel: string }) {
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
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ocean-900/54">Admin</span>
              </span>
            </Link>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0" aria-label="Admin sections">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

              return (
                <div key={item.href} className="shrink-0 lg:w-full">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold transition",
                      isActive
                        ? "bg-ocean-900 text-white shadow-soft"
                        : "text-ocean-900/70 hover:bg-ocean-50 hover:text-ocean-900"
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>

                  {item.children?.length ? (
                    <div className="mt-1 hidden border-l border-ocean-900/10 pl-4 lg:grid">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const anotherChildIsActive = item.children?.some(
                          (sibling) => sibling.href !== item.href && (pathname === sibling.href || pathname.startsWith(`${sibling.href}/`))
                        );
                        const childIsActive =
                          child.href === item.href ? isActive && !anotherChildIsActive : pathname === child.href || pathname.startsWith(`${child.href}/`);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childIsActive ? "page" : undefined}
                            className={cn(
                              "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition",
                              childIsActive
                                ? "bg-ocean-50 text-ocean-900"
                                : "text-ocean-900/58 hover:bg-ocean-50 hover:text-ocean-900"
                            )}
                          >
                            <ChildIcon className="size-3.5" aria-hidden="true" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-6 hidden rounded-lg border border-ocean-900/10 bg-sand-50 p-4 lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Operations</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/68">
              Campaigns, verification, reconciliation, and audit trails in one workspace.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between gap-4 border-b border-ocean-900/10 bg-white/94 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/admin" aria-label="Admin overview" className="flex size-11 items-center justify-center rounded-full bg-ocean-50 text-ocean-900 lg:hidden">
                <LayoutDashboard size={20} aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">Admin portal</p>
                <p className="truncate text-lg font-bold tracking-normal text-ocean-900 sm:text-xl">Operations workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin#notifications" aria-label="Notifications" className="relative flex size-11 items-center justify-center rounded-full hover:bg-ocean-50">
                <Bell size={19} aria-hidden="true" />
                <span className="absolute right-1.5 top-1.5 size-3 rounded-full bg-coral-500 ring-2 ring-white" />
              </Link>
              <Link href="mailto:support@terumbu.eco" aria-label="Help" className="hidden size-11 items-center justify-center rounded-full hover:bg-ocean-50 sm:flex">
                <CircleHelp size={19} aria-hidden="true" />
              </Link>
              <Link href="/admin/audit" aria-label="Messages" className="hidden size-11 items-center justify-center rounded-full hover:bg-ocean-50 sm:flex">
                <MessageSquare size={19} aria-hidden="true" />
              </Link>
              <details className="group relative">
                <summary aria-label="Admin account menu" className="flex cursor-pointer list-none items-center gap-3 rounded-full hover:bg-ocean-50 sm:py-1 sm:pl-1 sm:pr-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-sm font-bold text-white">
                    {initialsForName(displayName)}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-32 truncate text-sm font-bold text-ocean-900">{displayName}</span>
                    <span className="block text-xs font-semibold text-ocean-900/54">{roleLabel}</span>
                  </span>
                </summary>
                <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-ocean-900/10 bg-white p-2 shadow-soft">
                  <Link href="/admin" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                    Admin overview
                  </Link>
                  <Link href="/admin/audit" className="block rounded-xl px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                    Audit trail
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
