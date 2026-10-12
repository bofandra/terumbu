import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  midtransRefundBankConfirmations,
  paymentOperations
} from "@/db/schema";

/**
 * Operator review windows, not promises to customers. Merchant and payment
 * channel policies must be verified separately before production launch.
 */
export const MIDTRANS_REFUND_FIRST_CONTACT_HOURS = 1;
export const MIDTRANS_REFUND_UNRESOLVED_HOURS = 24;
export const MIDTRANS_REFUND_BANK_ACK_HOURS = 72;

export type MidtransRefundSlaCounts = {
  incidents: number;
  awaitingResolution: number;
  missingBankEvidence: number;
  firstContactOverdue: number;
  resolutionOverdue: number;
  bankAcknowledgementOverdue: number;
};

export function midtransRefundSlaBreached(counts: MidtransRefundSlaCounts) {
  return counts.firstContactOverdue > 0 || counts.resolutionOverdue > 0 ||
    counts.bankAcknowledgementOverdue > 0;
}

/**
 * Aggregate from database without selecting PII, order IDs or provider payloads.
 * An admin follow-up event acknowledges operator handling, NEVER the provider
 * or banking state. Do not infer end-customer receipt from bank acknowledgement.
 */
export async function getMidtransRefundSlaCounts(now = new Date()): Promise<MidtransRefundSlaCounts> {
  const firstContactCutoff = new Date(now.getTime() -
    MIDTRANS_REFUND_FIRST_CONTACT_HOURS * 3600_000).toISOString();
  const unresolvedCutoff = new Date(now.getTime() -
    MIDTRANS_REFUND_UNRESOLVED_HOURS * 3600_000).toISOString();
  const bankCutoff = new Date(now.getTime() -
    MIDTRANS_REFUND_BANK_ACK_HOURS * 3600_000).toISOString();

  const [snapshot] = await db.select({
    incidents: sql<number>`count(*)::int`,
    awaitingResolution: sql<number>`count(*) filter (
      where ${paymentOperations.status} <> 'provider_refunded')::int`,
    missingBankEvidence: sql<number>`count(*) filter (
      where ${paymentOperations.status} = 'provider_refunded'
      and ${midtransRefundBankConfirmations.operationId} is null)::int`,
    firstContactOverdue: sql<number>`count(*) filter (
      where ${paymentOperations.status} <> 'provider_refunded'
      and ${paymentOperations.createdAt} <= ${firstContactCutoff}::timestamptz
      and not exists (
        select 1 from midtrans_compensation_case_events followup
        where followup.operation_id = ${paymentOperations.id}
      ))::int`,
    resolutionOverdue: sql<number>`count(*) filter (
      where ${paymentOperations.status} <> 'provider_refunded'
      and ${paymentOperations.createdAt} <= ${unresolvedCutoff}::timestamptz)::int`,
    bankAcknowledgementOverdue: sql<number>`count(*) filter (
      where ${paymentOperations.status} = 'provider_refunded'
      and ${midtransRefundBankConfirmations.operationId} is null
      and coalesce(${paymentOperations.processedAt}, ${paymentOperations.createdAt})
        <= ${bankCutoff}::timestamptz)::int`
  }).from(paymentOperations)
    .leftJoin(midtransRefundBankConfirmations,
      eq(midtransRefundBankConfirmations.operationId, paymentOperations.id))
    .where(and(
      eq(paymentOperations.operationType, "midtrans_capacity_conflict"),
      eq(paymentOperations.provider, "midtrans")
    ));

  return snapshot ?? {
    incidents: 0, awaitingResolution: 0, missingBankEvidence: 0,
    firstContactOverdue: 0, resolutionOverdue: 0, bankAcknowledgementOverdue: 0
  };
}
