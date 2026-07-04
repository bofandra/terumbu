import { ScrollText, UserRound } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, adminPanelClassName } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Audit"
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireRole(["admin"], "/admin/audit");
  const data = await getAdminOperationsData();

  const systemActions = data.auditLogs.filter((item) => !item.actorEmail).length;
  const humanActions = data.auditLogs.length - systemActions;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audit"
        title="Audit log"
        description="Review recent admin actions, affected entities, and actor attribution."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Audit summary">
        {[
          { label: "Recent actions", value: data.auditLogs.length.toLocaleString("id-ID"), icon: ScrollText },
          { label: "Admin actors", value: humanActions.toLocaleString("id-ID"), icon: UserRound },
          { label: "System actions", value: systemActions.toLocaleString("id-ID"), icon: ScrollText }
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
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Recent events</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Latest 100 audit rows</p>
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.auditLogs.map((item) => (
            <article key={item.id} className="p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <h2 className="text-lg font-bold tracking-normal text-ocean-900">{item.action}</h2>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {item.entityType}
                    {item.entityId ? ` / ${item.entityId}` : ""}
                  </p>
                  <p className="mt-3 text-sm font-bold text-kelp-700">{item.actorEmail ?? "System"}</p>
                </div>
                <p className="text-sm font-semibold text-ocean-900/58">{item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
              </div>
            </article>
          ))}
          {data.auditLogs.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No audit events yet"
              description="Admin changes and system operations will appear here once the workspace starts recording activity."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
