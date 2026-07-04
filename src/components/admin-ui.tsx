import Link from "next/link";
import { ArrowUpRight, FileSearch } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const adminSelectClassName =
  "min-h-10 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition focus:border-coral-500";

export const adminInputClassName =
  "min-h-10 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/38 focus:border-coral-500";

export const adminTextareaClassName =
  "min-h-24 rounded-lg border border-ocean-900/14 bg-white px-3 py-2 text-sm font-semibold leading-6 text-ocean-900 outline-none transition placeholder:text-ocean-900/38 focus:border-coral-500";

export const adminPanelClassName = "overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft";

const badgeClasses: Record<string, string> = {
  active: "bg-kelp-100 text-kelp-700",
  archived: "bg-ocean-900/8 text-ocean-900/62",
  basic: "bg-ocean-900/8 text-ocean-900/70",
  cancelled: "bg-coral-100 text-coral-700",
  completed: "bg-kelp-100 text-kelp-700",
  confirmed: "bg-kelp-100 text-kelp-700",
  document: "bg-ocean-50 text-ocean-700",
  draft: "bg-ocean-900/8 text-ocean-900/62",
  expired: "bg-coral-100 text-coral-700",
  failed: "bg-coral-100 text-coral-700",
  field: "bg-kelp-100 text-kelp-700",
  funded: "bg-kelp-100 text-kelp-700",
  paid: "bg-kelp-100 text-kelp-700",
  pending: "bg-sand-100 text-ocean-900",
  pending_payment: "bg-sand-100 text-ocean-900",
  published: "bg-ocean-50 text-ocean-700",
  rejected: "bg-coral-100 text-coral-700",
  review: "bg-sand-100 text-ocean-900",
  submitted: "bg-sand-100 text-ocean-900",
  verified: "bg-kelp-100 text-kelp-700"
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

export function AdminStatusBadge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold capitalize", badgeClasses[value] ?? badgeClasses.basic)}>
      {labelize(value)}
    </span>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62 sm:text-base">{description}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-4 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
        >
          {actionLabel}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </header>
  );
}

export function AdminEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-5", className)}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-coral-700 ring-1 ring-ocean-900/10">
            <FileSearch className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold text-ocean-900">{title}</p>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/58">{description}</p>
          </div>
        </div>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
          >
            {actionLabel}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
