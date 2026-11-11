import type { ExpeditionInterestRequestType } from "@/lib/expedition-booking-lifecycle";

/** Reject malformed/group-size input rather than silently changing the requested party. */
export function validInquiryParticipantCount(value: unknown): number | null {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  if (!/^(?:[1-9]|1[0-2])$/.test(text)) return null;
  return Number(text);
}

/** An interest request is not a seat reservation. Past/cancelled/private dates must not accept waitlist signups. */
export function departureAllowsInterest(
  departure: { status: string; startsAt: Date; endsAt: Date },
  type: ExpeditionInterestRequestType,
  now = new Date()
): boolean {
  if (type === "question") return true;
  if (type !== "waitlist") return false;
  return departure.startsAt instanceof Date && departure.endsAt instanceof Date &&
    !Number.isNaN(departure.startsAt.getTime()) && !Number.isNaN(departure.endsAt.getTime()) &&
    departure.startsAt > now && departure.endsAt > departure.startsAt &&
    ["open", "full", "waitlist"].includes(departure.status);
}

export function validFutureInquiryDate(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value &&
    parsed.getTime() > now.getTime();
}
