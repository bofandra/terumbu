import { CalendarDays, Download, Gift, Trophy, Users } from "lucide-react";

import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Employees"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function statusClass(status: string) {
  if (["active", "Healthy", "Registration open"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "Needs promotion") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

export default async function CorporateEmployeesPage() {
  const user = await requireUser("/corporate/employees");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <CorporateEmptyState />;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Employee engagement</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Events, challenges, and donation matching</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Coordinate volunteer registrations, department challenges, attendance records, and employee donation matching for the corporate program.
          </p>
        </div>
        <ButtonLink href="/corporate/reports" tone="secondary">
          <Download size={18} aria-hidden="true" />
          Export Attendance
        </ButtonLink>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Active employees", value: data.metrics.employeesEngaged.toLocaleString("id-ID"), icon: Users },
          { label: "Volunteer hours", value: data.metrics.volunteerHours.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Departments in challenge", value: `${data.employeePrograms.challenge.activeDepartments}/${data.employeePrograms.challenge.targetDepartments}`, icon: Trophy },
          { label: "Matched donations", value: formatCurrency(data.employeePrograms.donationMatching.matched), icon: Gift }
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon size={22} aria-hidden="true" className="text-coral-500" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr_0.95fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Events and volunteering</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Upcoming employee programs</h2>
          <div className="mt-5 grid gap-3">
            {data.employeePrograms.upcomingEvents.map((event) => {
              const registrationRate = event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0;

              return (
                <div key={event.title} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ocean-900">{event.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ocean-900/54">{formatDate(event.date)} · {event.location}</p>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(event.status))}>{event.status}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-ocean-900/58">{event.registered}/{event.capacity} registered</span>
                    <span className="font-bold text-ocean-900">{registrationRate}%</span>
                  </div>
                  <ProgressMeter value={registrationRate} label={`${event.title} registration`} className="mt-2 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-white" />
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Employee challenge</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{data.employeePrograms.challenge.title}</h2>
          <p className="mt-4 text-4xl font-bold tracking-normal text-ocean-900">{data.employeePrograms.challenge.progress}%</p>
          <p className="mt-1 text-sm text-ocean-900/58">Progress toward department participation target</p>
          <ProgressMeter value={data.employeePrograms.challenge.progress} label="Employee challenge progress" className="mt-4 h-2" indicatorClassName="bg-ocean-700" trackClassName="bg-ocean-50" />
          <div className="mt-5 grid gap-2">
            {data.employeePrograms.challenge.leaderboard.map((department, index) => (
              <div key={department.department} className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-4 py-3 text-sm">
                <span className="font-bold text-ocean-900">#{index + 1} {department.department}</span>
                <span className="font-bold text-kelp-700">{department.participationRate}%</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Donation matching</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{data.employeePrograms.donationMatching.policy}</h2>
          <span className={cn("mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold", statusClass(data.employeePrograms.donationMatching.status))}>
            {data.employeePrograms.donationMatching.status}
          </span>
          <div className="mt-5 grid gap-3">
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-sm font-bold text-ocean-900">Pool {formatCurrency(data.employeePrograms.donationMatching.pool)}</p>
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-sm font-bold text-ocean-900">Matched {formatCurrency(data.employeePrograms.donationMatching.matched)}</p>
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-sm font-bold text-ocean-900">{data.employeePrograms.donationMatching.pending.toLocaleString("id-ID")} claims pending eligibility review</p>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Employee roster</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Participation and access status</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {data.employees.map((employee) => (
            <article key={employee.email} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
              <h3 className="font-bold text-ocean-900">{employee.name}</h3>
              <p className="mt-1 text-sm text-ocean-900/58">{employee.email}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-ocean-50 px-3 py-1 text-ocean-900">{employee.department ?? "Department pending"}</span>
                <span className="rounded-full bg-white px-3 py-1 text-ocean-900">{employee.role}</span>
                <span className={cn("rounded-full px-3 py-1", statusClass(employee.status))}>{employee.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
