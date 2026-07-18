"use client";

import { Heart, Menu, Search, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { navItems } from "@/lib/data";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/15 bg-ocean-900/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Terumbu.eco home">
          <span className="flex size-10 items-center justify-center rounded-full bg-coral-500 text-white">
            <Heart size={19} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-normal">Terumbu.eco</span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
          {navItems.map((item) => {
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
          <button
            aria-label="Search"
            className="flex size-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Search size={19} aria-hidden="true" />
          </button>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
            aria-label="Login"
          >
            <UserCircle size={19} aria-hidden="true" />
            Login
          </Link>
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-white/88 hover:bg-white/10"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-xl px-3 py-3 text-sm font-semibold text-white/88 hover:bg-white/10"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
