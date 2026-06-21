import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Corporate Employees"
};

export const dynamic = "force-dynamic";

export default async function CorporateEmployeesPage() {
  const user = await requireUser("/corporate/employees");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">Corporate program not configured.</main>;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Employee engagement</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.metrics.employeesEngaged} active employees</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {data.employees.map((employee) => (
          <article key={employee.email} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">{employee.name}</h2>
            <p className="mt-1 text-sm text-ocean-900/58">{employee.email}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-ocean-50 px-3 py-1 text-ocean-900">{employee.department ?? "Department pending"}</span>
              <span className="rounded-full bg-sand-50 px-3 py-1 text-ocean-900">{employee.role}</span>
              <span className="rounded-full bg-kelp-100 px-3 py-1 text-kelp-700">{employee.status}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
