export function parseDonationAmount(value: FormDataEntryValue | string | number | null | undefined) {
  const raw = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9]/g, ""));

  if (!Number.isFinite(raw)) {
    return 0;
  }

  return Math.max(0, Math.round(raw));
}

export function parseParticipantCount(value: FormDataEntryValue | string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9]/g, ""));

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(12, Math.round(parsed)));
}

export function calculateBookingTotal(basePrice: string | number, participantCount: number) {
  const price = typeof basePrice === "number" ? basePrice : Number(basePrice);

  if (!Number.isFinite(price)) {
    return 0;
  }

  return Math.max(0, Math.round(price * participantCount));
}

export function buildReceiptNumber(sequence: string | number, issuedAt = new Date()) {
  const year = issuedAt.getUTCFullYear();
  const suffix = String(sequence).replace(/[^0-9a-z]/gi, "").toUpperCase().slice(-8).padStart(4, "0");

  return `TRB-RCP-${year}-${suffix}`;
}

export function buildBookingCode(sequence: string | number, issuedAt = new Date()) {
  const year = issuedAt.getUTCFullYear();
  const suffix = String(sequence).replace(/[^0-9a-z]/gi, "").toUpperCase().slice(-8).padStart(4, "0");

  return `TRB-EXP-${year}-${suffix}`;
}

export function buildSponsoredEcosystemCode(sequence: string | number, issuedAt = new Date()) {
  const year = issuedAt.getUTCFullYear();
  const suffix = String(sequence).replace(/[^0-9a-z]/gi, "").toUpperCase().slice(-8).padStart(4, "0");

  return `TRB-CORAL-${year}-${suffix}`;
}

export function buildSubscriptionReference(sequence: string | number, issuedAt = new Date()) {
  const year = issuedAt.getUTCFullYear();
  const suffix = String(sequence).replace(/[^0-9a-z]/gi, "").toUpperCase().slice(-8).padStart(4, "0");

  return `TRB-SUB-${year}-${suffix}`;
}

export function buildPaymentMethodReference(sequence: string | number, issuedAt = new Date()) {
  const year = issuedAt.getUTCFullYear();
  const suffix = String(sequence).replace(/[^0-9a-z]/gi, "").toUpperCase().slice(-8).padStart(4, "0");

  return `TRB-PM-${year}-${suffix}`;
}

export function buildPaymentOperationCode(sequence: string | number, issuedAt = new Date()) {
  const year = issuedAt.getUTCFullYear();
  const suffix = String(sequence).replace(/[^0-9a-z]/gi, "").toUpperCase().slice(-8).padStart(4, "0");

  return `TRB-OPS-${year}-${suffix}`;
}

export function nextMonthlyBillingDate(value = new Date()) {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + 1);

  return next;
}

export function normalizeCardLast4(value: FormDataEntryValue | string | number | null | undefined) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");

  return digits.slice(-4).padStart(4, "0");
}

export function splitParticipantNames(value: FormDataEntryValue | string | null | undefined, fallbackName: string, count: number) {
  const names = String(value ?? "")
    .split(/\r?\n|,/)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, count);

  while (names.length < count) {
    names.push(names.length === 0 ? fallbackName : `${fallbackName} ${names.length + 1}`);
  }

  return names;
}
