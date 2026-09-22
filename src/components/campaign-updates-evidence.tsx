"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
  id: string;
  code: string;
  anchorId: string;
  title: string;
  evidenceType: string;
  fileUrl: string;
  verificationStatus: string;
  stageLabel: string;
  dateLabel: string;
  locationLabel: string;
  observation: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  sourceHref: string;
};

type CampaignUpdatesEvidenceProps = {
  updates: CampaignUpdateItem[];
  evidence: CampaignEvidenceItem[];
};

function isImageUrl(value: string) {
  return value.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value);
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
  const activity = useMemo(
    () => [
      ...updates.map((update) => ({
        id: `update-${update.id}`,
        anchorId: undefined,
        title: update.title,
        body: update.body,
        imageUrl: update.imageUrl,
        dateLabel: update.dateLabel,
        tag: update.category,
        kind: "Public note",
        href: update.href,
        fileUrl: undefined,
        locationLabel: update.responsibleTeam,
        status: undefined,
        metricLabel: undefined,
        metricValue: undefined,
        code: undefined
      })),
      ...evidence.map((item) => ({
        id: `review-${item.id}`,
        anchorId: item.anchorId,
        title: item.title,
        body: item.observation,
        imageUrl: isImageUrl(item.fileUrl) ? item.fileUrl : null,
        dateLabel: item.dateLabel,
        tag: item.evidenceType,
        kind: "Review attachment",
        href: item.sourceHref,
        fileUrl: item.fileUrl,
        locationLabel: item.locationLabel,
        status: item.verificationStatus,
        metricLabel: item.metricLabel,
        metricValue: item.metricValue,
        code: item.code
      }))
    ],
    [updates, evidence]
  );
  const filters = ["All", "Public note", "Review attachment"];
  const [activityFilter, setActivityFilter] = useState("All");
  const visibleActivity = activityFilter === "All" ? activity : activity.filter((item) => item.kind === activityFilter);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <FilterButton key={filter} active={filter === activityFilter} onClick={() => setActivityFilter(filter)}>
            {filter}
          </FilterButton>
        ))}
      </div>

      <div className="mt-8 grid gap-5">
        {visibleActivity.length > 0 ? (
          visibleActivity.map((item) => (
            <article id={item.anchorId} key={item.id} className="grid scroll-mt-36 gap-5 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft md:grid-cols-[220px_1fr]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={`${item.title} activity image`}
                  width={440}
                  height={300}
                  unoptimized
                  className="h-48 w-full rounded-xl object-cover md:h-full"
                  sizes="(min-width: 768px) 220px, 100vw"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl bg-ocean-50 text-sm font-bold text-ocean-900/58">Activity</div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">
                    {item.dateLabel} · {item.kind}
                  </p>
                  <span className="rounded-full bg-ocean-50 px-2 py-1 text-xs font-bold text-ocean-900">{item.tag}</span>
                  {item.status ? <span className="rounded-full bg-kelp-100 px-2 py-1 text-xs font-bold text-kelp-700">{item.status}</span> : null}
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">
                  <Link href={item.href} className="hover:text-coral-700">
                    {item.title}
                  </Link>
                </h2>
                {item.body ? <p className="mt-3 text-sm leading-6 text-ocean-900/68">{item.body}</p> : null}
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">{item.locationLabel}</p>
                {item.metricLabel && item.metricValue ? (
                  <p className="mt-3 rounded-xl bg-sand-50 px-3 py-2 text-xs font-bold text-ocean-900">
                    {item.metricLabel}: {item.metricValue}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={item.href} className="inline-flex items-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
                    Source record
                  </Link>
                  {item.fileUrl ? (
                    <Link href={item.fileUrl} className="inline-flex items-center gap-1 text-sm font-bold text-ocean-900/62 hover:text-coral-500">
                      File
                      <ExternalLink size={14} aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
                {item.code ? <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/42">{item.code}</p> : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 text-ocean-900/68 shadow-soft">No activity records match this filter yet.</div>
        )}
      </div>
    </div>
  );
}
