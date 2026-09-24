"use client";

import { FileBadge, Heart, LayoutDashboard, LogOut, Menu, Settings, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { navItems } from "@/lib/data";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
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
          donations: "Donasi",
          expeditions: "Ekspedisi",
          destinations: "Destinasi",
          academy: "Akademi",
          impactMap: "Peta Dampak",
          about: "Tentang",
          dashboard: "Dasbor",
          myImpact: "Dampak Saya",
          settings: "Pengaturan akun",
          logout: "Keluar",
          login: "Masuk",
          apply: "Terapkan"
        }
      : {
          donations: "Donations",
          expeditions: "Expeditions",
          destinations: "Destinations",
          academy: "Academy",
          impactMap: "Impact Map",
          about: "About",
          dashboard: "Dashboard",
          myImpact: "My Impact",
          settings: "Account settings",
          logout: "Log out",
          login: "Login",
          apply: "Apply"
        };
  const localizedNavItems = navItems.map((item) => ({
    ...item,
    label:
      item.href === "/campaigns"
        ? labels.donations
        : item.href === "/expeditions"
          ? labels.expeditions
          : item.href === "/destinations"
          ? labels.destinations
          : item.href === "/academy"
            ? labels.academy
            : item.href === "/impact-map"
              ? labels.impactMap
              : item.href === "/about"
                ? labels.about
                : item.label
  }));

  function updatePreferences(formData: FormData) {
    startTransition(async () => {
      await setPublicPreferencesAction(formData);
      router.refresh();
    });
  }
  const initials = user ? initialsForDisplayName(user.displayName) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/15 bg-ocean-900/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Terumbu.eco home">
          <span className="flex size-10 items-center justify-center rounded-full bg-kelp-500 text-white">
            <Heart size={19} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-normal">Terumbu.eco</span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
          {localizedNavItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-white/78 transition hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/12 text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <form action={updatePreferences} className="flex items-center gap-1 rounded-full border border-white/15 bg-white/8 p-1">
            <select name="locale" defaultValue={locale} aria-label="Language" className="rounded-full bg-transparent px-2 py-2 text-xs font-bold text-white outline-none">
              <option value="en" className="text-ocean-900">EN</option>
              <option value="id" className="text-ocean-900">ID</option>
            </select>
            <select name="currency" defaultValue={displayCurrency} aria-label="Display currency" className="rounded-full bg-transparent px-2 py-2 text-xs font-bold text-white outline-none">
              {["USD", "EUR", "IDR", "JPY"].map((currency) => (
                <option key={currency} value={currency} className="text-ocean-900">{currency}</option>
              ))}
            </select>
            <button type="submit" disabled={isPending} className="rounded-full bg-white/12 px-2.5 py-2 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-50">
              {isPending ? "…" : labels.apply}
            </button>
          </form>
          {user ? (
            <details className="group relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-full px-2 py-1 text-left transition hover:bg-white/10">
                <span className="flex size-9 items-center justify-center rounded-full bg-kelp-500 text-xs font-bold text-white">{initials}</span>
                <span className="min-w-0 pr-2">
                  <span className="block max-w-36 truncate text-sm font-bold text-white">{user.displayName}</span>
                  <span className="block max-w-36 truncate text-xs font-semibold text-white/58">{levelLabel(user.heroLevel)}</span>
                </span>
              </summary>
              <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-white/12 bg-white p-2 text-ocean-900 shadow-soft">
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
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
              aria-label="Login"
            >
              <UserCircle size={19} aria-hidden="true" />
              {labels.login}
            </Link>
          )}
        </div>

        <button
          aria-label="Toggle menu"
          className="flex size-11 items-center justify-center rounded-full text-white xl:hidden"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-white/10 bg-ocean-900 px-4 py-5 lg:hidden">
          <nav className="grid gap-2" aria-label="Mobile navigation">
            <form action={updatePreferences} className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-white/12 bg-white/8 p-2">
              <select name="locale" defaultValue={locale} aria-label="Language" className="min-h-10 rounded-lg bg-white px-2 text-sm font-bold text-ocean-900">
                <option value="en">English</option>
                <option value="id">Indonesia</option>
              </select>
              <select name="currency" defaultValue={displayCurrency} aria-label="Display currency" className="min-h-10 rounded-lg bg-white px-2 text-sm font-bold text-ocean-900">
                {["USD", "EUR", "IDR", "JPY"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
              <button type="submit" disabled={isPending} className="rounded-lg bg-kelp-500 px-3 text-xs font-bold text-white">
                {isPending ? "…" : labels.apply}
              </button>
            </form>
            {localizedNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-white/88 hover:bg-white/10"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <div className="mt-3 rounded-2xl border border-white/12 bg-white/8 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-kelp-500 text-xs font-bold text-white">{initials}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">{user.displayName}</span>
                    <span className="block truncate text-xs font-semibold text-white/58">{user.email}</span>
                  </span>
                </div>
                <div className="mt-3 grid gap-1">
                  <Link href={user.dashboardHref} className="rounded-xl px-3 py-2 text-sm font-semibold text-white/88 hover:bg-white/10" onClick={() => setIsOpen(false)}>
                    {labels.dashboard}
                  </Link>
                  <Link href="/dashboard/impact" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/88 hover:bg-white/10" onClick={() => setIsOpen(false)}>
                    {labels.myImpact}
                  </Link>
                  <Link href="/dashboard/settings" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/88 hover:bg-white/10" onClick={() => setIsOpen(false)}>
                    {labels.settings}
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-coral-200 hover:bg-white/10">
                      {labels.logout}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-xl px-3 py-3 text-sm font-semibold text-white/88 hover:bg-white/10"
                onClick={() => setIsOpen(false)}
              >
                {labels.login}
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
