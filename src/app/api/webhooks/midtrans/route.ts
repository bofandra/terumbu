import { NextResponse, type NextRequest } from "next/server";

import {
  fetchMidtransTransactionStatus,
  midtransConfiguration,
  midtransIdrAmount,
  verifyMidtransSignature,
  type MidtransStatusPayload
} from "@/lib/midtrans";
import { applyVerifiedMidtransStatus } from "@/lib/midtrans-settlement";
import { readBoundedRequestBody, RequestBodyTooLargeError } from "@/lib/read-bounded-request-body";

/**
 * Signed Midtrans notification is only a trigger: GET Status independently
 * establishes the current authoritative status and gross amount.
 * The scheduled reconciliation worker calls the same settlement function.
 */
export async function POST(request: NextRequest) {
  const config = midtransConfiguration();
  if (!config) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  let input: MidtransStatusPayload;
  try {
    const body = await readBoundedRequestBody(request.body, 16 * 1024);
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
    }
    input = parsed as MidtransStatusPayload;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof RequestBodyTooLargeError ? "Payload too large." : "Invalid notification."
    }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }
  if (!verifyMidtransSignature(input, config.serverKey)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  const orderId = input.order_id as string;
  const amount = midtransIdrAmount(input.gross_amount);
  if (amount === null) return NextResponse.json({ error: "Invalid amount." }, { status: 422 });

  let verified: MidtransStatusPayload;
  try {
    verified = await fetchMidtransTransactionStatus(config, orderId);
  } catch {
    console.error("Midtrans status confirmation unavailable.");
    return NextResponse.json({ error: "Status confirmation unavailable." }, { status: 503 });
  }
  if (verified.order_id !== orderId || midtransIdrAmount(verified.gross_amount) !== amount) {
    return NextResponse.json({ error: "Provider order mismatch." }, { status: 422 });
  }
  const result = await applyVerifiedMidtransStatus(orderId, verified);
  if (result.status === "unknown") {
    return NextResponse.json({ error: "Unknown Midtrans order." }, { status: 404 });
  }
  if (result.status === "mismatch") {
    return NextResponse.json({ error: "Stored order amount mismatch." }, { status: 422 });
  }
  if (result.status === "manual_review") {
    return NextResponse.json({ ok: true, manualReview: true, type: result.type });
  }
  return NextResponse.json({ ok: true, type: result.type, status: result.status });
}
