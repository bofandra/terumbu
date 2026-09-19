import Link from "next/link";
import { ArrowUpDown, Eye, ScrollText, UserRound } from "lucide-react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, adminInputClassName, adminSelectClassName } from "@/components/admin-ui";
import { MetricValue } from "@/components/ui/metric-value";
import { requireRole } from "@/lib/auth";
import { getAdminAuditData, type AdminAuditFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin Audit"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/audit";

type AdminAuditPageProps = {
  searchParams?: Promise<AdminAuditFilters>;
};

type AdminAuditData = Awaited<ReturnType<typeof getAdminAuditData>>;
type AdminAuditRow = AdminAuditData["auditLogs"][number];

function metadataPreview(value: unknown) {
  if (!value) {
    return "—";
  }

  try {
    const text = JSON.stringify(value);
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  } catch {
    return "Metadata available";
  }
}

function auditHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminAuditData) {
  return {
    q: data.filters.q || undefined,
    action: data.filters.action === "all" ? undefined : data.filters.action,
    entityType: data.filters.entityType === "all" ? undefined : data.filters.entityType,
    actor: data.filters.actor === "all" ? undefined : data.filters.actor,
    from: data.filters.from || undefined,
    to: data.filters.to || undefined,
    sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
    dir: data.filters.dir === "desc" ? undefined : data.filters.dir
  };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminAuditData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={auditHref({ ...listParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function actorLabel(row: AdminAuditRow) {
  return row.actorDisplayName ?? row.actorName ?? row.actorEmail ?? "System";
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await getAdminAuditData(params);
  const baseParams = listParams(data);
  const returnTo = auditHref({ ...baseParams, page: data.pagination.page });
  const columns: AdminDataTableColumn<AdminAuditRow>[] = [
    {
      key: "time",
      header: <SortHeader label="Time" sort="createdAt" data={data} />,
      render: (row) => (
        <div className="min-w-40">
          <time dateTime={row.createdAt.toISOString()} className="font-bold text-ocean-900">
            {row.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
          </time>
          <p className="mt-1 text-xs font-semibold text-ocean-900/48">
            {row.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      )
    },
    {
      key: "actor",
      header: <SortHeader label="Actor" sort="actor" data={data} />,
      render: (row) => (
        <div className="min-w-44">
          <p className={cn("font-bold", row.actorEmail ? "text-kelp-700" : "text-ocean-900/58")}>{actorLabel(row)}</p>
          {row.actorEmail ? <p className="mt-1 text-xs font-semibold text-ocean-900/48">{row.actorEmail}</p> : <p className="mt-1 text-xs font-semibold text-ocean-900/42">Automated / system</p>}
        </div>
      )
    },
    {
      key: "action",
      header: <SortHeader label="Action" sort="action" data={data} />,
      render: (row) => <span className="min-w-52 font-bold text-ocean-900">{row.action}</span>
    },
    {
      key: "entity",
      header: <SortHeader label="Entity" sort="entityType" data={data} />,
      render: (row) => (
        <div className="min-w-48">
          <p className="font-bold text-ocean-900">{row.entityType}</p>
          <p className="mt-1 break-all text-xs font-semibold text-ocean-900/48">{row.entityId ?? "No entity ID"}</p>
        </div>
      )
    },
    {
      key: "metadata",
      header: "Metadata",
      render: (row) => <code className="block max-w-md break-words text-xs font-semibold leading-5 text-ocean-900/58">{metadataPreview(row.metadata)}</code>
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (row) => (
        <Link
          href={`/admin/audit/${row.id}?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
        >
          <Eye className="size-4" aria-hidden="true" />
          Detail
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audit"
        title="Audit log"
        description="Search and inspect admin and system actions with server-side filtering, date ranges, sorting, and pagination."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Audit summary">
        {[
          { label: "Matching actions", value: data.metrics.visibleActions.toLocaleString("id-ID"), icon: ScrollText },
          { label: "Human actions", value: data.metrics.humanActions.toLocaleString("id-ID"), icon: UserRound },
          { label: "System actions", value: data.metrics.systemActions.toLocaleString("id-ID"), icon: ScrollText }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <MetricValue className="mt-3 text-ocean-900">{item.value}</MetricValue>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <AdminListToolbar
        action={pathname}
        searchValue={data.filters.q}
        searchPlaceholder="Search action, entity ID, actor, metadata"
        clearHref={pathname}
        hiddenFields={{
          sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
          dir: data.filters.dir === "desc" ? undefined : data.filters.dir
        }}
      >
        <select name="action" defaultValue={data.filters.action} className={cn(adminSelectClassName, "min-w-44")} aria-label="Filter audit action">
          <option value="all">All actions</option>
          {data.options.actions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select name="entityType" defaultValue={data.filters.entityType} className={cn(adminSelectClassName, "min-w-40")} aria-label="Filter entity type">
          <option value="all">All entities</option>
          {data.options.entityTypes.map((entityType) => (
            <option key={entityType} value={entityType}>{entityType}</option>
          ))}
        </select>
        <select name="actor" defaultValue={data.filters.actor} className={cn(adminSelectClassName, "min-w-44")} aria-label="Filter audit actor">
          <option value="all">All actors</option>
          {data.options.actors.map((actor) => (
            <option key={actor} value={actor}>{actor === "system" ? "System" : actor}</option>
          ))}
        </select>
        <label className="grid gap-1 text-xs font-bold text-ocean-900/58">
          From
          <input type="date" name="from" defaultValue={data.filters.from} className={cn(adminInputClassName, "min-w-40")} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ocean-900/58">
          To
          <input type="date" name="to" defaultValue={data.filters.to} className={cn(adminInputClassName, "min-w-40")} />
        </label>
      </AdminListToolbar>

      <AdminDataTable
        caption="Administrative audit events"
        rows={data.auditLogs}
        getRowKey={(row) => row.id}
        columns={columns}
        emptyState={<AdminEmptyState title="No audit events match" description="Adjust the filters or clear the search terms to inspect a broader audit trail." />}
      />

      <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
    </div>
  );
}
