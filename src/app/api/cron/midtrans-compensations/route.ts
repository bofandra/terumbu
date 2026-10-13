import { NextRequest, NextResponse } from "next/server";

import { processDueMidtransCompensations } from "@/lib/midtrans-compensations";
import { runWithWorkerHeartbeat } from "@/lib/worker-heartbeat";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  const headerSecret = request.headers.get("x-cron-secret");
  const bearer = request.headers.get("authorization");
  if (headerSecret !== configuredSecret && bearer !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const results = await runWithWorkerHeartbeat("midtrans_compensations", processDueMidtransCompensations);
    return NextResponse.json({ ok: true, ...results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Midtrans compensation worker failed.");
    return NextResponse.json({ error: "Compensation reconciliation unavailable." }, { status: 503 });
  }
}
