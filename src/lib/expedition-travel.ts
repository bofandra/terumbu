export class TravelError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export function travelAssert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new TravelError(code);
}

export function isTravelId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function participantNames(value: string, count: number) {
  const names = value.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  travelAssert(Number.isInteger(count) && count >= 1 && count <= 12 && names.length === count &&
    names.every(name => name.length >= 2 && name.length <= 160), "participants");
  return names;
}

export function bookingChangeQuote(amount: string | number, previousCount: number, nextCount: number, originalUnitPrice?: number) {
  travelAssert(Number.isInteger(nextCount) && nextCount >= 1 && nextCount <= 12 &&
    Number.isInteger(previousCount) && previousCount > 0 && Number.isFinite(Number(amount)) && Number(amount) >= 0, "participants");
  const unitPrice = originalUnitPrice !== undefined && Number.isFinite(originalUnitPrice) && originalUnitPrice >= 0
    ? originalUnitPrice : Number(amount) / previousCount;
  const total = Math.round(unitPrice * 100 * nextCount) / 100;
  return { total, difference: Math.round((total - Number(amount)) * 100) / 100 };
}

export function canPrepareBooking(booking: { status: string; paymentStatus: string }, startsAt: Date, now = new Date()) {
  return booking.status === "confirmed" && booking.paymentStatus === "paid" && startsAt > now;
}

export function objectMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
