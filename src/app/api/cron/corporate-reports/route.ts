import { NextRequest, NextResponse } from "next/server";

import { processDueCorporateReports } from "@/lib/corporate-report-automation";
import { processCorporateReportAlertEmails } from "@/lib/corporate-report-alert-email";
import { pruneResendCorporateDeliveryEvents, reconcilePendingResendCorporateDeliveryEvents } from "@/lib/resend-corporate-webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }

  const provided = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  if (provided !== `Bearer ${secret}` && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueCorporateReports();
    const emails = await processCorporateReportAlertEmails();
    const deliveryEvents = await reconcilePendingResendCorporateDeliveryEvents();
    const removedEvents = await pruneResendCorporateDeliveryEvents();
    return NextResponse.json({ ok: true, ...result, emails, deliveryEvents, removedEvents },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Corporate report scheduler failed", error);
    return NextResponse.json({ error: "Corporate report scheduler unavailable." }, { status: 500 });
  }
}
