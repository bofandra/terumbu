import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { adminInputClassName } from "@/components/admin-ui";
import { cn } from "@/lib/utils";

export function AdminListToolbar({
  action,
  searchValue,
  searchPlaceholder = "Search",
  clearHref,
  createHref,
  createLabel,
  children,
  hiddenFields,
  className
}: {
  action: string;
  searchValue?: string;
  searchPlaceholder?: string;
  clearHref?: string;
  createHref?: string;
  createLabel?: string;
  children?: ReactNode;
  hiddenFields?: Record<string, string | number | undefined>;
  className?: string;
}) {
  return (
    <form action={action} method="GET" className={cn("rounded-lg border border-ocean-900/10 bg-white p-3 shadow-soft", className)}>
      <input type="hidden" name="page" value="1" />
      {Object.entries(hiddenFields ?? {}).map(([key, value]) =>
        value === undefined ? null : <input key={key} type="hidden" name={key} value={String(value)} />
      )}
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto] md:items-center">
        <label className="relative min-w-0">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/44" aria-hidden="true" />
          <input name="q" defaultValue={searchValue} placeholder={searchPlaceholder} className={cn(adminInputClassName, "pl-9")} />
        </label>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {children}
          {clearHref ? (
            <Link
              href={clearHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
            >
              <X className="size-4" aria-hidden="true" />
              Clear
            </Link>
          ) : null}
          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-ocean-900 px-4 text-sm font-bold text-white transition hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
          >
            Apply
          </button>
          {createHref && createLabel ? (
            <Link
              href={createHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
            >
              <Plus className="size-4" aria-hidden="true" />
              {createLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
