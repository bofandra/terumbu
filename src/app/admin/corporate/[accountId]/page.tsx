import Link from "next/link";
import { Building2, CircleDollarSign, Save, Trash2, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader, AdminStatusBadge, adminInputClassName, adminPanelClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import {
  assignCorporatePermissionAction,
  removeCorporatePermissionAction,
  updateCorporateAccountAction
} from "@/lib/admin-corporate-actions";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { getAdminCorporateWorkspaceData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Manage Corporate Workspace"
};

export const dynamic = "force-dynamic";

const savedMessages: Record<string, string> = {
  workspace: "Corporate account created. Assign Corporate Admin access, then that admin can create programs.",
  account: "Corporate account updated.",
  permission: "Corporate access assigned.",
  "permission-removed": "Corporate access removed."
};

const errorMessages: Record<string, string> = {
  "account-invalid": "Enter a valid company name and slug.",
  "account-missing": "Corporate account was not found.",
  "account-slug": "That corporate slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "permission-invalid": "Choose a valid corporate account and user email.",
  "permission-missing": "Corporate account, access row, or user was not found.",
  "program-owned": "Corporate programs are managed by Corporate Admin in the Corporate Portal."
};

type AdminCorporateDetailPageProps = {
  params: Promise<{
    accountId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    tab?: string;
  }>;
};

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
    </label>
  );
}

