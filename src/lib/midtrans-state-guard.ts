import type { ManagedPaymentStatus } from "@/lib/payment-workflows";

/**
 * Status observations can reach us in a different order from the provider's
 * actual payment transitions. Only a verified full refund/chargeback may
 * reverse a captured or settled payment.
 *
 * A failed/expired checkout can still later be recovered by a verified
 * settlement; it must not be reopened merely by a late "pending" response.
 * This guard is shared by donation and expedition settlement.
 */
export function canApplyVerifiedMidtransState(
  previous: ManagedPaymentStatus,
  next: ManagedPaymentStatus
): boolean {
  if (previous === next) return true;

  if (previous === "refunded") return false;

  if (previous === "paid") {
    return next === "refunded";
  }

  if (previous === "failed" || previous === "expired") {
    return next === "paid" || next === "refunded";
  }

  // Created/pending may move to a subsequent, independently verified state.
  return true;
}
