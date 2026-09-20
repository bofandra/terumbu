import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export default async function CorporateEmployeesPage({ searchParams }: CorporateEmployeesPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/employees");
  const data = await requireCorporateDashboardData(user.id, "/corporate/employees");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Employees</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Employees</h1>
        <p className="mt-2 text-sm text-ocean-900/62">Invite employees who may join company activities.</p>
      </header>

      {params?.saved ? <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Employee invite saved.</p> : null}
      {params?.error ? <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Employee invite could not be saved.</p> : null}

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-ocean-700" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Invite employee</h2>
        </div>
        <form action={inviteCorporateEmployeeAction} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Name
            <input name="name" className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Email
            <input name="email" type="email" className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
          </label>
          <Button type="submit" tone="secondary">Invite</Button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Employee list</h2>
        <div className="mt-4 divide-y divide-ocean-900/10">
          {data.employees.map((employee) => (
            <div key={`${employee.email}-${employee.id}`} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="font-bold text-ocean-900">{employee.name}</p>
              <p className="text-sm text-ocean-900/58">{employee.email}</p>
            </div>
          ))}
          {data.employees.length === 0 ? <p className="py-4 text-sm font-semibold text-ocean-900/58">No employees yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
