"use client";

import { Children, type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type FormTab = {
  id: string;
  label: string;
  description?: string;
  badge?: string;
};

type FormTabsProps = {
  ariaLabel: string;
  tabs: FormTab[];
  children: ReactNode;
  className?: string;
  defaultTabId?: string;
};

export function FormTabs({ ariaLabel, tabs, children, className, defaultTabId }: FormTabsProps) {
  const generatedId = useId();
  const panels = Children.toArray(children);
  const firstTab = tabs[0]?.id ?? "";
  const initialTab = tabs.some((tab) => tab.id === defaultTabId) ? defaultTabId ?? firstTab : firstTab;
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : firstTab;

  function focusTab(index: number) {
    const tab = tabs[index];

    if (!tab) {
      return;
    }

    setActiveTab(tab.id);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab((index + 1) % tabs.length);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab((index - 1 + tabs.length) % tabs.length);
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  }

  return (
    <div className={cn("rounded-lg border border-ocean-900/10 bg-white shadow-soft", className)}>
      <div className="border-b border-ocean-900/10 bg-sand-50/70 p-2">
        <div role="tablist" aria-label={ariaLabel} className="flex gap-2 overflow-x-auto">
          {tabs.map((tab, index) => {
            const active = selectedTab === tab.id;
            const tabId = `${generatedId}-${tab.id}-tab`;
            const panelId = `${generatedId}-${tab.id}-panel`;

            return (
              <button
                key={tab.id}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={panelId}
                tabIndex={active ? 0 : -1}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  "min-h-12 shrink-0 rounded-lg px-3 py-2 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2 sm:px-4",
                  active ? "bg-ocean-900 text-white shadow-soft" : "bg-white text-ocean-900/68 ring-1 ring-ocean-900/10 hover:text-ocean-900"
                )}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.badge ? (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/18 text-white" : "bg-ocean-50 text-ocean-700")}>
                      {tab.badge}
                    </span>
                  ) : null}
                </span>
                {tab.description ? <span className={cn("mt-1 block text-xs font-semibold", active ? "text-white/72" : "text-ocean-900/48")}>{tab.description}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab, index) => {
        const active = selectedTab === tab.id;
        const tabId = `${generatedId}-${tab.id}-tab`;
        const panelId = `${generatedId}-${tab.id}-panel`;

        return (
          <div
            key={tab.id}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            tabIndex={active ? 0 : undefined}
            hidden={!active}
            className="p-4 sm:p-5"
          >
            {panels[index] ?? null}
          </div>
        );
      })}
    </div>
  );
}
