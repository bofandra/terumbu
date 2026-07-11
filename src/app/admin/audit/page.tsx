import { Filter, Search, ScrollText, UserRound } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getAdminAuditData } from "@/lib/queries";

export const metadata = {
  title: "Admin Audit"
};

export const dynamic = "force-dynamic";

type AdminAuditPageProps = {
  searchParams?: Promise<{
    action?: string;
    actor?: string;
    entityType?: string;
    q?: string;
  }>;
};

function metadataPreview(value: unknown) {
  if (!value) {
    return null;
  }

  const text = JSON.stringify(value);

  return text.length > 260 ? `${text.slice(0, 260)}...` : text;
}

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  await requireRole(["admin"], "/admin/audit");
  const params = await searchParams;
  const data = await getAdminAuditData(params);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audit"
        title="Audit log"
        description="Search admin actions by actor, entity, action, affected ID, or metadata payload."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Audit summary">
        {[
          { label: "Visible actions", value: data.metrics.visibleActions.toLocaleString("id-ID"), icon: ScrollText },
          { label: "Admin actors", value: data.metrics.humanActions.toLocaleString("id-ID"), icon: UserRound },
          { label: "System actions", value: data.metrics.systemActions.toLocaleString("id-ID"), icon: ScrollText }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={adminPanelClassName}>
        <div className="grid gap-4 border-b border-ocean-900/10 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Query events</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Latest 200 matching audit rows.</p>
          </div>
          <Filter className="size-5 text-ocean-700" aria-hidden="true" />
        </div>

        <form action="/admin/audit" className="grid gap-3 border-b border-ocean-900/10 bg-sand-50 p-4 xl:grid-cols-[minmax(220px,1fr)_220px_200px_220px_auto]">
          <label className="relative grid gap-2 text-sm font-bold text-ocean-900">
            Search
            <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-ocean-900/42" aria-hidden="true" />
            <input name="q" defaultValue={data.filters.q} placeholder="action, metadata, id, actor" className={`${adminInputClassName} pl-9`} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Action
            <select name="action" defaultValue={data.filters.action || "all"} className={adminSelectClassName}>
              <option value="all">All actions</option>
              {data.options.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Entity
            <select name="entityType" defaultValue={data.filters.entityType || "all"} className={adminSelectClassName}>
              <option value="all">All entities</option>
              {data.options.entityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {entityType}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Actor
            <select name="actor" defaultValue={data.filters.actor || "all"} className={adminSelectClassName}>
              <option value="all">All actors</option>
              {data.options.actors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor === "system" ? "System" : actor}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" tone="secondary" className="self-end rounded-lg">
            Apply
          </Button>
        </form>

        <div className="divide-y divide-ocean-900/10">
          {data.auditLogs.map((item) => {
            const preview = metadataPreview(item.metadata);

            return (
              <article key={item.id} className="p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <h2 className="text-lg font-bold tracking-normal text-ocean-900">{item.action}</h2>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                      {item.entityType}
                      {item.entityId ? ` / ${item.entityId}` : ""}
                    </p>
                    {preview ? (
                      <code className="mt-3 block break-words rounded-lg bg-sand-50 px-3 py-2 text-xs font-semibold leading-5 text-ocean-900/62">
                        {preview}
                      </code>
                    ) : null}
                    <p className="mt-3 text-sm font-bold text-kelp-700">{item.actorEmail ?? "System"}</p>
                  </div>
                  <p className="text-sm font-semibold text-ocean-900/58">{item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                </div>
              </article>
            );
          })}
          {data.auditLogs.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No audit events match"
              description="Adjust the filters or clear search terms to inspect a broader audit trail."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