export default async function AdminCorporateDetailPage({ params, searchParams }: AdminCorporateDetailPageProps) {
  const [{ accountId }, query] = await Promise.all([params, searchParams]);
  await requireRole(["admin"], `/admin/corporate/${accountId}`);
  const data = await observeAdminDataLoader("admin.corporate.workspace", () => getAdminCorporateWorkspaceData(accountId));

  if (!data) {
    notFound();
  }

  const account = data.account;
  const savedMessage = query?.saved ? savedMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Corporate / Workspace"
        title={account.name}
        description={`/${account.slug} · ${account.programCount} programs · ${account.userCount} users`}
        actionHref="/admin/corporate"
        actionLabel="Corporate list"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Corporate workspace summary">
        {[
          { label: "Programs", value: account.programCount.toLocaleString("id-ID"), icon: Building2 },
          { label: "Active programs", value: account.activeProgramCount.toLocaleString("id-ID"), icon: Building2 },
          { label: "Corporate users", value: account.userCount.toLocaleString("id-ID"), icon: UsersRound },
          { label: "Contributions", value: account.contributionCount.toLocaleString("id-ID"), icon: CircleDollarSign }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <MetricValue className="mt-2 text-ocean-900">{item.value}</MetricValue>
                </div>
                <Icon className="size-5 text-ocean-700" aria-hidden="true" />
              </div>
            </article>
          );
        })}
      </section>

      <FormTabs
        ariaLabel="Corporate workspace management"
        defaultTabId={query?.tab}
        syncQueryParam="tab"
        tabs={[
          { id: "account", label: "Account", description: "Company identity" },
          { id: "programs", label: "Programs", description: "Monitoring only", badge: data.programs.length.toLocaleString("id-ID") },
          { id: "users", label: "Users", description: "Workspace access", badge: data.permissions.length.toLocaleString("id-ID") }
        ]}
      >
        <section className={adminPanelClassName}>
          <div className="border-b border-ocean-900/10 p-4">
            <h2 className="text-xl font-bold text-ocean-900">Corporate account</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Manage the company identity shown across the platform.</p>
          </div>
          <form action={updateCorporateAccountAction} encType="multipart/form-data" className="grid gap-4 p-4">
            <input type="hidden" name="returnTo" value={`/admin/corporate/${account.id}?tab=account`} />
            <input type="hidden" name="corporateAccountId" value={account.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Company name">
                <input name="accountName" defaultValue={account.name} className={adminInputClassName} required />
              </Field>
              <Field label="Slug">
                <input name="accountSlug" defaultValue={account.slug} className={adminInputClassName} required />
              </Field>
            </div>
            <Field label="Replace logo">
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
            </Field>
            <Button type="submit" tone="secondary" className="w-fit rounded-lg">
              <Save className="size-4" aria-hidden="true" />
              Save corporate account
            </Button>
          </form>
        </section>

        <section className="grid gap-4">
          <div className="rounded-lg border border-kelp-700/20 bg-kelp-100/50 p-4">
            <h2 className="font-bold text-ocean-900">Programs are owned by Corporate Admin</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/60">
              Platform Admin can monitor program lifecycle and budget, but cannot create, edit, archive, or change program status.
            </p>
          </div>

          <div className="grid gap-3">
            {data.programs.map((program) => (
              <article key={program.id} className={adminPanelClassName}>
                <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-lg font-bold text-ocean-900">{program.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/54">/{program.slug}</p>
                  </div>
                  <AdminStatusBadge value={program.status} />
                </div>
                <dl className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg bg-sand-50 p-3">
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Starts</dt>
                    <dd className="mt-2 font-bold text-ocean-900">{program.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</dd>
                  </div>
                  <div className="rounded-lg bg-sand-50 p-3">
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Ends</dt>
                    <dd className="mt-2 font-bold text-ocean-900">{program.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</dd>
                  </div>
                  <div className="rounded-lg bg-sand-50 p-3">
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Budget</dt>
                    <dd className="mt-2 font-bold text-ocean-900">{formatCurrency(program.budgetAmount, program.currency)}</dd>
                  </div>
                  <div className="rounded-lg bg-sand-50 p-3">
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Currency</dt>
                    <dd className="mt-2 font-bold text-ocean-900">{program.currency}</dd>
                  </div>
                </dl>
              </article>
            ))}
            {data.programs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5">
                <p className="font-bold text-ocean-900">No programs yet.</p>
                <p className="mt-1 text-sm font-semibold text-ocean-900/54">
                  Assign a Corporate Admin to this account. The Corporate Admin can create the first program from the Corporate Portal.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4">
          <section className={adminPanelClassName}>
            <div className="border-b border-ocean-900/10 p-4">
              <h2 className="text-xl font-bold text-ocean-900">Corporate users</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">Grant or remove access to this company workspace.</p>
            </div>
            <div className="grid gap-3 p-4">
              {data.permissions.map((permission) => (
                <div key={permission.id} className="flex flex-col justify-between gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-ocean-900">{permission.displayName ?? permission.name ?? permission.email}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/54">{permission.email}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">{permission.permission}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/users/${permission.userId}`} className="inline-flex min-h-10 items-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
                      Manage user
                    </Link>
                    <form action={removeCorporatePermissionAction}>
                      <input type="hidden" name="returnTo" value={`/admin/corporate/${account.id}?tab=users`} />
                      <input type="hidden" name="permissionId" value={permission.id} />
                      <Button type="submit" tone="ghost" className="min-h-10 rounded-lg px-3 text-coral-700 hover:bg-coral-100">
                        <Trash2 className="size-4" aria-hidden="true" />
                        Remove access
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {data.permissions.length === 0 ? <p className="text-sm font-semibold text-ocean-900/54">No users assigned.</p> : null}
            </div>
          </section>

          <section className={adminPanelClassName}>
            <div className="border-b border-ocean-900/10 p-4">
              <h2 className="text-lg font-bold text-ocean-900">Assign existing user</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">The user account must already exist.</p>
            </div>
            <form action={assignCorporatePermissionAction} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="returnTo" value={`/admin/corporate/${account.id}?tab=users`} />
              <input type="hidden" name="corporateAccountId" value={account.id} />
              <Field label="User email">
                <input name="email" type="email" className={adminInputClassName} placeholder="name@company.com" required />
              </Field>
              <Button type="submit" className="min-h-10 rounded-lg px-4">Assign access</Button>
            </form>
          </section>
        </section>
      </FormTabs>
    </div>
  );
}
