import { KeyRound, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { inviteCorporateEmployeeAction } from "@/lib/corporate-actions";

export const metadata = {
  title: "Corporate Employees"
};

export const dynamic = "force-dynamic";

type CorporateEmployeesPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function statusClass(status: string) {
  if (status === "active") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "suspended") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900";
}

function savedMessage(value: string | undefined) {
  return value === "employee" ? "Employee invite saved." : value ? "Employee list updated." : null;
}

export default async function CorporateEmployeesPage({ searchParams }: CorporateEmployeesPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/employees");
  const data = await requireCorporateDashboardData(user.id, "/corporate/employees");
  const activeEmployees = data.employees.filter((employee) => employee.status === "active").length;
  const invitedEmployees = data.employees.filter((employee) => employee.status === "invited").length;
  const successMessage = savedMessage(params?.saved);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Employees</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Employee access</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">Invite employees who may join company-supported programs.</p>
        </div>
      </header>

      {successMessage ? <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{successMessage}</p> : null}
      {params?.error ? <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Employee invite could not be saved.</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { label: "Employees", value: data.employees.length.toLocaleString("id-ID"), icon: Users },
          { label: "Active", value: activeEmployees.toLocaleString("id-ID"), icon: KeyRound },
          { label: "Invited", value: invitedEmployees.toLocaleString("id-ID"), icon: UserPlus }
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

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Invite employee</h2>
        <form action={inviteCorporateEmployeeAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Name
            <input name="name" className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Email
            <input name="email" type="email" className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Department
            <input name="department" className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" />
          </label>
          <Button type="submit" tone="secondary" className="self-end">Invite</Button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Employee list</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.employees.map((employee) => (
            <article key={employee.email} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ocean-900">{employee.name}</h3>
                  <p className="mt-1 text-sm text-ocean-900/58">{employee.email}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/50">{employee.department ?? "No department"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(employee.status)}`}>{employee.status}</span>
              </div>
              {employee.invite ? (
                <div className="mt-4 rounded-lg border border-ocean-900/10 bg-white px-3 py-2 text-xs text-ocean-900/62">
                  <p className="font-bold text-ocean-900">Invite link</p>
                  <code className="mt-1 block break-all rounded-lg bg-ocean-50 px-2 py-1 font-semibold text-ocean-800">{employee.invite.acceptHref}</code>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {data.employees.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold leading-6 text-ocean-900/62">No employees invited yet.</p>
        ) : null}
      </section>
    </main>
  );
}
