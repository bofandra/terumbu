import { KeyRound, LockKeyhole, Puzzle, ShieldCheck, Users } from "lucide-react";

import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { updateCorporateIntegrationAction, updateCorporateSecuritySettingsAction } from "@/lib/corporate-actions";
import { configuredIntegrationCount } from "@/lib/corporate-governance";
import { getCorporateDashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Corporate Settings"
};

export const dynamic = "force-dynamic";

const inputClassName =
  "rounded-xl border border-ocean-900/10 bg-white px-3 py-2 text-sm font-semibold text-ocean-900 outline-none transition focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20";
const selectClassName = `${inputClassName} appearance-none`;

const savedMessages: Record<string, string> = {
  integration: "Integration configuration saved from corporate settings.",
  security: "Security governance settings saved."
};

const errorMessages: Record<string, string> = {
  permission: "Your corporate role cannot change workspace governance settings.",
  integration: "Complete provider, owner, status, and next action before saving an integration.",
  security: "Add at least one allowed email domain when domain restrictions are enabled."
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");

  if (["allowed", "active", "published", "approved", "generated", "export_ready", "manual_upload_active", "configured", "connected", "recorded"].includes(normalized)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["suspended", "review", "ready_to_configure", "error", "disabled", "not_configured"].includes(normalized)) {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

type CorporateSettingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function CorporateSettingsPage({ searchParams }: CorporateSettingsPageProps) {
  const user = await requireUser("/corporate/settings");
  const data = await getCorporateDashboardData(user.id);
  const params = await searchParams;

  if (!data) {
    return <CorporateEmptyState />;
  }

  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;
  const canManageSettings = ["program.manage", "esg_manager"].includes(data.governance.accessSummary.currentPermission);
  const retentionPolicyDays = data.governance.securitySettings.retentionPolicyDays ?? "";
  const allowedEmailDomains = data.governance.securitySettings.allowedEmailDomains.join("\n");

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.accountName} governance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Manage role expectations, access controls, integration readiness, audit visibility, and enterprise security settings for the corporate workspace.
        </p>
      </div>

      {savedMessage ? <p className="mt-6 rounded-xl border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="mt-6 rounded-xl border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Current role", value: data.governance.accessSummary.currentRole, icon: ShieldCheck },
          { label: "Active employees", value: data.governance.accessSummary.activeEmployees.toLocaleString("id-ID"), icon: Users },
          { label: "Invited employees", value: data.governance.accessSummary.invitedEmployees.toLocaleString("id-ID"), icon: KeyRound },
          { label: "Configured integrations", value: configuredIntegrationCount(data.governance.integrations).toLocaleString("id-ID"), icon: Puzzle }
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon size={22} aria-hidden="true" className="text-coral-500" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <p className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Team and access management</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Role-specific capabilities</h2>
          <div className="mt-5 grid gap-3">
            {data.governance.roleCapabilities.map((role) => (
              <div key={role.permission} className={cn("rounded-xl border p-4", role.active ? "border-coral-500 bg-coral-100/30" : "border-ocean-900/10 bg-sand-50")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{role.role}</p>
                    <p className="mt-1 text-sm leading-6 text-ocean-900/62">{role.access}</p>
                  </div>
                  {role.active ? <span className="rounded-full bg-coral-500 px-3 py-1 text-xs font-bold text-white">Current role</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {role.allowedActions.map((action) => (
                    <span key={`${role.permission}-${action}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Security controls</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Governance checklist</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/58">
            These values now come from corporate workspace security settings, not from static placeholder copy.
          </p>
          <div className="mt-5 grid gap-3">
            {data.governance.securityChecklist.map((item) => (
              <div key={item.key} className="rounded-xl bg-sand-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-bold text-ocean-900">
                    <LockKeyhole size={16} aria-hidden="true" />
                    {item.label}
                  </span>
                  <span className={cn("rounded-full px-2 py-1 text-xs font-bold", statusClass(item.status))}>{formatStatus(item.status)}</span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-ocean-900/56">{item.description}</p>
              </div>
            ))}
          </div>

          <form action={updateCorporateSecuritySettingsAction} className="mt-5 rounded-xl border border-ocean-900/10 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-ocean-900">Update security settings</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">Persist real governance configuration for this corporate account.</p>
              </div>
              {!canManageSettings ? <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">Read only</span> : null}
            </div>
            <div className="mt-4 grid gap-3 text-sm font-bold text-ocean-900">
              <label className="flex items-center gap-2">
                <input name="mfaRequired" type="checkbox" defaultChecked={data.governance.securitySettings.mfaRequired} disabled={!canManageSettings} />
                MFA enforcement expected
              </label>
              <label className="flex items-center gap-2">
                <input name="exportLoggingEnabled" type="checkbox" defaultChecked={data.governance.securitySettings.exportLoggingEnabled} disabled={!canManageSettings} />
                Export logging enabled
              </label>
              <label className="flex items-center gap-2">
                <input name="sessionHistoryEnabled" type="checkbox" defaultChecked={data.governance.securitySettings.sessionHistoryEnabled} disabled={!canManageSettings} />
                Session history enabled
              </label>
              <label className="grid gap-2">
                Retention policy days
                <input name="retentionPolicyDays" type="number" min="1" max="3650" defaultValue={retentionPolicyDays} className={inputClassName} disabled={!canManageSettings} placeholder="365" />
              </label>
              <label className="flex items-center gap-2">
                <input name="domainRestrictionEnabled" type="checkbox" defaultChecked={data.governance.securitySettings.domainRestrictionEnabled} disabled={!canManageSettings} />
                Restrict invites to allowed domains
              </label>
              <label className="grid gap-2">
                Allowed email domains
                <textarea name="allowedEmailDomains" defaultValue={allowedEmailDomains} className={`${inputClassName} min-h-20`} disabled={!canManageSettings} placeholder="company.co.id&#10;subsidiary.co.id" />
              </label>
            </div>
            <Button type="submit" className="mt-4" disabled={!canManageSettings}>Save Security Settings</Button>
          </form>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" id="integrations">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Integrations</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Enterprise connection status</h2>
          <div className="mt-5 grid gap-3">
            {data.governance.integrations.map((integration) => (
              <div key={integration.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{integration.name}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/54">{formatStatus(integration.category)} · Owner: {integration.owner}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/44">Last sync: {formatDate(integration.lastSyncAt)}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(integration.status))}>{formatStatus(integration.status)}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-ocean-900/62">{integration.nextAction}</p>
              </div>
            ))}
            {data.governance.integrations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/20 bg-sand-50 p-4 text-sm font-semibold leading-6 text-ocean-900/58">
                No integration rows have been configured yet. Add the first SSO, HR, finance, ESG export, webhook, or storage configuration below.
              </div>
            ) : null}
          </div>

          <form action={updateCorporateIntegrationAction} className="mt-5 rounded-xl border border-ocean-900/10 bg-white p-4">
            <h3 className="font-bold text-ocean-900">Add or update integration</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">Rows saved here drive the integration count and status cards.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Type
                <select name="integrationType" className={selectClassName} disabled={!canManageSettings} defaultValue="sso">
                  <option value="sso">Single sign-on</option>
                  <option value="hr_system">HR system</option>
                  <option value="finance_ledger">Finance ledger</option>
                  <option value="esg_reporting">ESG reporting</option>
                  <option value="webhook">Webhook</option>
                  <option value="storage">Storage</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Status
                <select name="status" className={selectClassName} disabled={!canManageSettings} defaultValue="configured">
                  <option value="not_configured">Not configured</option>
                  <option value="configured">Configured</option>
                  <option value="connected">Connected</option>
                  <option value="error">Error</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Provider name
                <input name="providerName" className={inputClassName} disabled={!canManageSettings} placeholder="Google Workspace SSO" required />
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Owner
                <input name="owner" className={inputClassName} disabled={!canManageSettings} placeholder="IT admin" required />
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900 sm:col-span-2">
                Next action
                <input name="nextAction" className={inputClassName} disabled={!canManageSettings} placeholder="Upload SAML metadata" required />
              </label>
              <label className="grid gap-2 text-sm font-bold text-ocean-900 sm:col-span-2">
                Last sync date
                <input name="lastSyncAt" type="date" className={inputClassName} disabled={!canManageSettings} />
              </label>
            </div>
            <Button type="submit" className="mt-4" disabled={!canManageSettings}>Save Integration</Button>
          </form>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Audit log</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Recent access and workflow events</h2>
          <div className="mt-5 grid gap-3">
            {data.governance.auditLog.map((event) => (
              <div key={`${event.event}-${event.actor}-${event.occurredAt.toISOString()}`} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold capitalize text-ocean-900">{event.event}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/54">{event.actor} · {formatDate(event.occurredAt)}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(event.status))}>{formatStatus(event.status)}</span>
                </div>
              </div>
            ))}
            {data.governance.auditLog.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/20 bg-sand-50 p-4 text-sm font-semibold leading-6 text-ocean-900/58">
                No corporate audit events have been recorded for this workspace yet. Updating security, integrations, employees, funding, evidence, or reports will create real audit entries.
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
