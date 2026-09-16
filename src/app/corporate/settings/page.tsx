import { Building2, FileBadge, Users } from "lucide-react";

import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";

export const metadata = {
  title: "Corporate Settings"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Not set";
}

export default async function CorporateSettingsPage() {
  const user = await requireUser("/corporate/settings");
  const data = await requireCorporateDashboardData(user.id, "/corporate/settings");
  const activeEmployees = data.employees.filter((employee) => employee.status === "active").length;
  const invitedEmployees = data.employees.filter((employee) => employee.status === "invited").length;
  const latestReport = data.exports[0] ?? null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Corporate settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">Basic workspace, team access, and report preferences.</p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { label: "Workspace", value: data.program.accountName, icon: Building2 },
          { label: "Active employees", value: activeEmployees.toLocaleString("id-ID"), icon: Users },
          { label: "Reports", value: data.exports.length.toLocaleString("id-ID"), icon: FileBadge }
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon size={22} aria-hidden="true" className="text-ocean-700" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <MetricValue className="mt-2 text-ocean-900">{metric.value}</MetricValue>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Company profile</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-bold text-ocean-900/56">Company</dt>
              <dd className="mt-1 font-semibold text-ocean-900">{data.program.accountName}</dd>
            </div>
            <div>
              <dt className="font-bold text-ocean-900/56">Program</dt>
              <dd className="mt-1 font-semibold text-ocean-900">{data.program.programName}</dd>
            </div>
            <div>
              <dt className="font-bold text-ocean-900/56">Period</dt>
              <dd className="mt-1 font-semibold text-ocean-900">{formatDate(data.program.startsAt)} - {formatDate(data.program.endsAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Team access</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-bold text-ocean-900/56">Your access</dt>
              <dd className="mt-1 font-semibold text-ocean-900">Corporate User</dd>
            </div>
            <div>
              <dt className="font-bold text-ocean-900/56">Active employees</dt>
              <dd className="mt-1 font-semibold text-ocean-900">{activeEmployees.toLocaleString("id-ID")}</dd>
            </div>
            <div>
              <dt className="font-bold text-ocean-900/56">Invited employees</dt>
              <dd className="mt-1 font-semibold text-ocean-900">{invitedEmployees.toLocaleString("id-ID")}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Report preferences</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-bold text-ocean-900/56">Latest report</dt>
              <dd className="mt-1 font-semibold capitalize text-ocean-900">{latestReport ? latestReport.status.replaceAll("_", " ") : "No report yet"}</dd>
            </div>
            <div>
              <dt className="font-bold text-ocean-900/56">Public page</dt>
              <dd className="mt-1 font-semibold text-ocean-900">{latestReport?.publicSlug ? "Published" : "Not published"}</dd>
            </div>
            <div>
              <dt className="font-bold text-ocean-900/56">Export logging</dt>
              <dd className="mt-1 font-semibold text-ocean-900">{data.exports.length > 0 ? "Available" : "No exports yet"}</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}
