import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Audit"
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireRole(["admin"], "/admin/audit");
  const data = await getAdminOperationsData();

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-coral-700 hover:text-coral-500">Admin overview</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Audit log</h1>
        <section className="mt-6 grid gap-4">
          {data.auditLogs.map((item) => (
            <article key={item.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h2 className="text-lg font-bold tracking-normal text-ocean-900">{item.action}</h2>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {item.entityType} {item.entityId ? `· ${item.entityId}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-ocean-900/58">{item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
              </div>
              <p className="mt-4 text-sm font-semibold text-kelp-700">{item.actorEmail ?? "System"}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
