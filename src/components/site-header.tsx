"use client";

import { FileBadge, LayoutDashboard, LogOut, Menu, Settings, UserCircle, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { navItems } from "@/lib/data";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import { isPublicSeoPath, localizedSeoPath, publicLocaleHref, resolveLocalizedPublicPath } from "@/lib/public-locale-routing";
import { setPublicPreferencesAction } from "@/lib/user-preferences-actions";

type SiteHeaderUser = {
  displayName: string;
  email: string;
  heroLevel: number | null;
  dashboardHref: string;
};

function initialsForDisplayName(displayName: string) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "OH";
}

function levelLabel(heroLevel: number | null) {
  return heroLevel ? `Ocean Hero L${heroLevel}` : "Ocean Hero";
}

export function SiteHeader({
  user,
  locale = "en",
  displayCurrency = "USD"
}: {
  user?: SiteHeaderUser | null;
  locale?: "en" | "id";
  displayCurrency?: "USD" | "EUR" | "IDR" | "JPY";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const labels =
    locale === "id"
      ? {
          explore: "Jelajahi",
          support: "Dukung",
          impact: "Dampak",
          learn: "Belajar",
          dashboard: "Dasbor",
          myImpact: "Dampak Saya",
          settings: "Pengaturan akun",
          logout: "Keluar",
          login: "Masuk",
          join: "Gabung"
        }
      : {
          explore: "Explore",
          support: "Support",
          impact: "Impact",
          learn: "Learn",
          dashboard: "Dashboard",
          myImpact: "My Impact",
          settings: "Account settings",
          logout: "Log out",
          login: "Login",
          join: "Join"
        };
  const localizedNavItems = navItems.map((item) => ({
    ...item,
    href: publicLocaleHref(item.href, locale),
    originalHref: item.href,
    label:
      item.href === "/expeditions"
        ? labels.explore
        : item.href === "/campaigns"
          ? labels.support
          : item.href === "/impact-map"
            ? labels.impact
            : item.href === "/academy"
              ? labels.learn
              : item.label
  }));

  function updatePreferences(formData: FormData) {
    startTransition(async () => {
      await setPublicPreferencesAction(formData);
      const requested = formData.get("locale");
      const nextLocale = requested === "id" ? "id" : "en";
      const currentPublicRoute = resolveLocalizedPublicPath(pathname)?.path ??
        (isPublicSeoPath(pathname) ? pathname : null);
      if (currentPublicRoute && nextLocale !== locale) {
        router.replace(localizedSeoPath(currentPublicRoute, nextLocale));
      } else {
        router.refresh();
      }
    });
  }
  const initials = user ? initialsForDisplayName(user.displayName) : null;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <header className="public-header sticky top-0 z-50 border-b border-[var(--public-rule)] bg-[#fffefb]/95 text-[var(--public-ink)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={localizedSeoPath("/", locale)} className="inline-flex shrink-0 items-center" aria-label="Terumbu.world">
          <Image src="/terumbu/terumbu-logo.png" alt="" width={1600} height={321} sizes="(min-width: 640px) 154px, 136px" className="h-auto w-[136px] sm:w-[154px]" />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
          {localizedNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`) ||
              pathname === item.originalHref || pathname.startsWith(`${item.originalHref}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-[#19263a]/80 transition hover:bg-[var(--public-blue-light)] hover:text-[var(--public-navy)]",
                  isActive && "bg-[var(--public-blue-light)] text-[var(--public-navy)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <form action={updatePreferences} className="flex items-center gap-1 rounded-full border border-[var(--public-rule)] bg-white p-1">
            <select
              name="locale"
              defaultValue={locale}
              aria-label="Language"
              disabled={isPending}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="min-h-9 rounded-full bg-transparent px-2 text-xs font-bold text-[var(--public-ink)] disabled:opacity-60"
            >
              <option value="en" className="text-ocean-900">EN</option>
              <option value="id" className="text-ocean-900">ID</option>
            </select>
            <select
              name="currency"
              defaultValue={displayCurrency}
              aria-label="Display currency"
              disabled={isPending}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="min-h-9 rounded-full bg-transparent px-2 text-xs font-bold text-[var(--public-ink)] disabled:opacity-60"
            >
              {["IDR", "USD", "JPY", "EUR"].map((currency) => (
                <option key={currency} value={currency} className="text-ocean-900">{currency}</option>
              ))}
            </select>
          </form>
          {user ? (
            <details className="group relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-full px-2 py-1 text-left transition hover:bg-[var(--public-blue-light)]">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--public-lime)] text-xs font-bold text-[var(--public-navy)]">{initials}</span>
                <span className="min-w-0 pr-2">
                  <span className="block max-w-36 truncate text-sm font-bold text-[var(--public-ink)]">{user.displayName}</span>
                  <span className="block max-w-36 truncate text-xs font-semibold text-[#19263a]/70">{levelLabel(user.heroLevel)}</span>
                </span>
              </summary>
              <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-[var(--public-rule)] bg-white p-2 text-ocean-900 shadow-soft">
                <div className="border-b border-ocean-900/10 px-3 py-3">
                  <p className="truncate text-sm font-bold">{user.displayName}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-ocean-900/54">{user.email}</p>
                </div>
                <Link href={user.dashboardHref} className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-ocean-50">
                  <LayoutDashboard size={16} aria-hidden="true" />
                  {labels.dashboard}
                </Link>
                <Link href="/dashboard/impact" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-ocean-50">
                  <FileBadge size={16} aria-hidden="true" />
                  {labels.myImpact}
                </Link>
                <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-ocean-50">
                  <Settings size={16} aria-hidden="true" />
                  {labels.settings}
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-coral-700 hover:bg-coral-100">
                    <LogOut size={16} aria-hidden="true" />
                    {labels.logout}
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[var(--public-ink)] transition hover:bg-[var(--public-blue-light)]"
                aria-label={labels.login}
              >
                <UserCircle size={18} aria-hidden="true" />
                {labels.login}
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--public-blue)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--public-navy)]"
              >
                {labels.join}
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label={locale === "id" ? "Buka atau tutup menu" : "Toggle menu"}
          aria-expanded={isOpen}
          aria-controls="public-mobile-navigation"
          className="flex size-11 items-center justify-center rounded-full border border-[var(--public-rule)] text-[var(--public-navy)] xl:hidden"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
        </button>
      </div>

      {isOpen ? (
        <div id="public-mobile-navigation" className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-[var(--public-rule)] bg-[var(--public-paper)] px-4 py-5 xl:hidden">
          <nav className="grid gap-2" aria-label="Mobile navigation">
            <form action={updatePreferences} className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-[var(--public-rule)] bg-[var(--public-cream)] p-2">
              <select
                name="locale"
                defaultValue={locale}
                aria-label="Language"
                disabled={isPending}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="min-h-10 rounded-full border border-[var(--public-rule)] bg-white px-2 text-sm font-bold text-ocean-900 disabled:opacity-60"
              >
                <option value="en">English</option>
                <option value="id">Indonesia</option>
              </select>
              <select
                name="currency"
                defaultValue={displayCurrency}
                aria-label="Display currency"
                disabled={isPending}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="min-h-10 rounded-full border border-[var(--public-rule)] bg-white px-2 text-sm font-bold text-ocean-900 disabled:opacity-60"
              >
                {["IDR", "USD", "JPY", "EUR"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </form>
            {localizedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-[var(--public-ink)] hover:bg-[var(--public-blue-light)]"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <div className="mt-3 rounded-2xl border border-[var(--public-rule)] bg-[var(--public-cream)] p-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-[var(--public-lime)] text-xs font-bold text-[var(--public-navy)]">{initials}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--public-ink)]">{user.displayName}</span>
                    <span className="block truncate text-xs font-semibold text-[#19263a]/70">{user.email}</span>
                  </span>
                </div>
                <div className="mt-3 grid gap-1">
                  <Link href={user.dashboardHref} className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--public-ink)] hover:bg-[var(--public-blue-light)]" onClick={() => setIsOpen(false)}>
                    {labels.dashboard}
                  </Link>
                  <Link href="/dashboard/impact" className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--public-ink)] hover:bg-[var(--public-blue-light)]" onClick={() => setIsOpen(false)}>
                    {labels.myImpact}
                  </Link>
                  <Link href="/dashboard/settings" className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--public-ink)] hover:bg-[var(--public-blue-light)]" onClick={() => setIsOpen(false)}>
                    {labels.settings}
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-coral-700 hover:bg-[var(--public-blue-light)]">
                      {labels.logout}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-3 text-center text-sm font-semibold text-[var(--public-ink)] hover:bg-[var(--public-blue-light)]"
                  onClick={() => setIsOpen(false)}
                >
                  {labels.login}
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-[var(--public-blue)] px-3 py-3 text-center text-sm font-bold text-white hover:bg-[var(--public-navy)]"
                  onClick={() => setIsOpen(false)}
                >
                  {labels.join}
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
