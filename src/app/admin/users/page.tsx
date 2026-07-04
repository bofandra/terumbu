import { Mail, UserRound, Users } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, adminPanelClassName } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Users"
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole(["admin"], "/admin/users");
  const data = await getAdminOperationsData();

  const namedUsers = data.users.filter((user) => user.displayName || user.name).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Users"
        title="User support"
        description="Scan recent accounts and identify the user records that may need support follow-up."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="User summary">
        {[
          { label: "Recent users", value: data.users.length.toLocaleString("id-ID"), icon: Users },
          { label: "Named profiles", value: namedUsers.toLocaleString("id-ID"), icon: UserRound },
          { label: "Email records", value: data.users.length.toLocaleString("id-ID"), icon: Mail }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-sand-100 text-ocean-900">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Recent accounts</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Latest 100 user records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sand-50 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/58">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-900/10">
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-4 font-bold text-ocean-900">{user.displayName ?? user.name ?? user.email}</td>
                  <td className="px-4 py-4 font-semibold text-ocean-900/62">{user.email}</td>
                  <td className="px-4 py-4 text-right font-semibold text-ocean-900/62">{user.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</td>
                </tr>
              ))}
              {data.users.length === 0 ? (
                <tr>
                  <td className="px-4 py-4" colSpan={3}>
                    <AdminEmptyState
                      title="No user accounts yet"
                      description="New supporter, partner, corporate, and admin accounts will appear here after registration or account creation."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
