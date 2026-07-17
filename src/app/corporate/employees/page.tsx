import { CalendarDays, CheckCircle2, Download, Gift, Trophy, UserPlus, Users, XCircle } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import {
  cancelCorporateEmployeeEventRegistrationAction,
  checkInCorporateEmployeeEventAction,
  createCorporateEmployeeEventAction,
  inviteCorporateEmployeeAction,
  registerCorporateEmployeeEventAction
} from "@/lib/corporate-actions";
import { assignableCorporateEmployeeRoleOptions } from "@/lib/corporate-permissions";
import { cn, formatCurrency } from "@/lib/utils";

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

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Pending";
}

function statusClass(status: string) {
  if (["active", "Healthy", "registration open", "registration_open", "registered", "attended", "available"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["Needs promotion", "cancelled", "closed", "no_show"].includes(status)) {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

function savedMessage(value: string | undefined) {
  switch (value) {
    case "event":
      return "Employee event saved.";
    case "registration":
    case "registered":
      return "Employee registration saved.";
    case "waitlisted":
      return "Employee added to the waitlist.";
    case "attendance":
      return "Attendance check-in saved.";
    case "cancelled":
      return "Employee registration cancelled.";
    case "employee":
      return "Employee roster updated.";
    default:
      return value ? "Employee workspace updated." : null;
  }
}

export default async function CorporateEmployeesPage({ searchParams }: CorporateEmployeesPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/employees");
  const data = await requireCorporateDashboardData(user.id, "/corporate/employees");
  const roleOptions = assignableCorporateEmployeeRoleOptions(data.governance.accessSummary.currentPermission);
  const canManageEmployees = data.capabilities.canManageEmployees && roleOptions.length > 0;
  const registrableEmployees = data.employees.filter((employee) => employee.status !== "suspended");
  const successMessage = savedMessage(params?.saved);

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
        <ButtonLink href="/corporate/employees/attendance" tone="secondary">
          <Download size={18} aria-hidden="true" />
          Export Attendance
        </ButtonLink>
      </div>

      {successMessage ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{successMessage}</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Employee event, invite, or attendance could not be saved with the current input or permission.</p>
      ) : null}

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

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Team actions</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Invite or update an employee</h2>
        {canManageEmployees ? (
          <form action={inviteCorporateEmployeeAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_180px_170px_140px_auto]">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Name
              <input name="name" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Email
              <input name="email" type="email" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Department
              <input name="department" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Role
              <select name="role" defaultValue={roleOptions[0]?.value ?? "member"} className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Status
              <select name="status" defaultValue="invited" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                <option value="invited">Invited</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <Button type="submit" tone="secondary" className="self-end">
              Save Employee
            </Button>
          </form>
        ) : (
          <p className="mt-5 max-w-xl rounded-xl border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-sm font-semibold leading-6 text-ocean-900/68">
            Your corporate role can review participation and access status, but cannot invite employees or change employee roles.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Event setup</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Create an employee program</h2>
        {canManageEmployees ? (
          <form action={createCorporateEmployeeEventAction} className="mt-5 grid gap-3 lg:grid-cols-[1.3fr_150px_170px_170px_150px_120px]">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Title
              <input name="title" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Type
              <select name="eventType" defaultValue="volunteer" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                <option value="volunteer">Volunteer</option>
                <option value="training">Training</option>
                <option value="challenge">Challenge</option>
                <option value="fundraiser">Fundraiser</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Starts
              <input name="startsAt" type="datetime-local" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Ends
              <input name="endsAt" type="datetime-local" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Capacity
              <input name="capacity" type="number" min="1" defaultValue="40" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Status
              <select name="status" defaultValue="registration_open" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                <option value="draft">Draft</option>
                <option value="registration_open">Open</option>
                <option value="waitlist">Waitlist</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900 lg:col-span-2">
              Location
              <input name="location" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900 lg:col-span-3">
              Notes
              <input name="description" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" />
            </label>
            <label className="flex min-h-11 items-center gap-2 self-end rounded-xl border border-ocean-900/12 px-3 text-sm font-bold text-ocean-900">
              <input name="waitlistEnabled" type="checkbox" defaultChecked className="h-4 w-4 rounded border-ocean-900/20" />
              Waitlist
            </label>
            <Button type="submit" tone="secondary" className="self-end">
              <CalendarDays size={18} aria-hidden="true" />
              Create Event
            </Button>
          </form>
        ) : (
          <p className="mt-5 max-w-xl rounded-xl border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-sm font-semibold leading-6 text-ocean-900/68">
            Your corporate role can review event participation, but cannot create programs or change attendance.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr_0.95fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Events and volunteering</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Upcoming employee programs</h2>
          <div className="mt-5 grid gap-3">
            {data.employeePrograms.upcomingEvents.length > 0 ? data.employeePrograms.upcomingEvents.map((event) => {
              const registrationRate = event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0;
              const defaultHours = Math.max(0, (event.endsAt.getTime() - event.startsAt.getTime()) / 3_600_000).toFixed(1);

              return (
                <div key={event.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ocean-900">{event.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ocean-900/54">{formatDateTime(event.date)} · {event.location ?? "Location pending"} · {event.eventTypeLabel}</p>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(event.status))}>{event.statusLabel}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-ocean-900/58">{event.registered}/{event.capacity} registered · {event.waitlisted} waitlisted · {event.attended} attended</span>
                    <span className="font-bold text-ocean-900">{registrationRate}%</span>
                  </div>
                  <ProgressMeter value={registrationRate} label={`${event.title} registration`} className="mt-2 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-white" />
                  {canManageEmployees && registrableEmployees.length > 0 ? (
                    <form action={registerCorporateEmployeeEventAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input type="hidden" name="eventId" value={event.id} />
                      <select name="employeeId" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" required>
                        {registrableEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} · {employee.department ?? "No department"}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" tone="light" disabled={!event.canRegister} className="border border-ocean-900/10">
                        <UserPlus size={18} aria-hidden="true" />
                        {event.willWaitlist ? "Waitlist" : "Register"}
                      </Button>
                    </form>
                  ) : null}
                  {event.registrations.length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {event.registrations.slice(0, 5).map((registration) => (
                        <div key={registration.id} className="rounded-xl border border-ocean-900/10 bg-white px-3 py-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-ocean-900">{registration.employeeName}</p>
                              <p className="text-xs text-ocean-900/56">{registration.employeeDepartment ?? "Department pending"} · {registration.attendanceHoursValue.toLocaleString("id-ID")}h</p>
                            </div>
                            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusClass(registration.status))}>{registration.statusLabel}</span>
                          </div>
                          {canManageEmployees && registration.status !== "cancelled" ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <form action={checkInCorporateEmployeeEventAction} className="flex flex-wrap items-center gap-2">
                                <input type="hidden" name="registrationId" value={registration.id} />
                                <input name="attendanceHours" type="number" min="0" step="0.25" defaultValue={defaultHours} className="h-10 w-24 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" />
                                <Button type="submit" tone="secondary" className="min-h-10 px-4 py-2 text-xs">
                                  <CheckCircle2 size={16} aria-hidden="true" />
                                  Check In
                                </Button>
                              </form>
                              <form action={cancelCorporateEmployeeEventRegistrationAction}>
                                <input type="hidden" name="registrationId" value={registration.id} />
                                <Button type="submit" tone="ghost" className="min-h-10 px-4 py-2 text-xs">
                                  <XCircle size={16} aria-hidden="true" />
                                  Cancel
                                </Button>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }) : (
              <p className="rounded-xl border border-dashed border-ocean-900/16 bg-sand-50 px-4 py-5 text-sm font-semibold leading-6 text-ocean-900/62">
                No employee programs have been scheduled yet.
              </p>
            )}
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
                <span className="rounded-full bg-white px-3 py-1 text-ocean-900">{employee.attendance.attendedEvents} attended</span>
                <span className="rounded-full bg-white px-3 py-1 text-ocean-900">{employee.attendance.volunteerHours.toLocaleString("id-ID")}h</span>
              </div>
              {employee.attendance.latestCheckInAt ? (
                <p className="mt-3 text-xs font-semibold text-ocean-900/56">Latest check-in {formatDate(employee.attendance.latestCheckInAt)}</p>
              ) : null}
              {employee.invite ? (
                <div className="mt-4 rounded-xl border border-ocean-900/10 bg-white px-3 py-2 text-xs text-ocean-900/62">
                  <p className="font-bold text-ocean-900">Invite acceptance link</p>
                  <code className="mt-1 block break-all rounded-lg bg-ocean-50 px-2 py-1 font-semibold text-ocean-800">{employee.invite.acceptHref}</code>
                  <p className="mt-1">Expires {employee.invite.expiresAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
