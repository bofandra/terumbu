import { NextRequest, NextResponse } from "next/server";

import { readBoundedRequestBody, RequestBodyTooLargeError } from "@/lib/read-bounded-request-body";
import {
  parseResendCorporateDeliveryEvent,
  recordResendCorporateDelivery,
  verifyResendCorporateWebhook
} from "@/lib/resend-corporate-webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    // Apply the limit while reading: Content-Length can be absent or misleading.
    rawBody = await readBoundedRequestBody(request.body, MAX_PAYLOAD_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Unable to read payload." }, { status: 400 });
  }
  if (!verifyResendCorporateWebhook(rawBody, request.headers, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = parseResendCorporateDeliveryEvent(rawBody);
  if (!event) {
    // Other Resend events and unsupported payloads must not alter the outbox.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await recordResendCorporateDelivery(request.headers.get("svix-id")!, event);
    // Verified events are persisted even when provider acceptance is still in flight.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resend corporate webhook processing failed", { type: event.type, error });
    return NextResponse.json({ error: "Unable to process webhook." }, { status: 503 });
  }
}
