"use client";

import { CalendarPlus, Download } from "lucide-react";

type ExpeditionCalendarActionsProps = {
  title: string;
  startsAt: string | Date;
  endsAt: string | Date;
  location?: string | null;
  description?: string | null;
};

function calendarStamp(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function ExpeditionCalendarActions({ title, startsAt, endsAt, location, description }: ExpeditionCalendarActionsProps) {
  const start = calendarStamp(startsAt);
  const end = calendarStamp(endsAt);
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", title);
  google.searchParams.set("dates", `${start}/${end}`);
  if (location) google.searchParams.set("location", location);
  if (description) google.searchParams.set("details", description);

  function downloadIcs() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Terumbu.eco//Expedition//EN",
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@terumbu.eco`,
      `DTSTAMP:${calendarStamp(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(title)}`,
      location ? `LOCATION:${escapeIcs(location)}` : "",
      description ? `DESCRIPTION:${escapeIcs(description)}` : "",
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "terumbu-expedition.ics";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <span className="inline-flex flex-wrap gap-2">
      <a href={google.toString()} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-kelp-500">
        <CalendarPlus size={14} aria-hidden="true" /> Google Calendar
      </a>
      <button type="button" onClick={downloadIcs} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-kelp-500">
        <Download size={14} aria-hidden="true" /> .ics
      </button>
    </span>
  );
}
