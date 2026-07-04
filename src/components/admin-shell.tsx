"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  ScrollText,
  ShipWheel,
  Users,
  Waves,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

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
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit", icon: ScrollText }
];

export function AdminShell({ children }: { children: ReactNode }) {
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
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 lg:mt-5 lg:w-full lg:justify-between"
            >
              Dashboard
              <ArrowUpRight className="size-4" aria-hidden="true" />
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

        <section className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
