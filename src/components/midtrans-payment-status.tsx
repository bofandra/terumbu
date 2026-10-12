"use client";

import { useEffect, useState } from "react";

type PaymentStage = "pending" | "confirmed" | "not_completed" | "operator_review" | "refund_requested" | "refunded";
type PaymentStatus = {
  type: "donation" | "expedition";
  stage: PaymentStage;
  message: string;
  final: boolean;
  asOf: string;
};

const names: Record<PaymentStage, string> = {
  pending: "Awaiting payment verification",
  confirmed: "Payment confirmed",
  not_completed: "Payment not completed",
  operator_review: "Under review",
  refund_requested: "Refund is being processed",
  refunded: "Provider reports a refund"
};

export function MidtransPaymentStatus({
  type, checkoutId
}: { type: "donation" | "expedition"; checkoutId: string }) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;

    const refresh = async () => {
      controller = new AbortController();
      let shouldPoll = true;
      try {
        const params = new URLSearchParams({ type, id: checkoutId });
        const response = await fetch("/api/checkout/midtrans-status?" + params, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) {
          if (!cancelled) {
            setError(response.status === 404
              ? "We could not verify access to this checkout. Please use your original browser or sign in to the account that made the payment."
              : "Status verification is temporarily unavailable. Please try again.");
          }
        } else {
          const value = await response.json() as PaymentStatus;
          shouldPoll = !value.final;
          if (!cancelled) {
            setPayment(value);
            setError(null);
          }
        }
      } catch {
        if (!cancelled) setError("Cannot reach the status service at the moment.");
      } finally {
        if (!cancelled && shouldPoll) handle = setTimeout(refresh, 15000);
      }
    };

    void refresh();
    return () => {
      cancelled = true;
      controller?.abort();
      if (handle) clearTimeout(handle);
    };
  }, [checkoutId, type]);

  const final = payment?.final ?? false;
  return (
    <div className="mt-6 rounded-xl border border-ocean-900/15 bg-ocean-50 p-5 text-left"
      aria-live="polite" data-testid="midtrans-customer-status">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/60">Current payment status</p>
      <h2 className="mt-2 text-lg font-bold text-ocean-900">
        {payment ? names[payment.stage] : "Checking Terumbu payment records…"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ocean-900/70">
        {payment?.message ?? "Only verified payment records can confirm your checkout."}
      </p>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-coral-700">{error}</p> : null}
      {payment ? (
        <p className="mt-3 text-xs text-ocean-900/55">
          Last read: {new Date(payment.asOf).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
          {!final ? " · Updates automatically every 15 seconds while pending." : ""}
        </p>
      ) : null}
    </div>
  );
}
