import { Building2, CircleDollarSign, ShieldCheck, UsersRound } from "lucide-react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { createCorporateWorkspaceAction, assignCorporatePermissionAction } from "@/lib/admin-corporate-actions";
import { requireRole } from "@/lib/auth";
import { getAdminCorporateData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Corporate"
};

export const dynamic = "force-dynamic";

const savedMessages: Record<string, string> = {
  workspace: "Corporate workspace saved.",
  permission: "Corporate permission assigned."
};

const errorMessages: Record<string, string> = {
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "workspace-invalid": "Enter a valid company, program, reporting period, and budget.",
  "permission-invalid": "Choose a corporate account and user email.",
  "permission-missing": "Corporate account or user was not found. Create the user first, then assign access."
};

type AdminCorporatePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function AdminCorporatePage({ searchParams }: AdminCorporatePageProps) {
  await requireRole(["admin"], "/admin/corporate");
  const params = await searchParams;
  const data = await getAdminCorporateData();
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1);
  const defaultEnd = new Date(now.getFullYear(), 11, 31);
  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Corporate"
        title="Corporate workspace management"
        description="Create corporate ESG/CSR workspaces, assign corporate users, and monitor contribution records separately from individual donations."
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Corporate summary">
        {[
          { label: "Corporate accounts", value: data.metrics.accounts.toLocaleString("id-ID"), icon: Building2 },
          { label: "Active programs", value: data.metrics.activePrograms.toLocaleString("id-ID"), icon: ShieldCheck },
          { label: "Corporate users", value: data.metrics.corporateUsers.toLocaleString("id-ID"), icon: UsersRound },
          { label: "Contribution ledger", value: formatCurrency(data.metrics.contributionTotal), icon: CircleDollarSign },
          { label: "Public goal impact", value: formatCurrency(data.metrics.publicGoalContribution), icon: CircleDollarSign }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <form action={createCorporateWorkspaceAction} className={`${adminPanelClassName} p-4`}>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create or update workspace</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
            This creates the corporate account and first reporting program. No real payment gateway is used in this phase.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Company name
              <input name="accountName" className={adminInputClassName} placeholder="Blue Carbon Indonesia" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Company slug
              <input name="accountSlug" className={adminInputClassName} placeholder="blue-carbon-indonesia" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900 md:col-span-2">
              Upload logo
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Program name
              <input name="programName" className={adminInputClassName} placeholder="2026 Ocean CSR Portfolio" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Program slug
              <input name="programSlug" className={adminInputClassName} placeholder="2026-ocean-csr-portfolio" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Starts at
              <input name="startsAt" type="date" defaultValue={dateInput(defaultStart)} className={adminInputClassName} required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Ends at
              <input name="endsAt" type="date" defaultValue={dateInput(defaultEnd)} className={adminInputClassName} required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Budget amount
              <input name="budgetAmount" type="number" min="1" step="1000000" className={adminInputClassName} placeholder="500000000" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Currency
              <input name="currency" defaultValue="IDR" className={adminInputClassName} maxLength={8} />
            </label>
          </div>
          <Button type="submit" className="mt-4">Save Workspace</Button>
        </form>

        <form action={assignCorporatePermissionAction} className={`${adminPanelClassName} p-4`}>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Assign corporate access</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
            Assign an existing app user to a corporate account. Create the user first from Admin Users if the email does not exist.
          </p>
          <div className="mt-4 grid gap-3">
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
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Permission
              <select name="permission" defaultValue="esg_manager" className={adminSelectClassName}>
                <option value="program.manage">Program Admin</option>
                <option value="esg_manager">ESG Manager</option>
                <option value="finance_reviewer">Finance Reviewer</option>
                <option value="employee_engagement">Employee Engagement</option>
                <option value="executive_viewer">Executive Viewer</option>
                <option value="auditor">Auditor</option>
              </select>
            </label>
          </div>
          <Button type="submit" className="mt-4" disabled={data.accounts.length === 0}>Assign Access</Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Corporate accounts</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Programs, users, and contribution ledger totals by company.</p>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.accounts.map((account) => (
            <article key={account.id} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <h3 className="text-lg font-bold tracking-normal text-ocean-900">{account.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">/{account.slug} · {account.programs.length} programs · {account.permissions.length} access rows</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {account.programs.map((program) => (
                      <span key={program.id} className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">
                        {program.name} · {formatCurrency(Number(program.budgetAmount))}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-right text-lg font-bold text-ocean-900">{formatCurrency(account.contributionTotal)}</p>
              </div>
            </article>
          ))}
          {data.accounts.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No corporate accounts yet"
              description="Create the first corporate workspace so ESG managers can start recording portfolio allocations and verified contribution records."
            />
          ) : null}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Recent corporate contributions</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Simulated CSR/grant/sponsorship records. These are separate from individual donations.</p>
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
                <p className="font-bold text-ocean-900">{formatCurrency(contribution.amountValue)}</p>
                <p className="mt-1 text-xs font-bold uppercase text-ocean-900/48">{contribution.publicGoalLabel}</p>
              </div>
            </article>
          ))}
          {data.contributions.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No corporate contributions yet"
              description="Corporate users will create contribution records from the Corporate Projects page."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
