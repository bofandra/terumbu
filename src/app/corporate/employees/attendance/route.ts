import { db } from "@/db/client";
import { adminAuditLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");

  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export async function GET() {
  const user = await requireUser("/corporate/employees");
  const data = await requireCorporateDashboardData(user.id, "/corporate/employees");
  const rows = data.employeePrograms.registrations.map((registration) => [
    registration.eventTitle,
    registration.eventStartsAt,
    registration.eventEndsAt,
    registration.eventLocation,
    registration.employeeName,
    registration.employeeEmail,
    registration.employeeDepartment,
    registration.status,
    registration.checkedInAt,
    registration.attendanceHoursValue,
    registration.notes
  ]);
  const header = [
    "event_title",
    "starts_at",
    "ends_at",
    "location",
    "employee_name",
    "employee_email",
    "department",
    "registration_status",
    "checked_in_at",
    "attendance_hours",
    "notes"
  ];
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "corporate.employee_event.attendance_exported",
    entityType: "corporate_employee_events",
    entityId: data.program.programId,
    metadata: {
      source: "corporate_portal",
      accountId: data.program.accountId,
      programId: data.program.programId,
      registrationCount: rows.length
    }
  });

  return new Response(`${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"terumbu-corporate-attendance.csv\""
    }
  });
}
