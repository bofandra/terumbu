import { randomBytes } from "node:crypto";

import type { ManagedPaymentStatus } from "@/lib/payment-workflows";

export type DemoProviderStatus = "succeeded" | "failed" | "refunded";

export type DemoProviderResult = {
  provider: "demo_gateway";
  providerReference: string;
  status: ManagedPaymentStatus;
  rawStatus: DemoProviderStatus;
  idempotencyKey: string;
  processedAt: Date;
  metadata: Record<string, unknown>;
};

export function paymentStatusFromProviderStatus(status: unknown): ManagedPaymentStatus {
  if (status === "succeeded") {
    return "paid";
  }

  if (status === "refunded") {
    return "refunded";
  }

  return "failed";
}

function reference(prefix: string, now = new Date()) {
  return `${prefix}-${now.getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function demoGatewayChargeSubscription(input: {
  idempotencyKey: string;
  amount: number;
  currency: string;
  paymentMethod?: {
    status?: string | null;
    last4?: string | null;
  } | null;
  now?: Date;
}): DemoProviderResult {
  const now = input.now ?? new Date();
  const rawStatus: DemoProviderStatus =
    input.amount > 0 && input.paymentMethod?.status === "active" && input.paymentMethod.last4 !== "0000"
      ? "succeeded"
      : "failed";

  return {
    provider: "demo_gateway",
    providerReference: reference(rawStatus === "succeeded" ? "DEMO-SUBSCRIPTION" : "DEMO-SUBSCRIPTION-FAILED", now),
    status: paymentStatusFromProviderStatus(rawStatus),
    rawStatus,
    idempotencyKey: input.idempotencyKey,
    processedAt: now,
    metadata: {
      amount: input.amount,
      currency: input.currency,
      paymentMethodLast4: input.paymentMethod?.last4 ?? null
    }
  };
}

export function demoGatewaySettleRefund(input: {
  idempotencyKey: string;
  amount: number;
  currency: string;
  providerReference?: string | null;
  now?: Date;
}): DemoProviderResult {
  const now = input.now ?? new Date();

  return {
    provider: "demo_gateway",
    providerReference: input.providerReference || reference("DEMO-REFUND", now),
    status: "refunded",
    rawStatus: "refunded",
    idempotencyKey: input.idempotencyKey,
    processedAt: now,
    metadata: {
      amount: input.amount,
      currency: input.currency
    }
  };
}
