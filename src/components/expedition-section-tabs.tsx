"use client";

import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";

import { removeSavedExpeditionAction, saveExpeditionAction } from "@/lib/retention-actions";
import { cn } from "@/lib/utils";

type ExpeditionSectionTabsProps = {
  tabs: Array<{
    id: string;
    label: string;
  }>;
  slug: string;
  isAuthenticated: boolean;
  isSaved: boolean;
  expeditionPath: string;
  primaryActionHref: string;
  primaryActionLabel: string;
  locale?: "en" | "id";
};

export function ExpeditionSectionTabs({
  tabs,
  slug,
  isAuthenticated,
  isSaved,
  expeditionPath,
  primaryActionHref,
  primaryActionLabel,
  locale = "en"
}: ExpeditionSectionTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const labels =
    locale === "id"
      ? {
          nav: "Bagian ekspedisi",
          removeSaved: "Hapus ekspedisi tersimpan",
          save: "Simpan ekspedisi",
          signInSave: "Masuk untuk menyimpan ekspedisi"
        }
      : {
          nav: "Expedition sections",
          removeSaved: "Remove saved expedition",
          save: "Save expedition",
          signInSave: "Sign in to save expedition"
        };

  function handlePrimaryActionClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!primaryActionHref.startsWith("#")) {
      return;
    }

    event.preventDefault();
    const targetId = primaryActionHref.slice(1);
    const target = document.getElementById(targetId);

    if (!target) {
      window.location.hash = targetId;
      return;
    }

    if (window.location.hash !== primaryActionHref) {
      window.history.pushState(null, "", primaryActionHref);
    }

    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0.12, 0.28, 0.5] }
    );

    tabs.forEach((tab) => {
      const element = document.getElementById(tab.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [tabs]);

  return (
    <nav className="sticky top-20 z-30 border-y border-ocean-900/10 bg-white/96 backdrop-blur" aria-label={labels.nav}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-20 min-w-0 items-center gap-7 overflow-x-auto">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={cn(
                "whitespace-nowrap py-2 text-base font-bold transition",
                activeId === tab.id ? "text-sky-700" : "text-sky-700/78 hover:text-sky-800"
              )}
            >
              {tab.label}
            </a>
          ))}
        </div>
        <div className="hidden shrink-0 items-center gap-4 md:flex">
          {isAuthenticated ? (
            <form action={isSaved ? removeSavedExpeditionAction : saveExpeditionAction}>
              <input type="hidden" name="expeditionSlug" value={slug} />
              <input type="hidden" name="next" value={expeditionPath} />
              <button
                type="submit"
                aria-label={isSaved ? labels.removeSaved : labels.save}
                className="flex size-14 items-center justify-center rounded-full border border-ocean-900/14 bg-white text-sky-700 shadow-sm transition hover:border-sky-600 hover:text-sky-800"
              >
                <Heart size={24} aria-hidden="true" fill={isSaved ? "currentColor" : "none"} />
              </button>
            </form>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(expeditionPath)}`}
              aria-label={labels.signInSave}
              className="flex size-14 items-center justify-center rounded-full border border-ocean-900/14 bg-white text-sky-700 shadow-sm transition hover:border-sky-600 hover:text-sky-800"
            >
              <Heart size={24} aria-hidden="true" />
            </Link>
          )}
          <a
            href={primaryActionHref}
            onClick={handlePrimaryActionClick}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-kelp-500 px-8 text-lg font-bold text-white shadow-soft transition hover:bg-kelp-700"
          >
            {primaryActionLabel}
            <ArrowRight size={24} aria-hidden="true" />
          </a>
        </div>
      </div>
    </nav>
  );
}
