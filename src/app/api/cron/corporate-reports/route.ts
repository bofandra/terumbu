import { NextRequest, NextResponse } from "next/server";

import { processDueCorporateReports } from "@/lib/corporate-report-automation";
import { processCorporateReportAlertEmails } from "@/lib/corporate-report-alert-email";
import { runCorporateCronStages } from "@/lib/corporate-cron-runner";
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

  const result = await runCorporateCronStages({
    reports: processDueCorporateReports,
    emails: processCorporateReportAlertEmails,
    deliveryEvents: reconcilePendingResendCorporateDeliveryEvents,
    prune: pruneResendCorporateDeliveryEvents
  }, (stage) => {
    // Only emit the stage name; underlying DB/provider errors may contain secrets.
    console.error("Corporate report cron stage failed", { stage });
  });

  if (!result.ok) {
    // HTTP 500 remains visible to monitoring, even when other stages complete.
    // Never return partial job results that could be mistaken for full success.
    return NextResponse.json({
      ok: false,
      error: "Corporate report scheduler partially unavailable.",
      stages: result.stages
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    ok: true,
    ...result.reports,
    emails: result.emails,
    deliveryEvents: result.deliveryEvents,
    removedEvents: result.removedEvents
  }, { headers: { "Cache-Control": "no-store" } });
}
