import { NextRequest, NextResponse } from "next/server";

import { processMissingMidtransWebhooks } from "@/lib/midtrans-reconciliation";
import { runWithWorkerHeartbeat } from "@/lib/worker-heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cron-only endpoint. Never expose financial reconciliation to anonymous callers. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  if (request.headers.get("x-cron-secret") !== secret &&
      request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await runWithWorkerHeartbeat("midtrans_reconciliation", processMissingMidtransWebhooks);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Midtrans reconciliation cycle failed.");
    return NextResponse.json({ error: "Midtrans reconciliation unavailable." }, { status: 503 });
  }
}
