import { NextResponse } from "next/server";

import { getMidtransRefundSlaCounts, midtransRefundSlaBreached } from "@/lib/midtrans-refund-sla";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const safeHeaders = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" };

/**
 * Public, intentionally opaque signal for independent GitHub monitoring.
 * No order IDs, amounts, case counts, personal data or precise ages.
 */
export async function GET() {
  try {
    const counts = await getMidtransRefundSlaCounts();
    const breached = midtransRefundSlaBreached(counts);
    return NextResponse.json({ status: breached ? "unhealthy" : "ok" }, {
      status: breached ? 503 : 200,
      headers: safeHeaders
    });
  } catch {
    return NextResponse.json({ status: "unavailable" }, {
      status: 503, headers: safeHeaders
    });
  }
}
