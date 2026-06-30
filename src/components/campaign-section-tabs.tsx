"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CampaignSectionTabsProps = {
  tabs: Array<{
    label: string;
    href: string;
  }>;
};

export function CampaignSectionTabs({ tabs }: CampaignSectionTabsProps) {
  const [activeHref, setActiveHref] = useState(tabs[0]?.href ?? "");

  useEffect(() => {
    const sections = tabs
      .map((tab) => document.querySelector(tab.href))
      .filter((section): section is Element => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveHref(`#${visible.target.id}`);
        }
      },
      {
        rootMargin: "-35% 0px -55% 0px",
        threshold: [0.05, 0.2, 0.4]
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [tabs]);

  return (
    <nav className="sticky top-20 z-30 border-y border-ocean-900/10 bg-white/95 backdrop-blur" aria-label="Campaign sections">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {tabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            aria-current={activeHref === tab.href ? "page" : undefined}
            className={cn(
              "inline-flex min-h-14 shrink-0 items-center border-b-2 px-4 text-sm font-bold transition",
              activeHref === tab.href
                ? "border-coral-500 text-ocean-900"
                : "border-transparent text-ocean-900/68 hover:border-coral-500 hover:text-ocean-900"
            )}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
