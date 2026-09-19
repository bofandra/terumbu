"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  GraduationCap,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ReceiptText,
  ScrollText,
  ShipWheel,
  Users,
  Waves,
  X,
  type LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/campaigns", label: "Projects", icon: FileCheck2 },
  { href: "/admin/expeditions", label: "Expeditions", icon: ShipWheel },
  { href: "/admin/campaigns/evidence", label: "Evidence", icon: FileCheck2 },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/corporate", label: "Corporate", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: ReceiptText },
  { href: "/admin/academy", label: "Academy", icon: GraduationCap },
  { href: "/admin/community", label: "Community", icon: MessageCircle },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
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

function navItemIsActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  if (href === "/admin/campaigns") {
    return pathname === href || (pathname.startsWith("/admin/campaigns/") && !pathname.startsWith("/admin/campaigns/evidence"));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentTaskForPath(pathname: string) {
  const activeItem = adminNavItems
    .filter((item) => navItemIsActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return activeItem?.label ?? "Overview";
}

function AdminNavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="grid gap-2" aria-label="Admin sections">
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = navItemIsActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2",
              isActive ? "bg-ocean-900 text-white" : "text-ocean-900/70 hover:bg-ocean-50 hover:text-ocean-900"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children, displayName, roleLabel }: { children: ReactNode; displayName: string; roleLabel: string }) {
  const pathname = usePathname();
  const currentTask = currentTaskForPath(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const panel = mobileNavPanelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => (panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)) : []);

    requestAnimationFrame(() => focusables()[0]?.focus());

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => mobileNavButtonRef.current?.focus());
    };
  }, [mobileNavOpen]);

  return (
    <main className="min-h-screen bg-sand-50 text-ocean-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
        <aside className="hidden border-ocean-900/10 bg-white px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:block lg:min-h-screen lg:w-64 lg:border-r lg:px-5 lg:py-6">
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

          <div className="mt-5">
            <AdminNavLinks pathname={pathname} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between gap-4 border-b border-ocean-900/10 bg-white/94 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={mobileNavButtonRef}
                type="button"
                aria-label="Open admin navigation"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
                className="flex size-11 items-center justify-center rounded-full bg-ocean-50 text-ocean-900 transition hover:bg-ocean-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2 lg:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">Admin portal</p>
                <p className="truncate text-lg font-bold tracking-normal text-ocean-900 sm:text-xl">{currentTask}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                <div className="absolute right-0 mt-3 w-64 rounded-lg border border-ocean-900/10 bg-white p-2 shadow-soft">
                  <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                    Admin overview
                  </Link>
                  <Link href="/admin/audit" className="block rounded-lg px-3 py-2 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                    Audit trail
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-coral-700 hover:bg-coral-100">
                      <LogOut size={16} aria-hidden="true" />
                      Log out
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </header>

          {mobileNavOpen ? (
            <div className="fixed inset-0 z-50 bg-ocean-950/60 lg:hidden">
              <div className="flex min-h-full">
                <div
                  ref={mobileNavPanelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-mobile-navigation-title"
                  className="w-[min(86vw,22rem)] overflow-y-auto bg-white p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Link href="/" className="inline-flex items-center gap-3" onClick={() => setMobileNavOpen(false)}>
                      <span className="grid size-10 place-items-center rounded-lg bg-ocean-900 text-white">
                        <Waves className="size-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span id="admin-mobile-navigation-title" className="block text-base font-bold text-ocean-900">Terumbu.eco Admin</span>
                        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ocean-900/54">Navigation</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Close admin navigation"
                      onClick={() => setMobileNavOpen(false)}
                      className="grid size-11 place-items-center rounded-full bg-ocean-50 text-ocean-900 transition hover:bg-ocean-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-5">
                    <AdminNavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
                  </div>
                </div>
                <button type="button" tabIndex={-1} aria-label="Close admin navigation" className="min-w-0 flex-1" onClick={() => setMobileNavOpen(false)} />
              </div>
            </div>
          ) : null}

          <section className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-5xl">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
