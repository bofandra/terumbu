import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function pageHref(pathname: string, params: Record<string, string | number | undefined>, page: number) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  search.set("page", String(page));

  return `${pathname}?${search.toString()}`;
}

function PageLink({
  href,
  disabled,
  children
}: {
  href: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return disabled ? (
    <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 text-sm font-bold text-ocean-900/38">
      {children}
    </span>
  ) : (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
    >
      {children}
    </Link>
  );
}

export function AdminPagination({
  pathname,
  params,
  pagination,
  className
}: {
  pathname: string;
  params: Record<string, string | number | undefined>;
  pagination: Pagination;
  className?: string;
}) {
  const firstItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.totalItems, pagination.page * pagination.pageSize);

  if (pagination.totalPages <= 1 && pagination.totalItems <= pagination.pageSize) {
    return null;
  }

  return (
    <nav className={cn("flex flex-col gap-3 rounded-lg border border-ocean-900/10 bg-white px-4 py-3 text-sm font-bold text-ocean-900 shadow-soft sm:flex-row sm:items-center sm:justify-between", className)} aria-label="Pagination">
      <p className="text-ocean-900/58">
        {firstItem}-{lastItem} of {pagination.totalItems.toLocaleString("id-ID")} / Page {pagination.page} of {pagination.totalPages}
      </p>
      <div className="flex gap-2">
        <PageLink href={pageHref(pathname, params, pagination.page - 1)} disabled={!pagination.hasPrevious}>
          Previous
        </PageLink>
        <PageLink href={pageHref(pathname, params, pagination.page + 1)} disabled={!pagination.hasNext}>
          Next
        </PageLink>
      </div>
    </nav>
  );
}
