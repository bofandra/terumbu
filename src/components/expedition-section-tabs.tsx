"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ExpeditionSectionTabsProps = {
  tabs: Array<{
    id: string;
    label: string;
  }>;
};

export function ExpeditionSectionTabs({ tabs }: ExpeditionSectionTabsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

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
    <nav className="sticky top-16 z-30 border-y border-ocean-900/10 bg-white/94 backdrop-blur" aria-label="Expedition sections">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center gap-2">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition",
                activeId === tab.id ? "bg-ocean-900 text-white" : "text-ocean-900/62 hover:bg-ocean-50 hover:text-ocean-900"
              )}
            >
              {tab.label}
            </a>
          ))}
        </div>
        <a href="#booking" className="hidden min-h-10 shrink-0 items-center rounded-full bg-coral-500 px-4 text-sm font-bold text-white lg:inline-flex">
          Check Availability
        </a>
      </div>
    </nav>
  );
}
