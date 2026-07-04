import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Globe2, Handshake, Plus, UsersRound } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminPanelClassName } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Partners"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "partner-created": "Partner created.",
  "partner-updated": "Partner updated.",
  "partner-deleted": "Partner deleted.",
  "partner-user-assigned": "User assigned to partner.",
  "partner-user-created": "Partner user created.",
  "partner-user-updated": "Partner user updated.",
  "partner-user-removed": "Partner user removed."
};

const errorMessages: Record<string, string> = {
  "partner-delete": "Confirm deletion by checking the delete box.",
  "partner-has-campaigns": "Partners with campaigns cannot be deleted.",
  "partner-invalid": "Enter a partner name, slug, and type.",
  "partner-slug": "That partner slug is already in use.",
  "partner-user-exists": "That email already belongs to a user. Use assign existing user instead.",
  "partner-user-invalid": "Enter valid user details. New passwords must be at least 8 characters.",
  "partner-user-missing": "No user exists for that email.",
  "partner-missing": "Partner record was not found."
};

type AdminPartnersPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

export default async function AdminPartnersPage({ searchParams }: AdminPartnersPageProps) {
  await requireRole(["admin"], "/admin/partners");
  const params = await searchParams;
  const data = await getAdminOperationsData();

  const fieldVerified = data.partners.filter((partner) => partner.verification === "field").length;
  const documentVerified = data.partners.filter((partner) => partner.verification === "document").length;
  const activePartnerUsers = data.partners.reduce((total, partner) => total + partner.members.filter((member) => member.status === "active").length, 0);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Partners"
        title="Partner management"
        description="Review partner organizations and open a focused workspace when verification details or users need changes."
        actionHref="/admin/partners/new"
        actionLabel="New partner"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Partner summary">
        {[
          { label: "Partners", value: data.partners.length.toLocaleString("id-ID"), icon: Handshake },
          { label: "Document verified", value: documentVerified.toLocaleString("id-ID"), icon: BadgeCheck },
          { label: "Field verified", value: fieldVerified.toLocaleString("id-ID"), icon: Globe2 },
          { label: "Active partner users", value: activePartnerUsers.toLocaleString("id-ID"), icon: UsersRound }
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
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Partner directory</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Organization records, trust levels, campaign counts, and portal users.</p>
          </div>
          <Link
            href="/admin/partners/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            New partner
          </Link>
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.partners.map((partner) => (
            <article key={partner.id} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold tracking-normal text-ocean-900">{partner.name}</h3>
                    <AdminStatusBadge value={partner.verification} />
                    <AdminStatusBadge value={partner.type} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {partner.slug} / {partner.campaignCount.toLocaleString("id-ID")} campaigns / {partner.members.length.toLocaleString("id-ID")} users
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">{labelize(partner.verification)} verification</p>
                </div>
                <Link
                  href={`/admin/partners/${partner.id}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
                >
                  Manage
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
          {data.partners.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No partner organizations yet"
              description="Create the first implementation partner before assigning users, campaigns, or evidence workflows."
              actionHref="/admin/partners/new"
              actionLabel="Create partner"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
