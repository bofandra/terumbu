import { KeyRound, LockKeyhole, Puzzle, ShieldCheck, Users } from "lucide-react";

import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Corporate Settings"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function statusClass(status: string) {
  if (["Allowed", "active", "published", "approved", "generated", "Export ready", "Manual upload active"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["suspended", "review", "Ready to configure"].includes(status)) {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

export default async function CorporateSettingsPage() {
  const user = await requireUser("/corporate/settings");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <CorporateEmptyState />;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.accountName} governance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Manage role expectations, access controls, integration readiness, audit visibility, and enterprise security settings for the corporate workspace.
        </p>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Current role", value: data.governance.accessSummary.currentRole, icon: ShieldCheck },
          { label: "Active employees", value: data.governance.accessSummary.activeEmployees.toLocaleString("id-ID"), icon: Users },
          { label: "Invited employees", value: data.governance.accessSummary.invitedEmployees.toLocaleString("id-ID"), icon: KeyRound },
          { label: "Integrations", value: data.governance.integrations.length.toLocaleString("id-ID"), icon: Puzzle }
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
          <div className="mt-5 grid gap-3">
            {[
              ["MFA enforcement", "Ready to configure"],
              ["Export logging", data.exports.length > 0 ? "Allowed" : "Waiting for first export"],
              ["Session history", "Ready to configure"],
              ["Retention policy", "Ready to configure"],
              ["Domain restrictions", "Ready to configure"]
            ].map(([label, status]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-ocean-900">
                  <LockKeyhole size={16} aria-hidden="true" />
                  {label}
                </span>
                <span className={cn("rounded-full px-2 py-1 text-xs font-bold", statusClass(status))}>{status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" id="integrations">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Integrations</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Enterprise connection status</h2>
          <div className="mt-5 grid gap-3">
            {data.governance.integrations.map((integration) => (
              <div key={integration.name} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{integration.name}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/54">{integration.category} · Owner: {integration.owner}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(integration.status))}>{integration.status}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-ocean-900/62">{integration.nextAction}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Audit log</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Recent access and workflow events</h2>
          <div className="mt-5 grid gap-3">
            {data.governance.auditLog.map((event) => (
              <div key={`${event.event}-${event.actor}-${event.status}`} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{event.event}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/54">{event.actor} · {formatDate(event.occurredAt)}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(event.status))}>{event.status}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
