import { Building2, CircleDollarSign, UsersRound } from "lucide-react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { assignCorporatePermissionAction, createCorporateWorkspaceAction } from "@/lib/admin-corporate-actions";
import { requireRole } from "@/lib/auth";
import { getAdminCorporateData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Corporate"
};

export const dynamic = "force-dynamic";

const savedMessages: Record<string, string> = {
  workspace: "Corporate workspace saved.",
  permission: "Corporate access assigned."
};

const errorMessages: Record<string, string> = {
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "workspace-invalid": "Enter company name, program name, and a valid budget.",
  "permission-invalid": "Choose a corporate account and user email.",
  "permission-missing": "Corporate account or user was not found. Create the user first, then assign access."
};

type AdminCorporatePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function AdminCorporatePage({ searchParams }: AdminCorporatePageProps) {
  await requireRole(["admin"], "/admin/corporate");
  const params = await searchParams;
  const data = await getAdminCorporateData();
  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Corporate"
        title="Corporate workspaces"
        description="Create a company workspace, assign access, and review contribution records."
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-3" aria-label="Corporate summary">
        {[
          { label: "Companies", value: data.metrics.accounts.toLocaleString("id-ID"), icon: Building2 },
          { label: "Corporate users", value: data.metrics.corporateUsers.toLocaleString("id-ID"), icon: UsersRound },
          { label: "Contributions", value: formatCurrency(data.metrics.contributionTotal), icon: CircleDollarSign }
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

      <FormTabs
        ariaLabel="Corporate administration actions"
        tabs={[
          { id: "workspace", label: "Workspace", description: "Company setup" },
          { id: "access", label: "Access", description: "Corporate users", badge: data.accounts.length.toLocaleString("id-ID") }
        ]}
      >
        <form action={createCorporateWorkspaceAction} className="grid gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create workspace</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Only the minimum fields are required now. Details can be refined later.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Company name
              <input name="accountName" className={adminInputClassName} placeholder="Nusantara Bank" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Program name
              <input name="programName" className={adminInputClassName} placeholder="Ocean Program 2026" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Budget amount
              <input name="budgetAmount" type="number" min="1" step="1000000" className={adminInputClassName} placeholder="500000000" required />
            </label>
          </div>
          <Button type="submit" className="justify-self-start">Save Workspace</Button>
        </form>

        <form action={assignCorporatePermissionAction} className="grid gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Assign corporate access</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Give an existing user access to one company workspace.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Corporate account
              <select name="corporateAccountId" className={adminSelectClassName} required>
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              User email
              <input name="email" type="email" className={adminInputClassName} placeholder="name@company.com" required />
            </label>
            <Button type="submit" className="min-h-10" disabled={data.accounts.length === 0}>Assign</Button>
          </div>
        </form>
      </FormTabs>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Corporate accounts</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Companies, programs, and assigned users.</p>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.accounts.map((account) => (
            <article key={account.id} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <h3 className="text-lg font-bold tracking-normal text-ocean-900">{account.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">/{account.slug} · {account.programs.length} programs · {account.permissions.length} users</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {account.programs.map((program) => (
                      <span key={program.id} className="min-w-0 break-words rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700 [overflow-wrap:anywhere]">
                        {program.name} · {formatCurrency(Number(program.budgetAmount))}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="min-w-0 break-words text-right text-lg font-bold text-ocean-900 [overflow-wrap:anywhere]">{formatCurrency(account.contributionTotal)}</p>
              </div>
            </article>
          ))}
          {data.accounts.length === 0 ? (
            <AdminEmptyState className="m-4" title="No corporate accounts yet" description="Create a company workspace when the first corporate partner is ready." />
          ) : null}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Recent contributions</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Company support records, separate from individual contributions.</p>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.contributions.slice(0, 20).map((contribution) => (
            <article key={contribution.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <div>
                <h3 className="font-bold text-ocean-900">{contribution.campaignTitle}</h3>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                  {contribution.accountName} · {contribution.programName} · {contribution.referenceCode}
                </p>
              </div>
              <AdminStatusBadge value={contribution.status} />
              <div className="text-right">
                <p className="min-w-0 break-words font-bold text-ocean-900 [overflow-wrap:anywhere]">{formatCurrency(contribution.amountValue)}</p>
                <p className="mt-1 text-xs font-bold uppercase text-ocean-900/48">{contribution.publicGoalLabel}</p>
              </div>
            </article>
          ))}
          {data.contributions.length === 0 ? (
            <AdminEmptyState className="m-4" title="No corporate contributions yet" description="Corporate users can create contribution records from their workspace." />
          ) : null}
        </div>
      </section>
    </div>
  );
}
