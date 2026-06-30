"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type CampaignUpdateItem = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  dateLabel: string;
  category: string;
  responsibleTeam: string;
  href: string;
};

export type CampaignEvidenceItem = {
  title: string;
  evidenceType: string;
  fileUrl: string;
  verificationStatus: string;
  dateLabel: string;
  locationLabel: string;
};

type CampaignUpdatesEvidenceProps = {
  updates: CampaignUpdateItem[];
  evidence: CampaignEvidenceItem[];
};

function isImageUrl(value: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value) || value.includes("images.unsplash.com");
}

function FilterButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full px-4 py-2 text-sm font-bold shadow-sm ring-1 transition",
        active ? "bg-ocean-900 text-white ring-ocean-900" : "bg-white text-ocean-900 ring-ocean-900/10 hover:ring-coral-500"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CampaignUpdatesEvidence({ updates, evidence }: CampaignUpdatesEvidenceProps) {
  const updateFilters = useMemo(() => ["All", ...Array.from(new Set(updates.map((update) => update.category)))], [updates]);
  const evidenceFilters = useMemo(() => ["All", ...Array.from(new Set(evidence.map((item) => item.evidenceType)))], [evidence]);
  const [updateFilter, setUpdateFilter] = useState("All");
  const [evidenceFilter, setEvidenceFilter] = useState("All");
  const visibleUpdates = updateFilter === "All" ? updates : updates.filter((update) => update.category === updateFilter);
  const visibleEvidence = evidenceFilter === "All" ? evidence : evidence.filter((item) => item.evidenceType === evidenceFilter);

  return (
    <div className="grid gap-10">
      <div>
        <div className="flex flex-wrap gap-2">
          {updateFilters.map((filter) => (
            <FilterButton key={filter} active={filter === updateFilter} onClick={() => setUpdateFilter(filter)}>
              {filter}
            </FilterButton>
          ))}
        </div>

        <div className="mt-8 grid gap-5">
          {visibleUpdates.length > 0 ? (
            visibleUpdates.map((update) => (
              <article key={update.id} className="grid gap-5 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft md:grid-cols-[220px_1fr]">
                {update.imageUrl ? (
                  <Image src={update.imageUrl} alt={`${update.title} update photo`} width={440} height={300} className="h-48 w-full rounded-xl object-cover md:h-full" sizes="(min-width: 768px) 220px, 100vw" />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-xl bg-ocean-50 text-sm font-bold text-ocean-900/58">Update</div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">
                    {update.dateLabel} · {update.category}
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">
                    <Link href={update.href} className="hover:text-coral-700">
                      {update.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-ocean-900/68">{update.body}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Responsible team: {update.responsibleTeam}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 text-ocean-900/68 shadow-soft">No updates match this filter yet.</div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {evidenceFilters.map((filter) => (
            <FilterButton key={filter} active={filter === evidenceFilter} onClick={() => setEvidenceFilter(filter)}>
              {filter}
            </FilterButton>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {visibleEvidence.length > 0 ? (
            visibleEvidence.map((item) => (
              <article key={item.title} className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-white shadow-soft">
                {isImageUrl(item.fileUrl) ? (
                  <Image src={item.fileUrl} alt={`${item.title} evidence`} width={520} height={320} className="h-44 w-full object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
                ) : null}
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/52">{item.evidenceType}</p>
                  <h2 className="mt-3 font-bold text-ocean-900">{item.title}</h2>
                  <p className="mt-3 text-sm font-semibold text-kelp-700">{item.verificationStatus}</p>
                  <p className="mt-2 text-xs text-ocean-900/52">{item.dateLabel} · {item.locationLabel}</p>
                  <Link href={item.fileUrl} className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
                    Open evidence file
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 text-ocean-900/68 shadow-soft md:col-span-3">No evidence records match this filter yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
