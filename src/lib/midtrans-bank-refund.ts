import { midtransIdrAmount, type MidtransStatusPayload } from "@/lib/midtrans";

/**
 * Midtrans GET Status reports bank_confirmed_at on individual refunds.
 * This confirms the acquiring bank has acknowledged the refund request,
 * NOT that the customer sees a credit in their bank/wallet.
 *
 * Never parse a webhook or browser redirect as bank evidence. Caller must
 * obtain this payload from authenticated Midtrans GET Transaction Status.
 */
export function midtransBankConfirmedRefund(input: {
  status: MidtransStatusPayload;
  orderId: string;
  refundKey: string;
  fullAmount: number;
}): Date | null {
  const { status, orderId, refundKey, fullAmount } = input;
  if (status.order_id !== orderId || status.transaction_status !== "refund" ||
      midtransIdrAmount(status.gross_amount) !== fullAmount ||
      !Number.isSafeInteger(fullAmount) || fullAmount <= 0 ||
      (status.currency !== undefined && status.currency !== "IDR") ||
      !Array.isArray(status.refunds) || status.refunds.length > 50) return null;

  const matching = status.refunds.filter(row => row && typeof row === "object" && !Array.isArray(row) &&
    row.refund_key === refundKey && midtransIdrAmount(row.refund_amount) === fullAmount);
  if (matching.length !== 1) return null;

  const raw = matching[0].bank_confirmed_at;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return null;

  // Midtrans transaction/refund timestamps are in WIB (GMT+7).
  const confirmedAt = new Date(raw.replace(" ", "T") + "+07:00");
  if (!Number.isFinite(confirmedAt.getTime()) ||
      confirmedAt.getTime() < Date.UTC(2000, 0, 1) ||
      confirmedAt.getTime() > Date.now() + 5 * 60_000) return null;

  // Reject date auto-normalization (e.g., 2026-02-31 -> March).
  const inJakarta = new Date(confirmedAt.getTime() + 7 * 60 * 60_000)
    .toISOString().slice(0, 19).replace("T", " ");
  return inJakarta === raw ? confirmedAt : null;
}
