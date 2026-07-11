export const activeSubscriptionStatuses = ["active", "past_due"] as const;
export const paymentMethodStatuses = ["active", "archived", "expired"] as const;
export const subscriptionStatuses = ["incomplete", "active", "past_due", "cancelled"] as const;

export type PaymentMethodStatus = (typeof paymentMethodStatuses)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export function normalizePaymentMethodStatus(value: unknown, fallback: PaymentMethodStatus = "active"): PaymentMethodStatus {
  const status = String(value ?? "").trim().toLowerCase();

  return paymentMethodStatuses.includes(status as PaymentMethodStatus) ? (status as PaymentMethodStatus) : fallback;
}

export function normalizeSubscriptionStatus(value: unknown, fallback: SubscriptionStatus = "incomplete"): SubscriptionStatus {
  const status = String(value ?? "").trim().toLowerCase();

  return subscriptionStatuses.includes(status as SubscriptionStatus) ? (status as SubscriptionStatus) : fallback;
}

export function parseExpiryMonth(value: FormDataEntryValue | string | number | null | undefined) {
  const month = Number(String(value ?? "").replace(/[^0-9]/g, ""));

  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

export function parseExpiryYear(value: FormDataEntryValue | string | number | null | undefined, now = new Date()) {
  const year = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  const currentYear = now.getUTCFullYear();

  return Number.isInteger(year) && year >= currentYear && year <= currentYear + 20 ? year : null;
}

export function isPaymentMethodExpired(expMonth: number | null | undefined, expYear: number | null | undefined, now = new Date()) {
  if (!expMonth || !expYear) {
    return false;
  }

  const expiryBoundary = new Date(Date.UTC(expYear, expMonth, 1));
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return expiryBoundary <= currentMonth;
}

export function canUsePaymentMethodForSubscription(
  method: {
    status: string;
    expMonth?: number | null;
    expYear?: number | null;
  },
  now = new Date()
) {
  return normalizePaymentMethodStatus(method.status) === "active" && !isPaymentMethodExpired(method.expMonth, method.expYear, now);
}

export function canArchivePaymentMethod(
  method: {
    status: string;
    activeSubscriptionCount?: number;
  }
) {
  return normalizePaymentMethodStatus(method.status) === "active" && (method.activeSubscriptionCount ?? 0) === 0;
}

export function canCancelSubscription(status: unknown) {
  return activeSubscriptionStatuses.includes(normalizeSubscriptionStatus(status) as (typeof activeSubscriptionStatuses)[number]);
}
